/**
 * Product controller layer
 * Handles HTTP requests/responses and calls service layer
 * Applies role-based authorization
 */

const productService = require("../services/productService");
const { validatePaginationParams } = require("../validators/productValidator");

/**
 * POST /api/products
 * Create a new product
 * Only ADMIN and MANAGER roles allowed
 */
async function createProduct(req, res) {
  try {
    // role-based authorization
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to create products.",
      });
    }

    const product = await productService.createProduct(req.body, req.user.organizationId);

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: product,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "An error occurred while creating the product.",
      errors: err.details || undefined,
    });
  }
}

/**
 * GET /api/products
 * Get all products with pagination, filtering, and search
 * All authenticated users can view products
 */
async function getProducts(req, res) {
  try {
    // validate pagination parameters
    const { isValid, errors, page, limit } = validatePaginationParams(req.query);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
        errors,
      });
    }

    const filters = {
      page,
      limit,
      search: req.query.search,
      category: req.query.category,
      sort: req.query.sort,
      order: req.query.order,
    };

    const result = await productService.getProducts(req.user.organizationId, filters);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "An error occurred while fetching products.",
    });
  }
}

/**
 * GET /api/products/:id
 * Get a single product by ID
 * All authenticated users can view products
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const product = await productService.getProductById(id, req.user.organizationId);

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "An error occurred while fetching the product.",
    });
  }
}

/**
 * PUT /api/products/:id
 * Update a product
 * Only ADMIN and MANAGER roles allowed
 */
async function updateProduct(req, res) {
  try {
    // role-based authorization
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update products.",
      });
    }

    const { id } = req.params;

    const product = await productService.updateProduct(id, req.body, req.user.organizationId);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: product,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "An error occurred while updating the product.",
      errors: err.details || undefined,
    });
  }
}

/**
 * DELETE /api/products/:id
 * Soft delete a product (set isActive to false)
 * Only ADMIN and MANAGER roles allowed
 */
async function deleteProduct(req, res) {
  try {
    // role-based authorization
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete products.",
      });
    }

    const { id } = req.params;

    await productService.deleteProduct(id, req.user.organizationId);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "An error occurred while deleting the product.",
    });
  }
}

/**
 * GET /api/products/stats/low-stock
 * Get low stock products
 * Only ADMIN and MANAGER roles allowed
 */
async function getLowStockProducts(req, res) {
  try {
    // role-based authorization
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this data.",
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100.",
      });
    }

    const products = await productService.getLowStockProducts(req.user.organizationId, limit);

    return res.status(200).json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "An error occurred while fetching low stock products.",
    });
  }
}

/**
 * GET /api/products/stats/overview
 * Get product statistics
 * Only ADMIN and MANAGER roles allowed
 */
async function getProductStats(req, res) {
  try {
    // role-based authorization
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this data.",
      });
    }

    const stats = await productService.getProductStats(req.user.organizationId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "An error occurred while fetching product statistics.",
    });
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductStats,
};
