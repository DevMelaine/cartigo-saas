const Joi = require("joi");
const ApiError = require("../utils/ApiError");

const notificationChannelSchema = Joi.string().valid("email", "sms", "inApp");
const notificationChannelsSchema = Joi.array()
  .items(notificationChannelSchema)
  .unique()
  .min(1);

const phoneSchema = Joi.string()
  .trim()
  .pattern(/^\+?[0-9]{8,20}$/)
  .messages({
    "string.pattern.base": "Phone number must contain 8 to 20 digits and may start with +.",
  });

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

const notificationRequestUserSchema = Joi.object({
  email: Joi.string().trim().lowercase().email(),
  phone: phoneSchema,
}).default({});

const safeNotificationUserSchema = Joi.object({
  id: Joi.string().uuid().required(),
  email: Joi.string().trim().lowercase().email(),
  phone: phoneSchema,
});

const notificationMetadataSchema = Joi.object({
  ipAddress: Joi.string().trim().ip({
    version: ["ipv4", "ipv6"],
    cidr: "forbidden",
  }),
  userAgent: Joi.string().trim().max(512),
  location: Joi.string().trim().max(255),
  device: Joi.string().trim().max(255),
  occurredAt: Joi.date().iso(),
  sessionId: Joi.string().trim().max(255),
  organizationId: Joi.string().uuid(),
}).default({});

const loginNotificationSchema = Joi.object({
  user: notificationRequestUserSchema.default({}),
  suspicious: Joi.boolean().default(false),
  metadata: notificationMetadataSchema.default({}),
  channels: notificationChannelsSchema,
});

const transactionNotificationSchema = Joi.object({
  user: notificationRequestUserSchema.default({}),
  transaction: Joi.object({
    id: Joi.string().trim().max(100).required(),
    reference: Joi.string().trim().max(100).allow("", null),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().trim().uppercase().length(3).default("USD"),
    type: Joi.string().trim().max(100).required(),
    status: Joi.string().trim().max(100).required(),
    description: Joi.string().trim().max(500).allow("", null),
    occurredAt: Joi.date().iso(),
  }).required(),
  metadata: notificationMetadataSchema.default({}),
  channels: notificationChannelsSchema,
});

function buildValidationError(error, message = "Validation failed") {
  return new ApiError(
    400,
    message,
    error.details.map((detail) => detail.message)
  );
}

function validateWithSchema(schema, data, message = "Validation failed") {
  const validation = schema.validate(data, {
    abortEarly: false,
    convert: true,
    stripUnknown: true,
  });

  if (validation.error) {
    throw buildValidationError(validation.error, message);
  }

  return validation.value;
}

module.exports = {
  listNotificationsSchema,
  notificationIdParamsSchema,
  registerDeviceSchema,
  notificationChannelsSchema,
  safeNotificationUserSchema,
  loginNotificationSchema,
  transactionNotificationSchema,
  buildValidationError,
  validateWithSchema,
};
