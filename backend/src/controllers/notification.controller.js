const notificationService = require("../services/notification.service");
const {
  listNotificationsSchema,
  notificationIdParamsSchema,
  registerDeviceSchema,
  buildValidationError,
} = require("../validators/notification.validator");

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
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to list notifications.",
      errors: error.details || undefined,
    });
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
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch unread notifications count.",
    });
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
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to mark notification as read.",
      errors: error.details || undefined,
    });
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
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to mark all notifications as read.",
    });
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
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to register device token.",
      errors: error.details || undefined,
    });
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  registerDevice,
};
