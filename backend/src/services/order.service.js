const { PrismaClient, Prisma } = require("@prisma/client");
const {
  ORDER_STATUS,
  isReadyForDelivery,
  isValidOrderStatusTransition,
} = require("../utils/orderLifecycle");
const { resolvePublicFileUrl } = require("../modules/storage/storage.service");
const notificationService = require("./notification.service");
const { NOTIFICATION_TYPES } = require("../utils/notificationEvents");

const prisma = global.prisma || new PrismaClient();
const SALES_TREND_STATUSES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.READY_FOR_DELIVERY,
  ORDER_STATUS.IN_DELIVERY,
  ORDER_STATUS.DELIVERED,
];
const SALES_TREND_STATUS_SQL = Prisma.join(
  SALES_TREND_STATUSES.map((status) => Prisma.sql`${status}::"OrderStatus"`)
);

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
      product: item.product
        ? {
            ...item.product,
            imageUrl: resolvePublicFileUrl(item.product.imageUrl),
          }
        : item.product,
    })),
  };
}

function safeResolveOrderImagePreviewUrl(path, context) {
  const previewUrl = resolvePublicFileUrl(path);

  if (!previewUrl && path) {
    console.warn(`ORDER_IMAGE_PREVIEW_FAILED context=${context}`);
  }

  return previewUrl;
}

async function enrichOrderForDashboard(order) {
  const normalizedOrder = normalizeOrder(order);

  const items = await Promise.all(
    normalizedOrder.items.map(async (item) => ({
      ...item,
      product: item.product
        ? {
            ...item.product,
            imagePreviewUrl: safeResolveOrderImagePreviewUrl(
              item.product.imageUrl,
              `order=${normalizedOrder.id} product=${item.product.id}`
            ),
          }
        : item.product,
    }))
  );

  return {
    ...normalizedOrder,
    items,
  };
}

