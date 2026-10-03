const crypto = require("crypto");
const { PrismaClient, Prisma } = require("@prisma/client");
const { getMessagingClient } = require("../utils/firebase");
const { NOTIFICATION_TYPES, NOTIFICATION_EVENT_CONFIG } = require("../utils/notificationEvents");
const { sendEmailMessage } = require("./emailService");
const { sendSmsMessage } = require("./sms.service");
const { logger, maskEmail, maskPhone } = require("../lib/logger");
const ApiError = require("../utils/ApiError");
const {
  notificationChannelsSchema,
  safeNotificationUserSchema,
  validateWithSchema,
} = require("../validators/notification.validator");

const prisma = global.prisma || new PrismaClient();

const DEFAULT_NOTIFICATION_TITLE = "Account notification";
const DEFAULT_THROTTLE_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_THROTTLE_MAX_PER_USER_AND_TYPE = 3;
const SUPPORTED_NOTIFICATION_CHANNELS = Object.freeze(["email", "sms", "inApp"]);

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

  const metadata =
    notification.metadata && typeof notification.metadata === "object"
      ? Object.entries(notification.metadata).reduce((accumulator, [key, value]) => {
          if (value === null || value === undefined) {
            return accumulator;
          }

          accumulator[key] = typeof value === "string" ? value : JSON.stringify(value);
          return accumulator;
        }, {})
      : {};

  return {
    ...baseData,
    ...metadata,
  };
}

function isInvalidPushTokenError(error) {
  const code = error?.code || error?.errorInfo?.code;

  return [
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered",
    "messaging/invalid-argument",
  ].includes(code);
}

