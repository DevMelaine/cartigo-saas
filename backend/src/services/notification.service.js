const { PrismaClient, Prisma } = require("@prisma/client");
const { getMessagingClient } = require("../utils/firebase");
const { NOTIFICATION_TYPES, NOTIFICATION_EVENT_CONFIG } = require("../utils/notificationEvents");

const prisma = global.prisma || new PrismaClient();

function buildRecipientFilter(actorType, actorId) {
  return actorType === "customer"
    ? {
        customerId: actorId,
      }
    : {
        userId: actorId,
      };
}

function toPushData(notification) {
  const baseData = {
    notificationId: notification.id,
    type: notification.type,
  };

  const metadata = notification.metadata && typeof notification.metadata === "object"
    ? Object.entries(notification.metadata).reduce((acc, [key, value]) => {
        if (value === null || value === undefined) {
          return acc;
        }

        acc[key] = typeof value === "string" ? value : JSON.stringify(value);
        return acc;
      }, {})
    : {};

  return {
    ...baseData,
    ...metadata,
  };
}

class FirebasePushProvider {
  /**
   * Sends one push payload to all device tokens for the same recipient.
   * Missing Firebase credentials or library availability intentionally degrade to a no-op.
   */
  async sendToTokens(tokens, payload) {
    if (!tokens.length) {
      return { sentCount: 0, skipped: true };
    }

    const messaging = getMessagingClient();

    if (!messaging) {
      return { sentCount: 0, skipped: true };
    }

    const message = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    };

    if (typeof messaging.sendEachForMulticast === "function") {
      return messaging.sendEachForMulticast(message);
    }

    await Promise.all(
      tokens.map((token) =>
        messaging.send({
          token,
          notification: message.notification,
          data: message.data,
        })
      )
    );

    return {
      sentCount: tokens.length,
    };
  }
}

class NotificationService {
  constructor({ prismaClient = prisma, pushProvider } = {}) {
    this.prisma = prismaClient;
    this.defaultPushProvider = pushProvider || new FirebasePushProvider();
    this.pushProvider = this.defaultPushProvider;
    this.backgroundTasks = new Set();
  }

  setPushProvider(pushProvider) {
    this.pushProvider = pushProvider || this.defaultPushProvider;
  }

  resetPushProvider() {
    this.pushProvider = this.defaultPushProvider;
  }

  queueBackgroundTask(taskPromise) {
    const trackedTask = Promise.resolve(taskPromise)
      .catch(() => null)
      .finally(() => {
        this.backgroundTasks.delete(trackedTask);
      });

    this.backgroundTasks.add(trackedTask);
  }

  async waitForBackgroundTasks() {
    await Promise.allSettled(Array.from(this.backgroundTasks));
  }

