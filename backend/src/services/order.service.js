const { PrismaClient } = require("@prisma/client");
const {
  ORDER_STATUS,
  isReadyForDelivery,
  isValidOrderStatusTransition,
} = require("../utils/orderLifecycle");

const prisma = global.prisma || new PrismaClient();

function buildCartLookup(customerId, organizationId) {
  if (organizationId) {
    return {
      where: {
        customerId_organizationId: {
          customerId,
          organizationId,
        },
      },
    };
  }

  return {
    where: {
      customerId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  };
}

function buildOrderInclude({ includeAuditLogs = false } = {}) {
  return {
    customer: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    items: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            inventory: {
              select: {
                quantity: true,
              },
            },
          },
        },
      },
    },
    ...(includeAuditLogs
      ? {
          auditLogs: {
            orderBy: {
              createdAt: "desc",
            },
          },
        }
      : {}),
  };
}

function normalizeOrder(order) {
  return {
    ...order,
    total: Number(order.total),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  };
}

function assertRoleCanChangeStatus(role, currentStatus, nextStatus) {
  if (role === "ADMIN") {
    return;
  }

  if (role === "MANAGER") {
    if (nextStatus === ORDER_STATUS.PAID) {
      const error = new Error("Managers cannot perform financial status confirmation.");
      error.statusCode = 403;
      throw error;
    }

    return;
  }

  if (role === "CASHIER") {
    if (currentStatus === ORDER_STATUS.PENDING_PAYMENT && nextStatus === ORDER_STATUS.PAID) {
      return;
    }

    const error = new Error("Cashiers can only confirm pending payments.");
    error.statusCode = 403;
    throw error;
  }

  if (role === "STAFF") {
    if (currentStatus === ORDER_STATUS.PROCESSING && nextStatus === ORDER_STATUS.READY_FOR_DELIVERY) {
      return;
    }

    const error = new Error("Staff can only mark processing orders as ready for delivery.");
    error.statusCode = 403;
    throw error;
  }

  const error = new Error("Forbidden");
  error.statusCode = 403;
  throw error;
}

class OrderService {
  /**
   * Creates an order from the current customer cart.
   * Inventory reservation behavior is intentionally preserved so the existing
   * checkout and payment flows keep their current semantics.
   */
  static async checkout({ customerId, organizationId }) {
    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        ...buildCartLookup(customerId, organizationId),
        include: {
          items: {
            include: {
              product: {
                include: {
                  inventory: true,
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error("cart empty");
      }

      let total = 0;

      for (const item of cart.items) {
        const inventory = item.product.inventory;

        if (!inventory) {
          throw new Error("inventory not found");
        }

        if (inventory.quantity < item.quantity) {
          throw new Error(`insufficient stock for product ${item.product.name}`);
        }

        total += Number(item.priceSnapshot) * item.quantity;
      }

      const order = await tx.order.create({
        data: {
          customerId,
          organizationId: cart.organizationId,
          total,
          status: ORDER_STATUS.PENDING_PAYMENT,
        },
      });

      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.priceSnapshot,
          },
        });

        await tx.inventory.update({
          where: {
            productId: item.productId,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return {
        ...order,
        total: Number(order.total),
      };
    });
  }

  /**
   * Returns customer-owned orders for the storefront experience.
   */
  static async getCustomerOrders({ customerId, organizationId }) {
    const orders = await prisma.order.findMany({
      where: {
        customerId,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return orders.map(normalizeOrder);
  }

  /**
   * Returns one customer-owned order.
   */
  static async getOrderById({ orderId, customerId, organizationId }) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error("order not found");
    }

    return normalizeOrder(order);
  }

  /**
   * Lists organization orders with pagination and optional status filtering.
   * The query stays fully organization-scoped to preserve tenant isolation.
   */
  static async listOrganizationOrders({ organizationId, filters = {} }) {
    const { page = 1, limit = 20, status } = filters;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(status ? { status } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          ...buildOrderInclude(),
          auditLogs: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders.map(normalizeOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates an order status after validating tenant ownership, RBAC, lifecycle rules,
   * and optimistic concurrency using the persisted status in the WHERE clause.
   */
  static async updateOrderStatus({ orderId, organizationId, userId, role, nextStatus }) {
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        organizationId,
      },
      include: buildOrderInclude(),
    });

    if (!existingOrder) {
      const error = new Error("Order not found.");
      error.statusCode = 404;
      throw error;
    }

    if (existingOrder.status === nextStatus) {
      const error = new Error("Order already has this status.");
      error.statusCode = 400;
      throw error;
    }

    if (!isValidOrderStatusTransition(existingOrder.status, nextStatus)) {
      const error = new Error(`Invalid status transition from ${existingOrder.status} to ${nextStatus}.`);
      error.statusCode = 400;
      throw error;
    }

    assertRoleCanChangeStatus(role, existingOrder.status, nextStatus);

    return prisma.$transaction(async (tx) => {
      const claimedUpdate = await tx.order.updateMany({
        where: {
          id: orderId,
          organizationId,
          status: existingOrder.status,
        },
        data: {
          status: nextStatus,
          readyForDelivery: isReadyForDelivery(nextStatus),
        },
      });

      if (claimedUpdate.count === 0) {
        const error = new Error("Order status changed before this request could be applied.");
        error.statusCode = 409;
        throw error;
      }

      await tx.orderAuditLog.create({
        data: {
          orderId,
          organizationId,
          changedByUserId: userId,
          changedByRole: role,
          previousStatus: existingOrder.status,
          newStatus: nextStatus,
        },
      });

      const updatedOrder = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: buildOrderInclude({ includeAuditLogs: true }),
      });

      return normalizeOrder(updatedOrder);
    });
  }
}

module.exports = OrderService;
