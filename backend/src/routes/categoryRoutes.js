const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management endpoints
 */

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post("/", authMiddleware, authorizeRoles("ADMIN", "MANAGER"), categoryController.create);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Categories list
 */
router.get("/", authMiddleware, categoryController.list);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get category by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 */
router.get("/:id", authMiddleware, categoryController.getById);

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
router.patch("/:id", authMiddleware, authorizeRoles("ADMIN", "MANAGER"), categoryController.update);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 */
router.delete("/:id", authMiddleware, authorizeRoles("ADMIN", "MANAGER"), categoryController.deleteCategory);

module.exports = router;
