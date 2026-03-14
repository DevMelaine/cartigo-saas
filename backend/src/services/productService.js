/**
 * Product service layer
 * Handles all business logic for product operations
 * Enforces multi-tenant isolation and data integrity
 */

const { PrismaClient } = require("@prisma/client");
const { validateCreateProduct, validateUpdateProduct } = require("../validators/productValidator");

// use shared Prisma client when running under tests (jest.setup.js sets global.prisma)
const prisma = global.prisma || new PrismaClient();

const productSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  costPrice: true,
  stock: true,
  sku: true,
  barcode: true,
  categoryId: true,
  imageUrl: true,
  isActive: true,
  lowStockThreshold: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  },
};

function normalizeCategoryName(category) {
  if (typeof category !== "string") {
    return null;
  }

  const trimmedCategory = category.trim();
  return trimmedCategory.length > 0 ? trimmedCategory : null;
}

async function findOrCreateCategory(organizationId, categoryName) {
  const normalizedCategory = normalizeCategoryName(categoryName);

  if (!normalizedCategory) {
    return null;
  }

  return prisma.category.upsert({
    where: {
      organizationId_name: {
        organizationId,
        name: normalizedCategory,
      },
    },
    update: {},
    create: {
      name: normalizedCategory,
      organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

function mapProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    costPrice: product.costPrice === null || product.costPrice === undefined ? null : Number(product.costPrice),
    stock: product.stock,
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId || product.category?.id || null,
    category: product.category ? product.category.name : null,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    lowStockThreshold: product.lowStockThreshold,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

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

  const normalizedSku = sku.toUpperCase();

  const existingSku = await prisma.product.findFirst({
    where: {
      organizationId,
      sku: normalizedSku,
    },
  });

  if (existingSku) {
    const error = new Error("SKU already exists in your organization");
    error.statusCode = 409;
    throw error;
  }

  const resolvedCategory = await findOrCreateCategory(organizationId, category);

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : null,
      stock: parseInt(stock),
      sku: normalizedSku,
      barcode: barcode?.trim(),
      imageUrl: imageUrl?.trim(),
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null,
      organizationId,
      categoryId: resolvedCategory ? resolvedCategory.id : null,
    },
    select: productSelect,
  });

  return mapProduct(product);
}

/**
 * Get all products for an organization with pagination, filtering, and search
 */
async function getProducts(organizationId, filters = {}) {
  const { page = 1, limit = 10, search, category, sort = "createdAt", order = "desc" } = filters;

  const skip = (page - 1) * limit;
  const normalizedCategory = normalizeCategoryName(category);

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

  if (normalizedCategory) {
    where.category = {
      is: {
        organizationId,
        name: {
          equals: normalizedCategory,
          mode: "insensitive",
        },
      },
    };
  }

  const validSortFields = ["name", "price", "stock", "createdAt", "updatedAt"];
  const sortField = validSortFields.includes(sort) ? sort : "createdAt";
  const sortOrder = order && order.toLowerCase() === "asc" ? "asc" : "desc";

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      select: productSelect,
      orderBy: {
        [sortField]: sortOrder,
      },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: products.map(mapProduct),
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
      isActive: true,
    },
    select: productSelect,
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return mapProduct(product);
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

  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
    select: productSelect,
  });

  if (!existingProduct) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

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

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim();
  if (data.price !== undefined) updateData.price = parseFloat(data.price);
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice ? parseFloat(data.costPrice) : null;
  if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
  if (data.sku !== undefined) updateData.sku = data.sku.toUpperCase();
  if (data.barcode !== undefined) updateData.barcode = data.barcode?.trim();
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl?.trim();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold ? parseInt(data.lowStockThreshold) : null;

  const finalPrice = updateData.price !== undefined ? updateData.price : Number(existingProduct.price);
  const finalCostPrice = updateData.costPrice !== undefined
    ? updateData.costPrice
    : (existingProduct.costPrice === null || existingProduct.costPrice === undefined ? null : Number(existingProduct.costPrice));

  if (finalCostPrice !== null && finalCostPrice > finalPrice) {
    const error = new Error("Cost price cannot be greater than selling price.");
    error.statusCode = 400;
    throw error;
  }

  if (data.category !== undefined) {
    const resolvedCategory = await findOrCreateCategory(organizationId, data.category);
    updateData.categoryId = resolvedCategory ? resolvedCategory.id : null;
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: updateData,
    select: productSelect,
  });

  return mapProduct(product);
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
    select: productSelect,
  });

  return mapProduct(updated);
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

  return products.filter((product) => product.stock <= product.lowStockThreshold);
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
    averagePrice: stats._avg.price ? Number(stats._avg.price) : 0,
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

