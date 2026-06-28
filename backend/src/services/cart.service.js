const { PrismaClient } = require("@prisma/client");

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

class CartService {

  static async addToCart({ customerId, organizationId, productId, quantity }) {

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        ...(organizationId ? { organizationId } : {}),
        status: "ACTIVE"
      },
      include: {
        inventory: true
      }
    });

    if (!product) {
      throw new Error("product not found");
    }

    if (!product.inventory) {
      throw new Error("inventory not found");
    }

    if (quantity > product.inventory.quantity) {
      throw new Error("insufficient stock");
    }

    const resolvedOrganizationId = organizationId || product.organizationId;

    let cart = await prisma.cart.findUnique({
      where: {
        customerId_organizationId: {
          customerId,
          organizationId: resolvedOrganizationId
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          customerId,
          organizationId: resolvedOrganizationId
        }
      });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId
      }
    });

    if (existingItem) {

      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > product.inventory.quantity) {
        throw new Error("insufficient stock");
      }

      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    }

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
        priceSnapshot: product.price
      }
    });
  }

  static async getCart({ customerId, organizationId }) {

    const cart = await prisma.cart.findFirst({
      ...buildCartLookup(customerId, organizationId),
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    if (!cart) {
      return {
        items: [],
        total: 0
      };
    }

    let total = 0;

    const items = cart.items.map(item => {

      const subtotal = Number(item.priceSnapshot) * item.quantity;
      total += subtotal;

      return {
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        price: item.priceSnapshot,
        quantity: item.quantity,
        subtotal
      };
    });

    return {
      cartId: cart.id,
      items,
      total
    };
  }

  static async updateCartItem({ customerId, organizationId, itemId, quantity }) {

    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          customerId,
          ...(organizationId ? { organizationId } : {})
        }
      },
      include: {
        product: {
          include: {
            inventory: true
          }
        }
      }
    });

    if (!item) {
      throw new Error("cart item not found");
    }

    if (quantity > item.product.inventory.quantity) {
      throw new Error("insufficient stock");
    }

    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });
  }

  static async removeCartItem({ customerId, organizationId, itemId }) {

    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          customerId,
          ...(organizationId ? { organizationId } : {})
        }
      }
    });

    if (!item) {
      throw new Error("cart item not found");
    }

    return prisma.cartItem.delete({
      where: { id: itemId }
    });
  }

  static async clearCart({ customerId, organizationId }) {

    const carts = await prisma.cart.findMany({
      where: {
        customerId,
        ...(organizationId ? { organizationId } : {})
      },
      select: {
        id: true
      }
    });

    if (carts.length === 0) {
      return;
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: {
          in: carts.map(cart => cart.id)
        }
      }
    });
  }

}

module.exports = CartService;

