const Joi = require("joi");

const createPayGatePaymentSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
});

const payGateWebhookSchema = Joi.object({
  tx_reference: Joi.string().max(255).allow(null, ""),
  identifier: Joi.string().max(255).required(),
  payment_reference: Joi.string().max(255).allow(null, ""),
  amount: Joi.number().positive().precision(2).required(),
  datetime: Joi.string().required(),
  payment_method: Joi.string().max(50).required(),
  phone_number: Joi.string().max(50).allow(null, ""),
});

const paymentStatusParamsSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
});

function buildValidationError(error) {
  const err = new Error("Validation failed");
  err.statusCode = 400;
  err.details = error.details.map((detail) => detail.message);
  return err;
}

module.exports = {
  createPayGatePaymentSchema,
  payGateWebhookSchema,
  paymentStatusParamsSchema,
  buildValidationError,
};
