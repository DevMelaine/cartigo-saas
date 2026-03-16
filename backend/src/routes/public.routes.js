const express = require("express");
const publicController = require("../controllers/public.controller");
const { publicApiLimiter } = require("../middlewares/rateLimiter/publicLimiter");

const router = express.Router();

router.use(publicApiLimiter);

/**
 * @swagger
 * /api/public/categories:
 *   get:
 *     tags: [Public]
 *     summary: List predefined organization categories for discovery
 *     responses:
 *       200:
 *         description: Organization categories returned successfully
 */
router.get("/categories", publicController.listCategories);

/**
 * @swagger
 * /api/public/organizations:
 *   get:
 *     tags: [Public]
 *     summary: List active organizations available for customer browsing
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Organizations returned successfully
 *       400:
 *         description: Invalid query parameters
 */
router.get("/organizations", publicController.listOrganizations);

/**
 * @swagger
 * /api/public/organizations/{organizationId}/products:
 *   get:
 *     tags: [Public]
 *     summary: List active products for one active organization
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization products returned successfully
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Organization not found
 */
router.get("/organizations/:organizationId/products", publicController.listOrganizationProducts);

/**
 * @swagger
 * /api/public/products/{productId}:
 *   get:
 *     tags: [Public]
 *     summary: Get public product details
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product details returned successfully
 *       400:
 *         description: Invalid product identifier
 *       404:
 *         description: Product not found
 */
router.get("/products/:productId", publicController.getProductDetails);

module.exports = router;
