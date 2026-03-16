const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customer.controller");
const { customerAuthLimiter } = require("../middlewares/rateLimiter/customerLimiter");
const customerAuth = require("../middlewares/customerAuth.middleware");

/**
 * @swagger
 * /api/customers/register:
 *   post:
 *     tags: [Customers]
 *     summary: Register a new customer account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Email already in use
 */
// public endpoints with rate limiting
router.post("/register", customerAuthLimiter, customerController.register);

/**
 * @swagger
 * /api/customers/login:
 *   post:
 *     tags: [Customers]
 *     summary: Log in a customer
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
 *         description: Customer logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", customerAuthLimiter, customerController.login);

/**
 * @swagger
 * /api/customers/refresh-token:
 *   post:
 *     tags: [Customers]
 *     summary: Rotate a customer refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *               refreshCustomerToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refresh token rotated successfully
 *       400:
 *         description: Refresh token is required
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh-token", customerController.refreshCustomerToken);

/**
 * @swagger
 * /api/customers/profile:
 *   get:
 *     tags: [Customers]
 *     summary: Get the authenticated customer's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile returned successfully
 *       401:
 *         description: Customer authentication required
 */
// protected profile
router.get("/profile", customerAuth, customerController.profile);

module.exports = router;
