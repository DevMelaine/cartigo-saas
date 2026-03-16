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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in an organization user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account temporarily locked
 */
router.post("/login", authLimiter, authController.login);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate a user refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refresh token rotated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh-token", authController.refreshToken);

module.exports = router;
