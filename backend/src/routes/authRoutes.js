const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authLimiter } = require("../middlewares/rateLimiter");

router.post(
  "/register-organization",
  authLimiter,
  authController.registerOrganization
);
router.post("/login", authLimiter, authController.login);
router.post("/refresh-token", authController.refreshToken);

module.exports = router;