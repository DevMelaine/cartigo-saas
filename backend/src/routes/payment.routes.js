const express = require("express");
const customerAuth = require("../middlewares/customerAuth.middleware");
const paymentController = require("../controllers/payment.controller");

const router = express.Router();

router.post("/paygate", customerAuth, paymentController.createPayGatePayment);
router.post("/paygate/webhook", paymentController.handlePayGateWebhook);
router.get("/status/:orderId", customerAuth, paymentController.getPaymentStatus);

module.exports = router;
