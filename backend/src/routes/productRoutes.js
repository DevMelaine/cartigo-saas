/**
 * Product routes
 * RESTful API endpoints for product management
 * All routes require authentication via authMiddleware
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const productController = require("../controllers/productController");

// all product routes require authentication
router.use(authMiddleware);

/**
 * POST /api/products
 * Create a new product
 * Body: { name, description, price, costPrice, stock, sku, barcode, category, imageUrl, lowStockThreshold }
 * Response: { success, message, data }
 */
router.post("/", productController.createProduct);

/**
 * GET /api/products
 * Get all products with pagination and filtering
 * Query: ?page=1&limit=10&search=rice&category=food&sort=createdAt&order=asc
 * Response: { success, data, pagination }
 */
router.get("/", productController.getProducts);

/**
 * GET /api/products/stats/overview
 * Get product statistics (total products, total stock, average price)
 * Response: { success, data }
 */
router.get("/stats/overview", productController.getProductStats);

/**
 * GET /api/products/stats/low-stock
 * Get products with low stock levels
 * Query: ?limit=20
 * Response: { success, data, count }
 */
router.get("/stats/low-stock", productController.getLowStockProducts);

/**
 * GET /api/products/stats/top-performers
 * Get best performing products ranked by revenue and sales
 * Query: ?limit=5
 * Response: { success, data, count }
 */
router.get("/stats/top-performers", productController.getTopPerformingProducts);

/**
 * GET /api/products/:id
 * Get a single product by ID
 * Response: { success, data }
 */
router.get("/:id", productController.getProductById);

/**
 * PUT /api/products/:id
 * Update a product
 * Body: any updateable fields
 * Response: { success, message, data }
 */
router.put("/:id", productController.updateProduct);

/**
 * PATCH /api/products/:id/status
 * Update product operational status
 * Body: { status }
 * Response: { success, message, data }
 */
router.patch("/:id/status", productController.updateProductStatus);

/**
 * DELETE /api/products/:id
 * Archive a product (soft delete)
 * Response: { success, message }
 */
router.delete("/:id", productController.deleteProduct);

/**
 * DELETE /api/products/:id/permanent
 * Permanently delete an archived product
 * Response: { success, message, data }
 */
router.delete("/:id/permanent", productController.permanentlyDeleteProduct);

module.exports = router;
