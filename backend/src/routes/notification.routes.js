const express = require("express");
const notificationController = require("../controllers/notification.controller");
const notificationAuth = require("../middlewares/notificationAuth.middleware");

const router = express.Router();

router.use(notificationAuth);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the authenticated user or customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: unread
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Notifications returned successfully
 *       401:
 *         description: Authentication required
 */
router.get("/", notificationController.listNotifications);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read for the authenticated actor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *       401:
 *         description: Authentication required
 */
router.patch("/read-all", notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
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
 *         description: Notification marked as read
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Notification not found
 */
router.patch("/:id/read", notificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/register-device:
 *   post:
 *     tags: [Notifications]
 *     summary: Register or update a device token for push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - platform
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android, web]
 *     responses:
 *       200:
 *         description: Device token registered successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 */
router.post("/register-device", notificationController.registerDevice);

module.exports = router;
