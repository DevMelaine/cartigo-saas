/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product in the authenticated organization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - stock
 *               - sku
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               stock:
 *                 type: integer
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               lowStockThreshold:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden for the current role
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const productController = require("../controllers/productController");

// all product routes require authentication
router.use(authMiddleware);

router.post("/", productController.createProduct);

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List products in the authenticated organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Products returned successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 */
router.get("/", productController.getProducts);

/**
 * @swagger
 * /api/products/stats/overview:
 *   get:
 *     tags: [Products]
 *     summary: Get product statistics for the authenticated organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product statistics returned successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden for the current role
 */
router.get("/stats/overview", productController.getProductStats);

/**
 * @swagger
 * /api/products/stats/low-stock:
 *   get:
 *     tags: [Products]
 *     summary: List low stock products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Low stock products returned successfully
 *       400:
 *         description: Invalid limit
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden for the current role
 */
router.get("/stats/low-stock", productController.getLowStockProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get one product by ID
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
 *         description: Product returned successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Product not found
 */
router.get("/:id", productController.getProductById);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *               price:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               stock:
 *                 type: integer
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               lowStockThreshold:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden for the current role
 *       404:
 *         description: Product not found
 */
router.put("/:id", productController.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Soft delete a product
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
 *         description: Product deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden for the current role
 *       404:
 *         description: Product not found
 */
router.delete("/:id", productController.deleteProduct);

module.exports = router;
