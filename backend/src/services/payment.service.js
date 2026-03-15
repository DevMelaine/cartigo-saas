const { randomUUID } = require("crypto");
const { PaymentProvider, PaymentStatus } = require("@prisma/client");
const prisma = global.prisma || require("../lib/prisma");
const paygateProvider = require("./paygate.provider");
const { ORDER_STATUS } = require("../utils/orderLifecycle");

function normalizeAmount(value) {
  return Number(Number(value).toFixed(2));
}

function amountsMatch(left, right) {
  return normalizeAmount(left) === normalizeAmount(right);
}

function buildPaymentOrderInclude() {
  return {
    order: {
      include: {
        items: true,
      },
    },
  };
}

class PaymentService {
  constructor({ prismaClient = prisma, providers = {} } = {}) {
    this.prisma = prismaClient;
    this.providers = {
      [PaymentProvider.PAYGATE]: paygateProvider,
      ...providers,
    };
  }

  getProvider(providerName) {
    const provider = this.providers[providerName];

    if (!provider) {
      const error = new Error(`Payment provider ${providerName} is not supported.`);
      error.statusCode = 500;
      throw error;
    }

    return provider;
  }

  buildTxReference(orderId, providerName) {
    return `${providerName}_${orderId}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }

  buildPaymentDescription(orderId) {
    return `Cartigo order ${orderId}`;
  }

  async getCustomerOrderOrThrow(orderId, customerId) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      select: {
        id: true,
        customerId: true,
        organizationId: true,
        total: true,
        status: true,
      },
    });

    if (!order) {
      const error = new Error("Order not found.");
      error.statusCode = 404;
      throw error;
    }

    return order;
  }

  async getLatestPaymentForOrder(orderId, provider) {
    return this.prisma.payment.findFirst({
      where: {
        orderId,
        provider,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createPayGatePayment({ orderId, customerId }) {
    const order = await this.getCustomerOrderOrThrow(orderId, customerId);

    if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
      const error = new Error("Only pending-payment orders can be paid.");
      error.statusCode = 409;
      throw error;
    }

    const providerName = PaymentProvider.PAYGATE;
    const provider = this.getProvider(providerName);
    const latestPayment = await this.getLatestPaymentForOrder(order.id, providerName);
    const amount = normalizeAmount(order.total);
    const description = this.buildPaymentDescription(order.id);

    if (latestPayment && latestPayment.status === PaymentStatus.SUCCESS) {
      const error = new Error("This order has already been paid.");
      error.statusCode = 409;
      throw error;
    }

    if (latestPayment && latestPayment.status === PaymentStatus.PENDING) {
      return {
        payment: latestPayment,
        paymentUrl: provider.generatePaymentUrl({
          amount,
          identifier: latestPayment.txReference,
          description,
        }),
      };
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: providerName,
        txReference: this.buildTxReference(order.id, providerName),
        amount,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      payment,
      paymentUrl: provider.generatePaymentUrl({
        amount,
        identifier: payment.txReference,
        description,
      }),
    };
  }

  async markPaymentAsFailed(paymentId, updates = {}) {
    await this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.FAILED,
        ...(updates.paymentReference ? { paymentReference: updates.paymentReference } : {}),
        ...(updates.method ? { method: updates.method } : {}),
      },
    });
  }

  async finalizeSuccessfulPayment({
    providerName,
    identifier,
    amount,
    paymentReference,
    method,
  }) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        txReference: identifier,
      },
      include: buildPaymentOrderInclude(),
    });

    if (!payment || payment.provider !== providerName) {
      const error = new Error("Payment not found.");
      error.statusCode = 404;
      throw error;
    }

    if (!amountsMatch(payment.amount, amount) || !amountsMatch(payment.order.total, amount)) {
      const error = new Error("Payment amount mismatch.");
      error.statusCode = 400;
      throw error;
    }

    if (
      payment.status === PaymentStatus.SUCCESS &&
      payment.paymentReference &&
      paymentReference &&
      payment.paymentReference !== paymentReference
    ) {
      const error = new Error("Conflicting payment reference detected.");
      error.statusCode = 409;
      throw error;
    }

    if (![ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PAID].includes(payment.order.status)) {
      const error = new Error("Order is no longer eligible for payment confirmation.");
      error.statusCode = 409;
      throw error;
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        alreadyProcessed: true,
        payment,
        order: payment.order,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: {
          id: payment.id,
        },
        include: buildPaymentOrderInclude(),
      });

      if (!currentPayment) {
        const error = new Error("Payment not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!amountsMatch(currentPayment.amount, amount) || !amountsMatch(currentPayment.order.total, amount)) {
        const error = new Error("Payment amount mismatch.");
        error.statusCode = 400;
        throw error;
      }

      if (currentPayment.status === PaymentStatus.SUCCESS) {
        return {
          alreadyProcessed: true,
          payment: currentPayment,
          order: currentPayment.order,
        };
      }

      const claimedPayment = await tx.payment.updateMany({
        where: {
          id: currentPayment.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.SUCCESS,
          paymentReference: paymentReference || currentPayment.paymentReference,
          method: method || currentPayment.method,
        },
      });

      if (claimedPayment.count === 0) {
        const refreshedPayment = await tx.payment.findUnique({
          where: {
            id: currentPayment.id,
          },
          include: buildPaymentOrderInclude(),
        });

        if (refreshedPayment && refreshedPayment.status === PaymentStatus.SUCCESS) {
          return {
            alreadyProcessed: true,
            payment: refreshedPayment,
            order: refreshedPayment.order,
          };
        }

        const error = new Error("Payment could not be processed safely.");
        error.statusCode = 409;
        throw error;
      }

      let updatedOrder = currentPayment.order;

      if (currentPayment.order.status !== ORDER_STATUS.PAID) {
        const claimedOrder = await tx.order.updateMany({
          where: {
            id: currentPayment.orderId,
            status: ORDER_STATUS.PENDING_PAYMENT,
          },
          data: {
            status: ORDER_STATUS.PAID,
            readyForDelivery: false,
          },
        });

        if (claimedOrder.count === 0) {
          const refreshedOrder = await tx.order.findUnique({
            where: {
              id: currentPayment.orderId,
            },
            include: {
              items: true,
            },
          });

          if (!refreshedOrder || refreshedOrder.status !== ORDER_STATUS.PAID) {
            const error = new Error("Order is no longer eligible for payment confirmation.");
            error.statusCode = 409;
            throw error;
          }

          updatedOrder = refreshedOrder;
        } else {
          await tx.orderAuditLog.create({
            data: {
              orderId: currentPayment.orderId,
              organizationId: currentPayment.order.organizationId,
              changedByRole: "SYSTEM",
              previousStatus: ORDER_STATUS.PENDING_PAYMENT,
              newStatus: ORDER_STATUS.PAID,
              action: "PAYMENT_CONFIRMED",
            },
          });

          updatedOrder = await tx.order.findUnique({
            where: {
              id: currentPayment.orderId,
            },
            include: {
              items: true,
            },
          });
        }
      }

      const cart = await tx.cart.findUnique({
        where: {
          customerId_organizationId: {
            customerId: currentPayment.order.customerId,
            organizationId: currentPayment.order.organizationId,
          },
        },
        include: {
          items: true,
        },
      });

      if (cart && cart.items.length > 0) {
        for (const item of currentPayment.order.items) {
          const updatedInventory = await tx.inventory.updateMany({
            where: {
              productId: item.productId,
              organizationId: currentPayment.order.organizationId,
              quantity: {
                gte: item.quantity,
              },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          if (updatedInventory.count === 0) {
            const error = new Error(`Insufficient inventory for product ${item.productId}.`);
            error.statusCode = 409;
            throw error;
          }
        }

        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
          },
        });
      }

      const finalizedPayment = await tx.payment.findUnique({
        where: {
          id: currentPayment.id,
        },
      });

      return {
        alreadyProcessed: false,
        payment: finalizedPayment,
        order: updatedOrder,
      };
    });
  }

  async processPayGateWebhook(payload) {
    return this.finalizeSuccessfulPayment({
      providerName: PaymentProvider.PAYGATE,
      identifier: payload.identifier,
      amount: payload.amount,
      paymentReference: payload.payment_reference || payload.tx_reference || null,
      method: payload.payment_method || null,
    });
  }

  async getPayGatePaymentStatus({ orderId, customerId }) {
    const order = await this.getCustomerOrderOrThrow(orderId, customerId);
    const providerName = PaymentProvider.PAYGATE;
    const provider = this.getProvider(providerName);

    const payment = await this.getLatestPaymentForOrder(order.id, providerName);

    if (!payment) {
      const error = new Error("Payment not found for this order.");
      error.statusCode = 404;
      throw error;
    }

    const remoteStatus = await provider.fetchStatus({ identifier: payment.txReference });
    const normalized = provider.normalizeStatus(remoteStatus);

    if (payment.status !== PaymentStatus.SUCCESS) {
      if (normalized.localStatus === PaymentStatus.SUCCESS) {
        await this.finalizeSuccessfulPayment({
          providerName,
          identifier: payment.txReference,
          amount: normalized.amount ?? payment.amount,
          paymentReference: normalized.paymentReference || payment.paymentReference,
          method: normalized.method || payment.method,
        });
      } else if (normalized.localStatus === PaymentStatus.FAILED) {
        await this.markPaymentAsFailed(payment.id, {
          paymentReference: normalized.paymentReference || payment.paymentReference,
          method: normalized.method || payment.method,
        });
      }
    }

    const refreshedPayment = await this.prisma.payment.findUnique({
      where: {
        id: payment.id,
      },
    });

    return {
      orderId: order.id,
      provider: refreshedPayment.provider,
      status: refreshedPayment.status,
      amount: normalizeAmount(refreshedPayment.amount),
      txReference: refreshedPayment.txReference,
      paymentReference: refreshedPayment.paymentReference,
      method: refreshedPayment.method,
      providerStatusCode: normalized.providerStatusCode,
    };
  }
}

const paymentService = new PaymentService();

module.exports = paymentService;
module.exports.PaymentService = PaymentService;
module.exports.normalizeAmount = normalizeAmount;
