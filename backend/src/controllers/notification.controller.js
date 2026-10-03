const notificationService = require("../services/notification.service");
const {
  listNotificationsSchema,
  notificationIdParamsSchema,
  registerDeviceSchema,
  loginNotificationSchema,
  transactionNotificationSchema,
  validateWithSchema,
  buildValidationError,
} = require("../validators/notification.validator");

function handleControllerError(res, error, fallbackMessage) {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
    errors: error.details || undefined,
  });
}

function buildAuthNotificationUser(req, userPayload = {}) {
  return {
    id: req.user.userId,
    email: userPayload.email,
    phone: userPayload.phone,
  };
}

async function listNotifications(req, res) {
  try {
    const { error, value } = listNotificationsSchema.validate(req.query, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const result = await notificationService.listNotifications({
      actorType: req.notificationActor.actorType,
      actorId: req.notificationActor.actorId,
      unread: value.unread,
      page: value.page,
      limit: value.limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleControllerError(res, error, "Unable to list notifications.");
  }
}

async function getUnreadCount(req, res) {
  try {
    const result = await notificationService.getUnreadCount({
      actorType: req.notificationActor.actorType,
      actorId: req.notificationActor.actorId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to fetch unread notifications count."
    );
  }
}

async function markAsRead(req, res) {
  try {
    const { error, value } = notificationIdParamsSchema.validate(req.params, {
      abortEarly: false,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const notification = await notificationService.markAsRead({
      actorType: req.notificationActor.actorType,
      actorId: req.notificationActor.actorId,
      notificationId: value.id,
    });

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return handleControllerError(res, error, "Unable to mark notification as read.");
  }
}

async function markAllAsRead(req, res) {
  try {
    const result = await notificationService.markAllAsRead({
      actorType: req.notificationActor.actorType,
      actorId: req.notificationActor.actorId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleControllerError(res, error, "Unable to mark all notifications as read.");
  }
}

async function registerDevice(req, res) {
  try {
    const { error, value } = registerDeviceSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const deviceToken = await notificationService.registerDevice({
      actorType: req.notificationActor.actorType,
      actorId: req.notificationActor.actorId,
      token: value.token,
      platform: value.platform,
    });

    return res.status(200).json({
      success: true,
      data: deviceToken,
    });
  } catch (error) {
    return handleControllerError(res, error, "Unable to register device token.");
  }
}

async function triggerLoginNotification(req, res) {
  try {
    const value = validateWithSchema(
      loginNotificationSchema,
      req.body,
      "Invalid login notification payload."
    );

    const user = buildAuthNotificationUser(req, value.user);
    const metadata = {
      ...value.metadata,
      organizationId: req.user.organizationId || value.metadata.organizationId || null,
      ipAddress: value.metadata.ipAddress || req.ip,
      userAgent: value.metadata.userAgent || req.get("user-agent"),
    };

    const result = value.suspicious
      ? await notificationService.notifySuspiciousLogin(user, metadata, {
          channels: value.channels,
          organizationId: req.user.organizationId || null,
        })
      : await notificationService.notifyLogin(user, metadata, {
          channels: value.channels,
          organizationId: req.user.organizationId || null,
        });

    return res.status(202).json({
      success: true,
      message: value.suspicious
        ? "Suspicious login notification queued."
        : "Login notification queued.",
      data: result,
    });
  } catch (error) {
    return handleControllerError(res, error, "Unable to queue login notification.");
  }
}

async function triggerTransactionNotification(req, res) {
  try {
    const value = validateWithSchema(
      transactionNotificationSchema,
      req.body,
      "Invalid transaction notification payload."
    );

    const user = buildAuthNotificationUser(req, value.user);
    const metadata = {
      ...value.metadata,
      organizationId: req.user.organizationId || value.metadata.organizationId || null,
      ipAddress: value.metadata.ipAddress || req.ip,
      userAgent: value.metadata.userAgent || req.get("user-agent"),
    };

    const result = await notificationService.notifyTransaction(user, value.transaction, {
      channels: value.channels,
      metadata,
      organizationId: req.user.organizationId || null,
    });

    return res.status(202).json({
      success: true,
      message: "Transaction notification queued.",
      data: result,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to queue transaction notification."
    );
  }
}

module.exports = {
  triggerLoginNotification,
  triggerTransactionNotification,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  registerDevice,
};
