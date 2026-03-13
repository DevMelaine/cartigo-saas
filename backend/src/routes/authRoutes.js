const express = require("express");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */
const authController = require("../controllers/authController");
const { authLimiter } = require("../middlewares/rateLimiter/authLimiter");

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
 *             properties:
 *               name:
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
router.post("/refresh-token", authController.refreshToken);

module.exports = router;