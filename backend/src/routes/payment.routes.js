const express = require("express");
const customerAuth = require("../middlewares/customerAuth.middleware");
const paymentController = require("../controllers/payment.controller");

const router = express.Router();

/**
 * @swagger
 * /api/payments/paygate:
 *   post:
 *     tags: [Payments]
 *     summary: Create a PayGate payment URL for a customer order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Payment URL generated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Customer authentication required
 *       404:
 *         description: Order not found
 */
router.post("/paygate", customerAuth, paymentController.createPayGatePayment);

/**
 * @swagger
 * /api/payments/paygate/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Receive PayGate payment webhook confirmation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tx_reference
 *               - identifier
 *               - amount
 *               - datetime
 *               - payment_method
 *               - phone_number
 *             properties:
 *               tx_reference:
 *                 type: string
 *               identifier:
 *                 type: string
 *               payment_reference:
 *                 type: string
 *               amount:
 *                 type: number
 *               datetime:
 *                 type: string
 *                 format: date-time
 *               payment_method:
 *                 type: string
 *               phone_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Payment or order not found
 */
router.post("/paygate/webhook", paymentController.handlePayGateWebhook);

/**
 * @swagger
 * /api/payments/status/{orderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get PayGate payment status for a customer order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment status returned successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Customer authentication required
 *       404:
 *         description: Order or payment not found
 */
router.get("/status/:orderId", customerAuth, paymentController.getPaymentStatus);

module.exports = router;