function normalizeOptionalSearch(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function resolveDateStart(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function resolveDateEnd(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function buildOrganizationOrderWhere({ organizationId, filters = {} }) {
  const where = {
    organizationId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  const normalizedSearch = normalizeOptionalSearch(filters.search);
  if (normalizedSearch) {
    where.OR = [
      {
        id: {
          contains: normalizedSearch,
        },
      },
      {
        customer: {
          name: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
      },
      {
        customer: {
          email: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const dateFrom = resolveDateStart(filters.dateFrom);
  const dateTo = resolveDateEnd(filters.dateTo);
  if (dateFrom || dateTo) {
    where.createdAt = {};

    if (dateFrom) {
      where.createdAt.gte = dateFrom;
    }

    if (dateTo) {
      where.createdAt.lte = dateTo;
    }
  }

  if (filters.minTotal !== undefined || filters.maxTotal !== undefined) {
    where.total = {};

    if (filters.minTotal !== undefined) {
      where.total.gte = Number(filters.minTotal);
    }

    if (filters.maxTotal !== undefined) {
      where.total.lte = Number(filters.maxTotal);
    }
  }

  return where;
}

function buildLowStockEvent(product, previousQuantity, nextQuantity) {
  const threshold = product.lowStockThreshold ?? product.inventory?.minStock ?? 0;

  if (!threshold || previousQuantity <= threshold || nextQuantity > threshold) {
    return null;
  }

  return {
    organizationId: product.organizationId,
    productId: product.id,
    productName: product.name,
    quantity: nextQuantity,
    lowStockThreshold: threshold,
  };
}

function dedupeLowStockEvents(events) {
  const byProduct = new Map();

  for (const event of events) {
    byProduct.set(event.productId, event);
  }

  return Array.from(byProduct.values());
}

function formatUtcDateLabel(date) {
  return date.toISOString().slice(0, 10);
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
    const result = await prisma.$transaction(async (tx) => {
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
      const lowStockEvents = [];

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
        const previousQuantity = item.product.inventory.quantity;
        const nextQuantity = previousQuantity - item.quantity;
        const lowStockEvent = buildLowStockEvent(item.product, previousQuantity, nextQuantity);

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

        if (lowStockEvent) {
          lowStockEvents.push(lowStockEvent);
        }
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return {
        order: {
          ...order,
          total: Number(order.total),
        },
        lowStockEvents,
      };
    });

    for (const event of dedupeLowStockEvents(result.lowStockEvents)) {
      await notificationService.notifyEvent(NOTIFICATION_TYPES.LOW_STOCK, event);
    }

    return result.order;
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
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where = buildOrganizationOrderWhere({
      organizationId,
      filters,
    });

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
   * Returns a single organization-owned order for dashboard use.
   */
  static async getOrganizationOrderById({ orderId, organizationId }) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        organizationId,
      },
      include: buildOrderInclude({ includeAuditLogs: true }),
    });

    if (!order) {
      const error = new Error("Order not found.");
      error.statusCode = 404;
      throw error;
    }

    return enrichOrderForDashboard(order);
  }

  /**
   * Aggregates organization order overview metrics for dashboard cards.
   */
  static async getOrganizationOrderOverview({ organizationId }) {
    const [statusGroups, revenueAggregate] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where: {
          organizationId,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.order.aggregate({
        where: {
          organizationId,
          status: {
            in: SALES_TREND_STATUSES,
          },
        },
        _sum: {
          total: true,
        },
      }),
    ]);

    const countsByStatus = statusGroups.reduce((accumulator, entry) => {
      accumulator[entry.status] = entry._count._all;
      return accumulator;
    }, {});

    return {
      totalOrders: statusGroups.reduce(
        (sum, entry) => sum + entry._count._all,
        0
      ),
      totalRevenue: Number(revenueAggregate._sum.total || 0),
      pendingOrders: countsByStatus[ORDER_STATUS.PENDING_PAYMENT] || 0,
      inProgressOrders:
        (countsByStatus[ORDER_STATUS.PAID] || 0) +
        (countsByStatus[ORDER_STATUS.PROCESSING] || 0) +
        (countsByStatus[ORDER_STATUS.READY_FOR_DELIVERY] || 0) +
        (countsByStatus[ORDER_STATUS.IN_DELIVERY] || 0),
      deliveredOrders: countsByStatus[ORDER_STATUS.DELIVERED] || 0,
      cancelledOrders: countsByStatus[ORDER_STATUS.CANCELLED] || 0,
    };
  }

  /**
   * Aggregates organization sales for the last N days.
   * Keeps the payload compact and analytics-ready for dashboard consumption.
   */
  static async getOrganizationSalesTrend({ organizationId, days = 30 }) {
    const safeDays = Math.max(7, Math.min(days, 90));
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (safeDays - 1));

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          DATE(o."createdAt")::text AS "date",
          COUNT(*)::int AS "orders",
          COALESCE(SUM(o."total"), 0)::text AS "revenue"
        FROM "Order" o
        WHERE o."organizationId" = ${organizationId}
          AND o."status" IN (${SALES_TREND_STATUS_SQL})
          AND o."createdAt" >= ${startDate}
        GROUP BY DATE(o."createdAt")
        ORDER BY DATE(o."createdAt") ASC
      `
    );

    const metricsByDate = new Map(
      rows.map((row) => [
        row.date,
        {
          orders: Number(row.orders) || 0,
          revenue: Number(row.revenue) || 0,
        },
      ])
    );

    const trend = [];

    for (let index = 0; index < safeDays; index += 1) {
      const currentDate = new Date(startDate);
      currentDate.setUTCDate(startDate.getUTCDate() + index);
      const key = formatUtcDateLabel(currentDate);
      const metric = metricsByDate.get(key);

      trend.push({
        date: key,
        orders: metric?.orders || 0,
        revenue: metric?.revenue || 0,
      });
    }

    return trend;
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

    const updatedOrder = await prisma.$transaction(async (tx) => {
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

      return tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: buildOrderInclude({ includeAuditLogs: true }),
      });
    });

    if (nextStatus === ORDER_STATUS.PAID) {
      await notificationService.notifyEvent(NOTIFICATION_TYPES.ORDER_PAID, {
        orderId,
      });
    }

    if (nextStatus === ORDER_STATUS.READY_FOR_DELIVERY) {
      await notificationService.notifyEvent(NOTIFICATION_TYPES.ORDER_READY, {
        orderId,
      });
    }

    return enrichOrderForDashboard(updatedOrder);
  }
}

module.exports = OrderService;
