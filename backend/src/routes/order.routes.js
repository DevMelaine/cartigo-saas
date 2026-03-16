const express = require("express");

const OrderController = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const customerAuth = require("../middlewares/customerAuth.middleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List organization orders with pagination and status filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_PAYMENT, PAID, PROCESSING, READY_FOR_DELIVERY, IN_DELIVERY, DELIVERED, CANCELLED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Orders returned successfully
 *       400:
 *         description: Invalid filters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden for the current role
 */
router.get(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN", "MANAGER", "CASHIER", "STAFF"),
  OrderController.listOrders
);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update an order lifecycle status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING_PAYMENT, PAID, PROCESSING, READY_FOR_DELIVERY, IN_DELIVERY, DELIVERED, CANCELLED]
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid payload or transition
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden for the current role
 *       404:
 *         description: Order not found
 */
router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles("ADMIN", "MANAGER", "CASHIER", "STAFF"),
  OrderController.updateStatus
);

/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     tags: [Orders]
 *     summary: Create an order from the authenticated customer's cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order created successfully
 *       400:
 *         description: Cart or checkout validation failed
 *       401:
 *         description: Customer authentication required
 */
router.post(
  "/checkout",
  customerAuth,
  OrderController.checkout
);

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders owned by the authenticated customer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer orders returned successfully
 *       401:
 *         description: Customer authentication required
 */
router.get(
  "/my-orders",
  customerAuth,
  OrderController.getMyOrders
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get one customer-owned order by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order returned successfully
 *       401:
 *         description: Customer authentication required
 *       404:
 *         description: Order not found
 */
router.get(
  "/:id",
  customerAuth,
  OrderController.getOrder
);

module.exports = router;
