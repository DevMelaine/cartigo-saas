const express = require("express");
const notificationController = require("../controllers/notification.controller");
const notificationAuth = require("../middlewares/notificationAuth.middleware");

const router = express.Router();

router.use(notificationAuth);

router.get("/", notificationController.listNotifications);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.post("/register-device", notificationController.registerDevice);

module.exports = router;
