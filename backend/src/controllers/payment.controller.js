const paymentService = require("../services/payment.service");
const {
  createPayGatePaymentSchema,
  payGateWebhookSchema,
  paymentStatusParamsSchema,
  buildValidationError,
} = require("../validators/payment.validator");

async function createPayGatePayment(req, res) {
  try {
    const { error, value } = createPayGatePaymentSchema.validate(req.body, { abortEarly: false });

    if (error) {
      throw buildValidationError(error);
    }

    const result = await paymentService.createPayGatePayment({
      orderId: value.orderId,
      customerId: req.customer.customerId,
    });

    return res.status(200).json({
      success: true,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to create payment.",
      errors: error.details || undefined,
    });
  }
}

async function handlePayGateWebhook(req, res) {
  try {
    const { error, value } = payGateWebhookSchema.validate(req.body, { abortEarly: false });

    if (error) {
      throw buildValidationError(error);
    }

    const result = await paymentService.processPayGateWebhook(value);

    return res.status(200).json({
      success: true,
      message: result.alreadyProcessed ? "Payment already processed." : "Payment processed successfully.",
      data: {
        paymentStatus: result.payment.status,
        orderStatus: result.order.status,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to process webhook.",
      errors: error.details || undefined,
    });
  }
}

async function getPaymentStatus(req, res) {
  try {
    const { error, value } = paymentStatusParamsSchema.validate(req.params, { abortEarly: false });

    if (error) {
      throw buildValidationError(error);
    }

    const result = await paymentService.getPayGatePaymentStatus({
      orderId: value.orderId,
      customerId: req.customer.customerId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch payment status.",
      errors: error.details || undefined,
    });
  }
}

module.exports = {
  createPayGatePayment,
  handlePayGateWebhook,
  getPaymentStatus,
};