function createStatusError(message, statusCode = 500, details) {
  return new ApiError(statusCode, message, details);
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    message: error.message,
    statusCode: error.statusCode || error.status || 500,
    code: error.code || undefined,
    details: error.details || undefined,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTimestamp(input) {
  const date = input ? new Date(input) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function formatCurrency(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch (error) {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

function normalizeNullableText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function normalizeNullableDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeTransactionPayload(transaction) {
  return {
    id: transaction.id,
    reference: normalizeNullableText(transaction.reference),
    amount: Number(transaction.amount),
    currency: transaction.currency,
    type: transaction.type,
    status: transaction.status,
    description: normalizeNullableText(transaction.description),
    occurredAt: normalizeNullableDate(transaction.occurredAt),
  };
}

function normalizeMetadata(metadata = {}) {
  return {
    ipAddress: normalizeNullableText(metadata.ipAddress),
    userAgent: normalizeNullableText(metadata.userAgent),
    location: normalizeNullableText(metadata.location),
    device: normalizeNullableText(metadata.device),
    sessionId: normalizeNullableText(metadata.sessionId),
    organizationId: metadata.organizationId || null,
    occurredAt: normalizeNullableDate(metadata.occurredAt),
  };
}

function buildContextSummary(metadata = {}) {
  const parts = [];

  if (metadata.ipAddress) {
    parts.push(`IP ${metadata.ipAddress}`);
  }

  if (metadata.location) {
    parts.push(metadata.location);
  }

  if (metadata.device) {
    parts.push(metadata.device);
  } else if (metadata.userAgent) {
    parts.push(metadata.userAgent);
  }

  return parts.join(" | ");
}

function buildFingerprint(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

function buildBucketTimestamp(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }

  return date.toISOString().slice(0, 16);
}

function parseInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

class FirebasePushProvider {
  async sendToTokens(tokens, payload) {
    if (!tokens.length) {
      return { sentCount: 0, skipped: true, invalidTokens: [] };
    }

    const messaging = getMessagingClient();

    if (!messaging) {
      return { sentCount: 0, skipped: true, invalidTokens: [] };
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
      const result = await messaging.sendEachForMulticast(message);
      const invalidTokens = result.responses
        .map((response, index) =>
          response.success || !isInvalidPushTokenError(response.error) ? null : tokens[index]
        )
        .filter(Boolean);

      return {
        sentCount: result.successCount,
        skipped: false,
        invalidTokens,
        raw: result,
      };
    }

    const results = await Promise.allSettled(
      tokens.map((token) =>
        messaging.send({
          token,
          notification: message.notification,
          data: message.data,
        })
      )
    );

    return {
      sentCount: results.filter((result) => result.status === "fulfilled").length,
      skipped: false,
      invalidTokens: results
        .map((result, index) =>
          result.status === "rejected" && isInvalidPushTokenError(result.reason) ? tokens[index] : null
        )
        .filter(Boolean),
    };
  }
}

class NodemailerEmailProvider {
  async send(payload) {
    const result = await sendEmailMessage(payload);

    return {
      skipped: false,
      provider: "nodemailer",
      messageId: result?.messageId || null,
    };
  }
}

class DefaultSmsProvider {
  async send(payload) {
    return sendSmsMessage(payload);
  }
}

class NotificationService {
  constructor({ prismaClient = prisma, pushProvider, emailProvider, smsProvider } = {}) {
    this.prisma = prismaClient;

    this.defaultPushProvider = pushProvider || new FirebasePushProvider();
    this.pushProvider = this.defaultPushProvider;

    this.defaultEmailProvider = emailProvider || new NodemailerEmailProvider();
    this.emailProvider = this.defaultEmailProvider;

    this.defaultSmsProvider = smsProvider || new DefaultSmsProvider();
    this.smsProvider = this.defaultSmsProvider;

    this.backgroundTasks = new Set();
    this.antiSpamWindowMs = parseInteger(
      process.env.NOTIFICATION_ANTI_SPAM_WINDOW_MS,
      DEFAULT_THROTTLE_WINDOW_MS
    );
    this.antiSpamMaxPerType = parseInteger(
      process.env.NOTIFICATION_ANTI_SPAM_MAX,
      DEFAULT_THROTTLE_MAX_PER_USER_AND_TYPE
    );
    this.recentEventKeys = new Map();
    this.userTypeWindow = new Map();
  }

  setPushProvider(pushProvider) {
    this.pushProvider = pushProvider || this.defaultPushProvider;
  }

  resetPushProvider() {
    this.pushProvider = this.defaultPushProvider;
  }

  setEmailProvider(emailProvider) {
    this.emailProvider = emailProvider || this.defaultEmailProvider;
  }

  resetEmailProvider() {
    this.emailProvider = this.defaultEmailProvider;
  }

  setSmsProvider(smsProvider) {
    this.smsProvider = smsProvider || this.defaultSmsProvider;
  }

  resetSmsProvider() {
    this.smsProvider = this.defaultSmsProvider;
  }

  clearAntiSpamState() {
    this.recentEventKeys.clear();
    this.userTypeWindow.clear();
  }

  queueBackgroundTask(taskPromise) {
    const trackedTask = Promise.resolve(taskPromise)
      .catch((error) => {
        logger.error("Background notification task failed.", {
          scope: "notification.background",
          error: serializeError(error),
        });
        return null;
      })
      .finally(() => {
        this.backgroundTasks.delete(trackedTask);
      });

    this.backgroundTasks.add(trackedTask);
  }

  async waitForBackgroundTasks() {
    await Promise.allSettled(Array.from(this.backgroundTasks));
  }

  validateNotificationRecipient(user) {
    return validateWithSchema(
      safeNotificationUserSchema,
      user,
      "Invalid notification recipient."
    );
  }

  validateNotificationChannels(channels) {
    if (!channels) {
      return null;
    }

    return validateWithSchema(
      notificationChannelsSchema,
      channels,
      "Invalid notification channels."
    );
  }

  buildNotificationTemplates(type, payload) {
    const occurredAt = formatTimestamp(
      payload.metadata?.occurredAt || payload.transaction?.occurredAt
    );

    if (type === NOTIFICATION_TYPES.LOGIN) {
      const summary = buildContextSummary(payload.metadata);
      const intro = `A login to your account was detected on ${occurredAt}.`;
      const extra = summary ? ` Context: ${summary}.` : "";

      return {
        type,
        subject: "New login detected on your account",
        title: "New login detected",
        message: `${intro}${extra} If this was not you, please contact support immediately.`,
        smsMessage: `Login detected on ${occurredAt}.${payload.metadata?.ipAddress ? ` IP ${payload.metadata.ipAddress}.` : ""}`,
        logLevel: "info",
        auditAction: "LOGIN_NOTIFICATION_SENT",
      };
    }

    if (type === NOTIFICATION_TYPES.SUSPICIOUS_LOGIN) {
      const summary = buildContextSummary(payload.metadata);
      const intro = `A suspicious login attempt was detected on ${occurredAt}.`;
      const extra = summary ? ` Context: ${summary}.` : "";

      return {
        type,
        subject: "Suspicious login activity detected",
        title: "Suspicious login detected",
        message: `${intro}${extra} Review your account immediately if you do not recognize this activity.`,
        smsMessage: `Suspicious login detected.${payload.metadata?.ipAddress ? ` IP ${payload.metadata.ipAddress}.` : ""}`,
        logLevel: "warn",
        auditAction: "SUSPICIOUS_LOGIN_NOTIFICATION_SENT",
      };
    }

    if (type === NOTIFICATION_TYPES.PASSWORD_CHANGED) {
      return {
        type,
        subject: "Your password was changed",
        title: "Password changed",
        message: `Your password was changed on ${occurredAt}. If you did not perform this change, contact support immediately.`,
        smsMessage: "Your password was changed. Contact support immediately if this was not you.",
        logLevel: "info",
        auditAction: "PASSWORD_CHANGE_NOTIFICATION_SENT",
      };
    }

    if (type === NOTIFICATION_TYPES.TRANSACTION_ALERT) {
      const transaction = payload.transaction;
      const reference = transaction.reference || transaction.id;
      const formattedAmount = formatCurrency(transaction.amount, transaction.currency);
      const description = transaction.description ? ` ${transaction.description}.` : "";

      return {
        type,
        subject: `Transaction update: ${reference}`,
        title: "Transaction update",
        message: `Transaction ${reference} is ${transaction.status} for ${formattedAmount} (${transaction.type}) on ${occurredAt}.${description}`.trim(),
        smsMessage: `Transaction ${reference}: ${transaction.status} ${formattedAmount}.`,
        logLevel: "info",
        auditAction: "TRANSACTION_NOTIFICATION_SENT",
      };
    }

    throw createStatusError(`Unsupported notification type: ${type}`, 400);
  }

  buildNotificationEventKey(type, payload) {
    if (type === NOTIFICATION_TYPES.LOGIN || type === NOTIFICATION_TYPES.SUSPICIOUS_LOGIN) {
      return `${type.toLowerCase()}:${payload.user.id}:${buildFingerprint({
        ipAddress: payload.metadata?.ipAddress || null,
        userAgent: payload.metadata?.userAgent || null,
        device: payload.metadata?.device || null,
        sessionId: payload.metadata?.sessionId || null,
      })}`;
    }

    if (type === NOTIFICATION_TYPES.PASSWORD_CHANGED) {
      return `password-changed:${payload.user.id}:${buildBucketTimestamp(
        payload.metadata?.occurredAt
      )}`;
    }

    if (type === NOTIFICATION_TYPES.TRANSACTION_ALERT) {
      return `transaction:${payload.user.id}:${buildFingerprint({
        id: payload.transaction?.id,
        reference: payload.transaction?.reference || null,
        status: payload.transaction?.status,
        amount: payload.transaction?.amount,
      })}`;
    }

    throw createStatusError(`Unsupported notification type: ${type}`, 400);
  }

  shouldThrottleNotification({ userId, type, eventKey }) {
    const now = Date.now();
    const recentEventKey = `${userId}:${type}:${eventKey}`;
    const userTypeKey = `${userId}:${type}`;

    const previousEventTimestamp = this.recentEventKeys.get(recentEventKey);

    if (previousEventTimestamp && now - previousEventTimestamp < this.antiSpamWindowMs) {
      return {
        throttled: true,
        reason: "duplicate-event",
      };
    }

    const timestamps = (this.userTypeWindow.get(userTypeKey) || []).filter(
      (timestamp) => now - timestamp < this.antiSpamWindowMs
    );

    if (timestamps.length >= this.antiSpamMaxPerType) {
      this.userTypeWindow.set(userTypeKey, timestamps);

      return {
        throttled: true,
        reason: "rate-limit-window",
      };
    }

    timestamps.push(now);
    this.recentEventKeys.set(recentEventKey, now);
    this.userTypeWindow.set(userTypeKey, timestamps);

    return {
      throttled: false,
    };
  }

  async resolveNotificationRecipient(user) {
    const safeUser = this.validateNotificationRecipient(user);

    if (safeUser.email) {
      return safeUser;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        id: safeUser.id,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!existingUser) {
      throw createStatusError("Notification recipient not found.", 404);
    }

    return {
      ...safeUser,
      email: existingUser.email || safeUser.email || undefined,
    };
  }

  resolveChannels(requestedChannels, user) {
    const channels = requestedChannels?.length ? requestedChannels : SUPPORTED_NOTIFICATION_CHANNELS;

    return channels.filter((channel) => {
      if (channel === "email") {
        return Boolean(user.email);
      }

      if (channel === "sms") {
        return Boolean(user.phone);
      }

      return channel === "inApp";
    });
  }

  async recordAuditHook({ userId, organizationId, action, metadata = {} }) {
    if (!userId || !action) {
      return;
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          organizationId: organizationId || null,
          action,
          ipAddress: metadata.ipAddress || null,
          userAgent: metadata.userAgent || null,
        },
      });
    } catch (error) {
      logger.error("Audit hook failed for notification flow.", {
        scope: "notification.audit",
        userId,
        organizationId: organizationId || null,
        action,
        error: serializeError(error),
      });
    }
  }

  async sendEmail(to, subject, message, options = {}) {
    if (!to || typeof to !== "string") {
      throw createStatusError("Email recipient is required.", 400);
    }

    if (!subject || typeof subject !== "string") {
      throw createStatusError("Email subject is required.", 400);
    }

    if (!message || typeof message !== "string") {
      throw createStatusError("Email message is required.", 400);
    }

    const htmlMessage =
      options.html ||
      `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`;

    try {
      const result = await this.emailProvider.send({
        to,
        subject,
        text: message,
        html: htmlMessage,
      });

      logger.info("Email notification sent.", {
        scope: "notification.email",
        notificationType: options.notificationType || null,
        userId: options.userId || null,
        email: maskEmail(to),
        provider: result?.provider || "unknown",
      });

      return result;
    } catch (error) {
      logger.error("Email notification failed.", {
        scope: "notification.email",
        notificationType: options.notificationType || null,
        userId: options.userId || null,
        email: maskEmail(to),
        error: serializeError(error),
      });

      throw error;
    }
  }

  async sendSMS(to, message, options = {}) {
    if (!to || typeof to !== "string") {
      throw createStatusError("SMS recipient is required.", 400);
    }

    if (!message || typeof message !== "string") {
      throw createStatusError("SMS message is required.", 400);
    }

    try {
      const result = await this.smsProvider.send({
        to,
        message,
      });

      if (result?.skipped) {
        logger.info("SMS notification skipped.", {
          scope: "notification.sms",
          notificationType: options.notificationType || null,
          userId: options.userId || null,
          phone: maskPhone(to),
          provider: result.provider || "unknown",
        });

        return result;
      }

      logger.info("SMS notification sent.", {
        scope: "notification.sms",
        notificationType: options.notificationType || null,
        userId: options.userId || null,
        phone: maskPhone(to),
        provider: result?.provider || "unknown",
      });

      return result;
    } catch (error) {
      logger.error("SMS notification failed.", {
        scope: "notification.sms",
        notificationType: options.notificationType || null,
        userId: options.userId || null,
        phone: maskPhone(to),
        error: serializeError(error),
      });

      throw error;
    }
  }

  async findNotificationByUniqueKey({ userId, customerId, type, eventKey }) {
    return this.prisma.notification.findFirst({
      where: {
        userId: userId || null,
        customerId: customerId || null,
        type,
        eventKey,
      },
    });
  }

  async sendInAppNotification(userId, message, options = {}) {
    if (!userId || typeof userId !== "string") {
      throw createStatusError("Notification user id is required.", 400);
    }

    if (!message || typeof message !== "string") {
      throw createStatusError("Notification message is required.", 400);
    }

    const type = options.type || NOTIFICATION_TYPES.LOGIN;
    const title = options.title || DEFAULT_NOTIFICATION_TITLE;
    const eventKey = options.eventKey || `manual:${type.toLowerCase()}:${userId}:${Date.now()}`;

    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          organizationId: options.organizationId || null,
          type,
          title,
          message,
          metadata: options.metadata || null,
          eventKey,
        },
      });

      logger.info("In-app notification stored.", {
        scope: "notification.in-app",
        notificationType: type,
        userId,
        notificationId: notification.id,
      });

      return notification;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existingNotification = await this.findNotificationByUniqueKey({
          userId,
          customerId: null,
          type,
          eventKey,
        });

        logger.info("In-app notification reused after duplicate event.", {
          scope: "notification.in-app",
          notificationType: type,
          userId,
          eventKey,
        });

        return existingNotification;
      }

      logger.error("In-app notification failed.", {
        scope: "notification.in-app",
        notificationType: type,
        userId,
        error: serializeError(error),
      });

      throw error;
    }
  }

  async dispatchAuthNotification(type, user, options = {}) {
    const validatedUser = this.validateNotificationRecipient(user);
    const channels = this.validateNotificationChannels(options.channels);
    const normalizedMetadata = normalizeMetadata(options.metadata);
    const transaction = options.transaction
      ? normalizeTransactionPayload(options.transaction)
      : null;

    const payload = {
      user: validatedUser,
      metadata: normalizedMetadata,
      transaction,
      channels,
      organizationId: options.organizationId || normalizedMetadata.organizationId || null,
    };

    const templates = this.buildNotificationTemplates(type, payload);
    const eventKey = this.buildNotificationEventKey(type, payload);
    const jobId = crypto.randomUUID();

    this.queueBackgroundTask(
      this.processNotificationJob({
        jobId,
        type,
        payload,
        templates,
        eventKey,
      })
    );

    if (type === NOTIFICATION_TYPES.SUSPICIOUS_LOGIN) {
      logger.warn("Suspicious login notification queued.", {
        scope: "notification.queue",
        jobId,
        notificationType: type,
        userId: validatedUser.id,
        ipAddress: normalizedMetadata.ipAddress || null,
      });
    } else {
      logger.info("Notification queued.", {
        scope: "notification.queue",
        jobId,
        notificationType: type,
        userId: validatedUser.id,
      });
    }

    return {
      queued: true,
      jobId,
      type,
      channels: channels || SUPPORTED_NOTIFICATION_CHANNELS,
    };
  }

  async processNotificationJob(job) {
    const recipient = await this.resolveNotificationRecipient(job.payload.user);
    const organizationId = job.payload.organizationId || null;
    const channels = this.resolveChannels(job.payload.channels, recipient);

    if (!channels.length) {
      logger.warn("Notification skipped because no channel is available.", {
        scope: "notification.dispatch",
        jobId: job.jobId,
        notificationType: job.type,
        userId: recipient.id,
      });

      return {
        skipped: true,
        reason: "no-channel-available",
      };
    }

    const throttleState = this.shouldThrottleNotification({
      userId: recipient.id,
      type: job.type,
      eventKey: job.eventKey,
    });

    if (throttleState.throttled) {
      logger.warn("Notification throttled by anti-spam guard.", {
        scope: "notification.dispatch",
        jobId: job.jobId,
        notificationType: job.type,
        userId: recipient.id,
        reason: throttleState.reason,
      });

      await this.recordAuditHook({
        userId: recipient.id,
        organizationId,
        action: "NOTIFICATION_THROTTLED",
        metadata: job.payload.metadata,
      });

      return {
        throttled: true,
        reason: throttleState.reason,
      };
    }

    const channelTasks = [];

    if (channels.includes("email")) {
      channelTasks.push({
        channel: "email",
        task: this.sendEmail(recipient.email, job.templates.subject, job.templates.message, {
          notificationType: job.type,
          userId: recipient.id,
        }),
      });
    }

    if (channels.includes("sms")) {
      channelTasks.push({
        channel: "sms",
        task: this.sendSMS(recipient.phone, job.templates.smsMessage, {
          notificationType: job.type,
          userId: recipient.id,
        }),
      });
    }

    if (channels.includes("inApp")) {
      channelTasks.push({
        channel: "inApp",
        task: this.sendInAppNotification(recipient.id, job.templates.message, {
          type: job.type,
          title: job.templates.title,
          metadata: {
            ...job.payload.metadata,
            ...(job.payload.transaction
              ? {
                  transaction: job.payload.transaction,
                }
              : {}),
          },
          eventKey: job.eventKey,
          organizationId,
        }),
      });
    }

    const settledResults = await Promise.allSettled(
      channelTasks.map((channelTask) => channelTask.task)
    );

    const results = settledResults.map((result, index) => {
      const channel = channelTasks[index].channel;

      if (result.status === "fulfilled") {
        return {
          channel,
          success: true,
          skipped: Boolean(result.value?.skipped),
        };
      }

      return {
        channel,
        success: false,
        error: serializeError(result.reason),
      };
    });

    const hasSuccessfulChannel = results.some((result) => result.success);

    if (hasSuccessfulChannel) {
      await this.recordAuditHook({
        userId: recipient.id,
        organizationId,
        action: job.templates.auditAction,
        metadata: job.payload.metadata,
      });
    }

    const logMethod =
      job.templates.logLevel === "warn" ? logger.warn.bind(logger) : logger.info.bind(logger);

    logMethod("Notification dispatch completed.", {
      scope: "notification.dispatch",
      jobId: job.jobId,
      notificationType: job.type,
      userId: recipient.id,
      channels: results,
    });

    if (!hasSuccessfulChannel) {
      logger.error("Notification dispatch failed on every channel.", {
        scope: "notification.dispatch",
        jobId: job.jobId,
        notificationType: job.type,
        userId: recipient.id,
        channels: results,
      });
    }

    return {
      jobId: job.jobId,
      type: job.type,
      results,
    };
  }

  async notifyLogin(user, metadata = {}, options = {}) {
    return this.dispatchAuthNotification(NOTIFICATION_TYPES.LOGIN, user, {
      ...options,
      metadata,
    });
  }

  async notifySuspiciousLogin(user, metadata = {}, options = {}) {
    return this.dispatchAuthNotification(NOTIFICATION_TYPES.SUSPICIOUS_LOGIN, user, {
      ...options,
      metadata,
    });
  }

  async notifyPasswordChange(user, metadata = {}, options = {}) {
    return this.dispatchAuthNotification(NOTIFICATION_TYPES.PASSWORD_CHANGED, user, {
      ...options,
      metadata,
    });
  }

  async notifyTransaction(user, transaction, options = {}) {
    if (!transaction || typeof transaction !== "object") {
      throw createStatusError("Invalid transaction payload.", 400);
    }

    return this.dispatchAuthNotification(NOTIFICATION_TYPES.TRANSACTION_ALERT, user, {
      ...options,
      transaction,
      metadata: options.metadata || {},
    });
  }

  async listNotifications({ actorType, actorId, unread, page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const where = {
      ...buildRecipientFilter(actorType, actorId),
      ...(typeof unread === "boolean" ? { isRead: !unread } : {}),
    };
    const recipientFilter = buildRecipientFilter(actorType, actorId);
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          ...recipientFilter,
          isRead: false,
        },
      }),
    ]);

    return {
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount({ actorType, actorId }) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        ...buildRecipientFilter(actorType, actorId),
        isRead: false,
      },
    });

    return {
      unreadCount,
    };
  }

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
      throw createStatusError("Notification not found.", 404);
    }

    return this.prisma.notification.findUnique({
      where: {
        id: notificationId,
      },
    });
  }

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
      throw createStatusError("Order not found for notification event.", 404);
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
      throw createStatusError("Product not found for notification event.", 404);
    }

    const inventory = product.inventory;
    const effectiveThreshold =
      payload.lowStockThreshold ?? product.lowStockThreshold ?? inventory?.minStock ?? 0;

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

    throw createStatusError(`Unsupported notification event: ${eventType}`, 400);
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
    const customerIds = notifications
      .filter((item) => item.customerId)
      .map((item) => item.customerId);

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
      const key = deviceToken.userId
        ? `user:${deviceToken.userId}`
        : `customer:${deviceToken.customerId}`;
      const existing = tokensByRecipient.get(key) || new Set();
      existing.add(deviceToken.token);
      tokensByRecipient.set(key, existing);
    }

    await Promise.all(
      notifications.map(async (notification) => {
        const recipientKey = notification.userId
          ? `user:${notification.userId}`
          : `customer:${notification.customerId}`;
        const tokens = Array.from(tokensByRecipient.get(recipientKey) || []);

        if (!tokens.length) {
          return;
        }

        try {
          const result = await this.pushProvider.sendToTokens(tokens, {
            title: notification.title,
            body: notification.message,
            data: toPushData(notification),
          });

          if (result?.invalidTokens?.length) {
            await this.prisma.deviceToken.deleteMany({
              where: {
                token: {
                  in: result.invalidTokens,
                },
              },
            });
          }
        } catch (error) {
          logger.error("Push notification failed.", {
            scope: "notification.push",
            notificationType: notification.type,
            notificationId: notification.id,
            error: serializeError(error),
          });
        }
      })
    );
  }

  async notifyEvent(eventType, payload) {
    const config = NOTIFICATION_EVENT_CONFIG[eventType];

    if (!config) {
      throw createStatusError(`Unsupported notification event: ${eventType}`, 400);
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
