const express = require("express");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const { authLimiter } = require("../middlewares/rateLimiter/authLimiter");
const {
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require("../middlewares/rateLimiter/passwordResetLimiter");

/**
 * @swagger
 * /api/auth/register-organization:
 *   post:
 *     tags: [Auth]
 *     summary: Register an organization and create admin user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationName
 *               - categoryId
 *               - adminName
 *               - email
 *               - password
 *             properties:
 *               organizationName:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               adminName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization created
 */
router.post(
  "/register-organization",
  authLimiter,
  authController.registerOrganization
);
router.post("/login", authLimiter, authController.login);
router.get("/google", authLimiter, authController.googleAuth);
router.get("/google/callback", authLimiter, authController.googleCallback);
router.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);
router.post("/reset-password", resetPasswordLimiter, authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.me);

module.exports = router;
