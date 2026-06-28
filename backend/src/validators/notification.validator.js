const Joi = require("joi");

const listNotificationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  unread: Joi.boolean().truthy("true").truthy("1").falsy("false").falsy("0"),
});

const notificationIdParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const registerDeviceSchema = Joi.object({
  token: Joi.string().trim().min(20).max(4096).required(),
  platform: Joi.string().trim().valid("ios", "android", "web").required(),
});

function buildValidationError(error) {
  const err = new Error("Validation failed");
  err.statusCode = 400;
  err.details = error.details.map((detail) => detail.message);
  return err;
}

module.exports = {
  listNotificationsSchema,
  notificationIdParamsSchema,
  registerDeviceSchema,
  buildValidationError,
};