  /**
   * Returns paginated notifications for the authenticated actor only.
   * The filter is scoped by actor id so users and customers cannot enumerate other inboxes.
   */
  async listNotifications({ actorType, actorId, unread, page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const where = {
      ...buildRecipientFilter(actorType, actorId),
      ...(typeof unread === "boolean" ? { isRead: !unread } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marks one actor-owned notification as read.
   */
  async markAsRead({ actorType, actorId, notificationId }) {
    const updated = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        ...buildRecipientFilter(actorType, actorId),
      },
      data: {
        isRead: true,
      },
    });

    if (updated.count === 0) {
      const error = new Error("Notification not found.");
      error.statusCode = 404;
      throw error;
    }

    return this.prisma.notification.findUnique({
      where: {
        id: notificationId,
      },
    });
  }

  /**
   * Marks all actor-owned notifications as read in one write operation.
   */
  async markAllAsRead({ actorType, actorId }) {
    const result = await this.prisma.notification.updateMany({
      where: {
        ...buildRecipientFilter(actorType, actorId),
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  /**
   * Registers or reassigns a device token to the current actor.
   * The unique token constraint prevents duplicate device rows under concurrent requests.
   */
  async registerDevice({ actorType, actorId, token, platform }) {
    return this.prisma.deviceToken.upsert({
      where: {
        token,
      },
      update: {
        platform,
        userId: actorType === "user" ? actorId : null,
        customerId: actorType === "customer" ? actorId : null,
      },
      create: {
        token,
        platform,
        userId: actorType === "user" ? actorId : null,
        customerId: actorType === "customer" ? actorId : null,
      },
    });
  }

  async resolveOrderEventContext(orderId) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      const error = new Error("Order not found for notification event.");
      error.statusCode = 404;
      throw error;
    }

    return {
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customer?.name || null,
      organizationId: order.organizationId,
      total: Number(order.total),
      status: order.status,
    };
  }

  async resolveLowStockContext(payload) {
    let product = null;

    if (payload.productId) {
      product = await this.prisma.product.findUnique({
        where: {
          id: payload.productId,
        },
        include: {
          inventory: true,
        },
      });
    }

    if (!product) {
      const error = new Error("Product not found for notification event.");
      error.statusCode = 404;
      throw error;
    }

    const inventory = product.inventory;
    const effectiveThreshold = payload.lowStockThreshold ?? product.lowStockThreshold ?? inventory?.minStock ?? 0;

    return {
      organizationId: payload.organizationId || product.organizationId,
      productId: product.id,
      productName: payload.productName || product.name,
      quantity: payload.quantity ?? inventory?.quantity ?? 0,
      lowStockThreshold: effectiveThreshold,
    };
  }

  async buildEventContext(eventType, payload) {
    if ([NOTIFICATION_TYPES.ORDER_PAID, NOTIFICATION_TYPES.ORDER_READY].includes(eventType)) {
      return this.resolveOrderEventContext(payload.orderId);
    }

    if (eventType === NOTIFICATION_TYPES.LOW_STOCK) {
      return this.resolveLowStockContext(payload);
    }

    const error = new Error(`Unsupported notification event: ${eventType}`);
    error.statusCode = 400;
    throw error;
  }

  async resolveTargetUsers(organizationId, roles) {
    if (!organizationId || !roles.length) {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        organizationId,
        role: {
          in: roles,
        },
        isActive: true,
      },
      select: {
        id: true,
        role: true,
      },
    });
  }

  buildNotificationRows(eventType, eventContext, users) {
    const config = NOTIFICATION_EVENT_CONFIG[eventType];
    const eventKey = config.buildEventKey(eventContext);
    const rows = users.map((user) => ({
      userId: user.id,
      customerId: null,
      organizationId: eventContext.organizationId || null,
      type: config.type,
      title: config.buildUserTitle(eventContext),
      message: config.buildUserMessage(eventContext),
      metadata: eventContext,
      eventKey,
    }));

    if (config.includeCustomer && eventContext.customerId) {
      rows.push({
        userId: null,
        customerId: eventContext.customerId,
        organizationId: eventContext.organizationId || null,
        type: config.type,
        title: config.buildCustomerTitle(eventContext),
        message: config.buildCustomerMessage(eventContext),
        metadata: eventContext,
        eventKey,
      });
    }

    return rows;
  }

  async createNotificationsAtomically(rows) {
    const createdRows = [];

    for (const row of rows) {
      try {
        const created = await this.prisma.notification.create({
          data: row,
        });

        createdRows.push(created);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }

        throw error;
      }
    }

    return createdRows;
  }

  async sendPushForNotifications(notifications) {
    if (!notifications.length) {
      return;
    }

    const userIds = notifications.filter((item) => item.userId).map((item) => item.userId);
    const customerIds = notifications.filter((item) => item.customerId).map((item) => item.customerId);

    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: {
        OR: [
          ...(userIds.length ? [{ userId: { in: userIds } }] : []),
          ...(customerIds.length ? [{ customerId: { in: customerIds } }] : []),
        ],
      },
    });

    const tokensByRecipient = new Map();

    for (const deviceToken of deviceTokens) {
      const key = deviceToken.userId ? `user:${deviceToken.userId}` : `customer:${deviceToken.customerId}`;
      const existing = tokensByRecipient.get(key) || new Set();
      existing.add(deviceToken.token);
      tokensByRecipient.set(key, existing);
    }

    await Promise.all(
      notifications.map(async (notification) => {
        const recipientKey = notification.userId ? `user:${notification.userId}` : `customer:${notification.customerId}`;
        const tokens = Array.from(tokensByRecipient.get(recipientKey) || []);

        if (!tokens.length) {
          return;
        }

        await this.pushProvider.sendToTokens(tokens, {
          title: notification.title,
          body: notification.message,
          data: toPushData(notification),
        });
      })
    );
  }

  /**
   * Persists notifications for a business event and schedules push delivery only for rows
   * actually inserted in this call. Unique constraints plus P2002 handling prevent duplicates
   * under repeated or concurrent event processing.
   */
  async notifyEvent(eventType, payload) {
    const config = NOTIFICATION_EVENT_CONFIG[eventType];

    if (!config) {
      const error = new Error(`Unsupported notification event: ${eventType}`);
      error.statusCode = 400;
      throw error;
    }

    const eventContext = await this.buildEventContext(eventType, payload);
    const users = await this.resolveTargetUsers(eventContext.organizationId, config.userRoles);
    const rows = this.buildNotificationRows(eventType, eventContext, users);
    const createdNotifications = await this.createNotificationsAtomically(rows);

    if (createdNotifications.length) {
      this.queueBackgroundTask(this.sendPushForNotifications(createdNotifications));
    }

    return {
      createdCount: createdNotifications.length,
      notifications: createdNotifications,
    };
  }
}

const notificationService = new NotificationService();

module.exports = notificationService;
module.exports.NotificationService = NotificationService;
module.exports.FirebasePushProvider = FirebasePushProvider;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

