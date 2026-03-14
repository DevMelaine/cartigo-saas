const { PrismaClient, OrderStatus } = require("@prisma/client");

const prisma = global.prisma || new PrismaClient();

function buildCartLookup(customerId, organizationId) {
  if (organizationId) {
    return {
      where: {
        customerId_organizationId: {
          customerId,
          organizationId
        }
      }
    };
  }

  return {
    where: {
      customerId
    },
    orderBy: {
      updatedAt: "desc"
    }
  };
}

class OrderService {

  static async checkout({ customerId, organizationId }) {

    return prisma.$transaction(async (tx) => {

      const cart = await tx.cart.findFirst({
        ...buildCartLookup(customerId, organizationId),
        include: {
          items: {
            include: {
              product: {
                include: {
                  inventory: true
                }
              }
            }
          }
        }
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
          status: OrderStatus.PENDING
        }
      });

      for (const item of cart.items) {

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.priceSnapshot
          }
        });

        await tx.inventory.update({
          where: {
            productId: item.productId
          },
          data: {
            quantity: {
              decrement: item.quantity
            }
          }
        });

      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id
        }
      });

      return {
        ...order,
        total: Number(order.total)
      };

    });

  }

  static async getCustomerOrders({ customerId, organizationId }) {

    return prisma.order.findMany({
      where: {
        customerId,
        ...(organizationId ? { organizationId } : {})
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                imageUrl: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

  }

  static async getOrderById({ orderId, customerId, organizationId }) {

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
        ...(organizationId ? { organizationId } : {})
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new Error("order not found");
    }

    return order;
  }

}

module.exports = OrderService;

