const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const activityLogController = require("../controllers/activityLog.controller");

const router = express.Router();

router.use(authMiddleware);
router.get("/", authorizeRoles("ADMIN", "MANAGER"), activityLogController.listActivityLogs);

module.exports = router;
