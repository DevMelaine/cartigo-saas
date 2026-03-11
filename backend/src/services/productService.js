/**
 * Product service layer
 * Handles all business logic for product operations
 * Enforces multi-tenant isolation and data integrity
 */

const { PrismaClient } = require("@prisma/client");
const { validateCreateProduct, validateUpdateProduct } = require("../validators/productValidator");

// use shared Prisma client when running under tests (jest.setup.js sets global.prisma)
const prisma = global.prisma || new PrismaClient();

/**
 * Create a new product
 * Validates input and enforces SKU uniqueness per organization
 */
async function createProduct(data, organizationId) {
  const { isValid, errors } = validateCreateProduct(data);
  if (!isValid) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  const { name, description, price, costPrice, stock, sku, barcode, category, imageUrl, lowStockThreshold } = data;

  // check if SKU already exists within this organization
  const existingSku = await prisma.product.findFirst({
    where: {
      organizationId,
      sku: sku.toUpperCase(),
    },
  });

  if (existingSku) {
    const error = new Error("SKU already exists in your organization");
    error.statusCode = 409;
    throw error;
  }

  // create the product
  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : null,
      stock: parseInt(stock),
      sku: sku.toUpperCase(),
      barcode: barcode?.trim(),
      category: category?.trim(),
      imageUrl: imageUrl?.trim(),
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null,
      organizationId,
    },
  });

  return product;
}

/**
 * Get all products for an organization with pagination, filtering, and search
 */
async function getProducts(organizationId, filters = {}) {
  const { page = 1, limit = 10, search, category, sort = "createdAt", order = "desc" } = filters;

  const skip = (page - 1) * limit;

  // build where clause
  const where = {
    organizationId,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search.toUpperCase(), mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = { contains: category, mode: "insensitive" };
  }

  // validate sort field to prevent injection
  const validSortFields = ["name", "price", "stock", "createdAt", "updatedAt"];
  const sortField = validSortFields.includes(sort) ? sort : "createdAt";
  const sortOrder = order.toLowerCase() === "asc" ? "asc" : "desc";

  // execute queries in parallel
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        sku: true,
        category: true,
        imageUrl: true,
        lowStockThreshold: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        [sortField]: sortOrder,
      },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Get a single product by ID
 * Ensures it belongs to the requesting organization
 */
async function getProductById(productId, organizationId) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
      isActive: true, // do not expose soft-deleted items
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return product;
}

/**
 * Update a product
 * Ensures it belongs to the organization and validates updated data
 */
async function updateProduct(productId, data, organizationId) {
  const { isValid, errors } = validateUpdateProduct(data);
  if (!isValid) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  // ensure product exists and belongs to organization
  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
  });

  if (!existingProduct) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  // if SKU is being updated, check uniqueness
  if (data.sku && data.sku.toUpperCase() !== existingProduct.sku) {
    const skuExists = await prisma.product.findFirst({
      where: {
        organizationId,
        sku: data.sku.toUpperCase(),
        id: { not: productId },
      },
    });

    if (skuExists) {
      const error = new Error("SKU already exists in your organization");
      error.statusCode = 409;
      throw error;
    }
  }

  // build update object, only include fields that were provided
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim();
  if (data.price !== undefined) updateData.price = parseFloat(data.price);
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice ? parseFloat(data.costPrice) : null;
  if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
  if (data.sku !== undefined) updateData.sku = data.sku.toUpperCase();
  if (data.barcode !== undefined) updateData.barcode = data.barcode?.trim();
  if (data.category !== undefined) updateData.category = data.category?.trim();
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl?.trim();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold ? parseInt(data.lowStockThreshold) : null;

  // additional business rule: cost price cannot exceed selling price
  if (
    updateData.costPrice !== undefined &&
    updateData.price !== undefined &&
    updateData.costPrice > updateData.price
  ) {
    const error = new Error("Cost price cannot be greater than selling price.");
    error.statusCode = 400;
    throw error;
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: updateData,
  });

  return {
  ...product,
  price: parseFloat(product.price),
  costPrice: product.costPrice ? parseFloat(product.costPrice) : null,
};
}

/**
 * Soft delete a product (set isActive to false)
 * Maintains auditability without removing data
 */
async function deleteProduct(productId, organizationId) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });

  return updated;
}

/**
 * Get low stock products for an organization
 * Useful for alerting
 */
async function getLowStockProducts(organizationId, limit = 20) {
  const products = await prisma.product.findMany({
    where: {
      organizationId,
      isActive: true,
      lowStockThreshold: { not: null },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      lowStockThreshold: true,
    },
    orderBy: {
      stock: "asc",
    },
    take: limit,
  });

  // filter products where stock <= threshold
  return products.filter((p) => p.stock <= p.lowStockThreshold);
}

/**
 * Get product statistics for an organization
 */
async function getProductStats(organizationId) {
  const stats = await prisma.product.aggregate({
    where: {
      organizationId,
      isActive: true,
    },
    _count: true,
    _sum: {
      stock: true,
    },
    _avg: {
      price: true,
    },
  });

  return {
    totalProducts: stats._count,
    totalStock: stats._sum.stock || 0,
    averagePrice: stats._avg.price || 0,
  };
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
