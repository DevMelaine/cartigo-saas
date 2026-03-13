const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const authMiddleware = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Stock management endpoints
 */

/**
 * @swagger
 * /api/inventory/add:
 *   post:
 *     tags: [Inventory]
 *     summary: Add stock to a product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stock added successfully
 */
router.post("/add", authMiddleware, inventoryController.addStock);

/**
 * @swagger
 * /api/inventory/remove:
 *   post:
 *     tags: [Inventory]
 *     summary: Remove stock from a product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stock removed successfully
 */
router.post("/remove", authMiddleware, inventoryController.removeStock);

/**
 * @swagger
 * /api/inventory/{productId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory for a product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory details
 */
router.get("/:productId", authMiddleware, inventoryController.getByProductId);

/**
 * @swagger
 * /api/inventory/{productId}:
 *   patch:
 *     tags: [Inventory]
 *     summary: Update inventory details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *               minStock:
 *                 type: number
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 */
router.patch("/:productId", authMiddleware, inventoryController.update);

module.exports = router;
