/**
 * Product service layer
 * Handles all business logic for product operations
 * Enforces multi-tenant isolation and data integrity
 */

const { PrismaClient, Prisma } = require("@prisma/client");
const {
  validateCreateProduct,
  validateUpdateProduct,
} = require("../validators/productValidator");
const { cleanupRemovedFiles } = require("../modules/storage/storageCleanup.service");
const {
  parseStorageReference,
  resolvePublicFileUrl,
} = require("../modules/storage/storage.service");
const {
  normalizeImageReferenceArray,
  normalizeOptionalImageReference,
} = require("../utils/imageReference");

// use shared Prisma client when running under tests (jest.setup.js sets global.prisma)
const prisma = global.prisma || new PrismaClient();

const SALES_RELEVANT_STATUSES = [
  "PAID",
  "PROCESSING",
  "READY_FOR_DELIVERY",
  "IN_DELIVERY",
  "DELIVERED",
];

const SALES_RELEVANT_STATUS_SQL = Prisma.join(
  SALES_RELEVANT_STATUSES.map((status) => Prisma.sql`${status}::"OrderStatus"`)
);

const EMPTY_PERFORMANCE_BENCHMARKS = Object.freeze({
  averageSales: 0,
  averageRevenue: 0,
  activeSellingProducts: 0,
  totalSales: 0,
  revenueGenerated: 0,
  topPerformers: 0,
  idleProducts: 0,
});

const EMPTY_PRODUCT_SALES_METRICS = Object.freeze({
  totalSales: 0,
  revenueGenerated: 0,
});

const PRODUCT_LIFECYCLE_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ARCHIVED: "ARCHIVED",
});

const PRODUCT_STATUS_FILTER_MAP = Object.freeze({
  active: PRODUCT_LIFECYCLE_STATUSES.ACTIVE,
  draft: PRODUCT_LIFECYCLE_STATUSES.DRAFT,
  paused: PRODUCT_LIFECYCLE_STATUSES.PAUSED,
  archived: PRODUCT_LIFECYCLE_STATUSES.ARCHIVED,
});

const PRODUCT_STATUS_TRANSITIONS = Object.freeze({
  [PRODUCT_LIFECYCLE_STATUSES.DRAFT]: new Set([
    PRODUCT_LIFECYCLE_STATUSES.ACTIVE,
    PRODUCT_LIFECYCLE_STATUSES.ARCHIVED,
  ]),
  [PRODUCT_LIFECYCLE_STATUSES.ACTIVE]: new Set([
    PRODUCT_LIFECYCLE_STATUSES.PAUSED,
    PRODUCT_LIFECYCLE_STATUSES.ARCHIVED,
  ]),
  [PRODUCT_LIFECYCLE_STATUSES.PAUSED]: new Set([
    PRODUCT_LIFECYCLE_STATUSES.ACTIVE,
    PRODUCT_LIFECYCLE_STATUSES.ARCHIVED,
  ]),
  [PRODUCT_LIFECYCLE_STATUSES.ARCHIVED]: new Set([
    PRODUCT_LIFECYCLE_STATUSES.DRAFT,
  ]),
});

const productSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  costPrice: true,
  stock: true,
  sku: true,
  barcode: true,
  status: true,
  categoryId: true,
  imageUrl: true,
  galleryImages: true,
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

function normalizeOptionalUuid(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isPublishedProductStatus(status) {
  return status === PRODUCT_LIFECYCLE_STATUSES.ACTIVE;
}

function normalizeLifecycleStatus(status) {
  if (typeof status !== "string") {
    return null;
  }

  const normalizedStatus = status.trim().toUpperCase();
  return Object.values(PRODUCT_LIFECYCLE_STATUSES).includes(normalizedStatus)
    ? normalizedStatus
    : null;
}

function resolveProductStatusFilter(status) {
  if (status === undefined || status === null || status === "") {
    return PRODUCT_STATUS_FILTER_MAP.active;
  }

  if (status === "all") {
    return undefined;
  }

  return PRODUCT_STATUS_FILTER_MAP[status] || undefined;
}

function assertValidProductStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = PRODUCT_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions || !allowedTransitions.has(nextStatus)) {
    throw createError(
      `Invalid product status transition from ${currentStatus} to ${nextStatus}.`,
      400
    );
  }
}

function parseMetricNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function createError(message, statusCode = 400, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

async function ensureProductCategory(categoryId, organizationId) {
  const normalizedCategoryId = normalizeOptionalUuid(categoryId);

  if (!normalizedCategoryId) {
    throw createError("Product category is required.", 400);
  }

  const category = await prisma.category.findFirst({
    where: {
      id: normalizedCategoryId,
      organizationId,
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });

  if (!category) {
    throw createError("Invalid product category.", 400);
  }

  return category;
}

function classifyProductPerformance(salesMetrics, benchmarks) {
  if (!salesMetrics.totalSales && !salesMetrics.revenueGenerated) {
    return "idle";
  }

  if (benchmarks.activeSellingProducts <= 1) {
    return "top";
  }

  const salesBenchmark = Math.max(1, benchmarks.averageSales);
  const revenueBenchmark = Math.max(1, benchmarks.averageRevenue);

  if (
    salesMetrics.totalSales >= salesBenchmark * 1.5 ||
    salesMetrics.revenueGenerated >= revenueBenchmark * 1.5
  ) {
    return "top";
  }

  if (
    salesMetrics.totalSales >= salesBenchmark * 0.75 ||
    salesMetrics.revenueGenerated >= revenueBenchmark * 0.75
  ) {
    return "steady";
  }

  return "emerging";
}

function mapProduct(product, options = {}) {
  const salesMetrics = options.salesMetrics || EMPTY_PRODUCT_SALES_METRICS;
  const performanceBenchmarks =
    options.performanceBenchmarks || EMPTY_PERFORMANCE_BENCHMARKS;
  const imageUrl = resolvePublicFileUrl(product.imageUrl);
  const galleryImages = (product.galleryImages || [])
    .map((image) => resolvePublicFileUrl(image))
    .filter(Boolean);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    costPrice:
      product.costPrice === null || product.costPrice === undefined
        ? null
        : Number(product.costPrice),
    stock: product.stock,
    sku: product.sku,
    barcode: product.barcode,
    status:
      normalizeLifecycleStatus(product.status) ||
      (product.isActive
        ? PRODUCT_LIFECYCLE_STATUSES.ACTIVE
        : PRODUCT_LIFECYCLE_STATUSES.ARCHIVED),
    categoryId: product.categoryId || product.category?.id || null,
    category: product.category ? product.category.name : null,
    imageUrl,
    galleryImages,
    isActive: isPublishedProductStatus(
      normalizeLifecycleStatus(product.status) ||
        (product.isActive
          ? PRODUCT_LIFECYCLE_STATUSES.ACTIVE
          : PRODUCT_LIFECYCLE_STATUSES.ARCHIVED)
    ),
    lowStockThreshold: product.lowStockThreshold,
    totalSales: salesMetrics.totalSales,
    revenueGenerated: salesMetrics.revenueGenerated,
    performanceIndicator: classifyProductPerformance(
      salesMetrics,
      performanceBenchmarks
    ),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function safelyResolvePublicFileUrl(path, context) {
  const normalizedPath = normalizeOptionalImageReference(path);

  if (!normalizedPath) {
    return null;
  }

  const publicUrl = resolvePublicFileUrl(normalizedPath);

  if (!publicUrl) {
    console.warn(
      `STORAGE_PUBLIC_URL_FAILED context=${context} path=${normalizedPath}`
    );
  }

  return publicUrl;
}

async function mapProductWithMedia(product, options = {}) {
  const mappedProduct = mapProduct(product, options);
  const { includeGalleryPreviewUrls = false } = options;

  const imagePreviewUrl = safelyResolvePublicFileUrl(
    mappedProduct.imageUrl,
    `product=${mappedProduct.id} main`
  );
  const galleryPreviewUrls = includeGalleryPreviewUrls
    ? (mappedProduct.galleryImages || [])
        .map((path) =>
          safelyResolvePublicFileUrl(path, `product=${mappedProduct.id} gallery`)
        )
        .filter(Boolean)
    : [];

  return {
    ...mappedProduct,
    imagePreviewUrl,
    galleryPreviewUrls,
  };
}

function getProductAssetPrefixes(organizationId) {
  return [`products/${organizationId}/`];
}

function ensureProductAssetPath(path, organizationId) {
  const normalizedPath = normalizeOptionalImageReference(path);
  const allowedPrefixes = getProductAssetPrefixes(organizationId);

  if (normalizedPath === undefined || normalizedPath === null) {
    return normalizedPath;
  }

  if (!allowedPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
    let parsedReference;

    try {
      parsedReference = parseStorageReference(normalizedPath);
    } catch {
      console.warn(
        `STORAGE_PATH_SUSPICIOUS context=product-update organization=${organizationId} path=${normalizedPath}`
      );
      throw createError("Invalid product image path.", 400);
    }

    if (
      !allowedPrefixes.some((prefix) => parsedReference.storedPath.startsWith(prefix))
    ) {
      console.warn(
        `STORAGE_PATH_SUSPICIOUS context=product-update organization=${organizationId} path=${normalizedPath}`
      );
      throw createError("Invalid product image path.", 400);
    }

    return parsedReference.publicUrl;
  }

  try {
    return parseStorageReference(normalizedPath).publicUrl;
  } catch {
    console.warn(
      `STORAGE_PATH_SUSPICIOUS context=product-update organization=${organizationId} path=${normalizedPath}`
    );
    throw createError("Invalid product image path.", 400);
  }
}

function ensureProductGalleryPaths(paths, organizationId) {
  const normalizedGallery = normalizeImageReferenceArray(paths);

  if (!Array.isArray(normalizedGallery)) {
    return normalizedGallery;
  }

  return normalizedGallery.map((path) =>
    ensureProductAssetPath(path, organizationId)
  );
}

function toComparableImageReference(reference) {
  const normalizedReference = normalizeOptionalImageReference(reference);

  if (!normalizedReference) {
    return normalizedReference;
  }

  try {
    return parseStorageReference(normalizedReference).storedPath;
  } catch {
    return normalizedReference;
  }
}

function areEquivalentImageReferences(left, right) {
  return toComparableImageReference(left) === toComparableImageReference(right);
}

function toComparableImageReferenceSet(references) {
  return new Set(
    (references || [])
      .map((reference) => toComparableImageReference(reference))
      .filter(Boolean)
  );
}

function buildImageReferenceCandidates(reference) {
  const normalizedReference = normalizeOptionalImageReference(reference);

  if (!normalizedReference) {
    return [];
  }

  const candidates = new Set([normalizedReference]);

  try {
    const parsedReference = parseStorageReference(normalizedReference);
    candidates.add(parsedReference.storedPath);
    candidates.add(parsedReference.publicUrl);
  } catch {
    // Keep the original reference candidate when it cannot be parsed.
  }

  return Array.from(candidates);
}

async function isProductAssetStillReferenced(reference, organizationId) {
  const candidates = buildImageReferenceCandidates(reference);

  if (candidates.length === 0) {
    return false;
  }

  const existingReference = await prisma.product.findFirst({
    where: {
      organizationId,
      OR: candidates.flatMap((candidate) => [
        { imageUrl: candidate },
        { galleryImages: { has: candidate } },
      ]),
    },
    select: {
      id: true,
    },
  });

  return Boolean(existingReference);
}

async function getProductSalesMetrics(organizationId, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        oi."productId" AS "productId",
        COALESCE(SUM(oi.quantity), 0)::int AS "totalSales",
        COALESCE(SUM(oi.quantity * oi.price), 0)::text AS "revenueGenerated"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."organizationId" = ${organizationId}
        AND o."status" IN (${SALES_RELEVANT_STATUS_SQL})
        AND oi."productId" IN (${Prisma.join(productIds)})
      GROUP BY oi."productId"
    `
  );

  return new Map(
    rows.map((row) => [
      row.productId,
      {
        totalSales: parseMetricNumber(row.totalSales),
        revenueGenerated: parseMetricNumber(row.revenueGenerated),
      },
    ])
  );
}

async function getPerformanceBenchmarks(organizationId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        oi."productId" AS "productId",
        COALESCE(SUM(oi.quantity), 0)::int AS "totalSales",
        COALESCE(SUM(oi.quantity * oi.price), 0)::text AS "revenueGenerated"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o.id = oi."orderId"
      INNER JOIN "Product" p ON p.id = oi."productId"
      WHERE o."organizationId" = ${organizationId}
        AND o."status" IN (${SALES_RELEVANT_STATUS_SQL})
        AND p."organizationId" = ${organizationId}
        AND p."status" = 'ACTIVE'::"ProductLifecycleStatus"
      GROUP BY oi."productId"
    `
  );

  const aggregates = rows.map((row) => ({
    totalSales: parseMetricNumber(row.totalSales),
    revenueGenerated: parseMetricNumber(row.revenueGenerated),
  }));

  const activeSellingProducts = aggregates.length;
  const totalSales = aggregates.reduce(
    (sum, metric) => sum + metric.totalSales,
    0
  );
  const revenueGenerated = aggregates.reduce(
    (sum, metric) => sum + metric.revenueGenerated,
    0
  );
  const averageSales = activeSellingProducts > 0 ? totalSales / activeSellingProducts : 0;
  const averageRevenue =
    activeSellingProducts > 0 ? revenueGenerated / activeSellingProducts : 0;

  const benchmarks = {
    averageSales,
    averageRevenue,
    activeSellingProducts,
    totalSales,
    revenueGenerated,
    topPerformers: 0,
    idleProducts: 0,
  };

  benchmarks.topPerformers = aggregates.filter(
    (metric) => classifyProductPerformance(metric, benchmarks) === "top"
  ).length;

  return benchmarks;
}

async function getRankedProductMetrics(organizationId, limit = 5) {
  return prisma.$queryRaw(
    Prisma.sql`
      SELECT
        p."id" AS "productId",
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0)::int AS "totalSales",
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity * oi.price ELSE 0 END), 0)::text AS "revenueGenerated"
      FROM "Product" p
      LEFT JOIN "OrderItem" oi ON oi."productId" = p."id"
      LEFT JOIN "Order" o
        ON o."id" = oi."orderId"
        AND o."organizationId" = ${organizationId}
        AND o."status" IN (${SALES_RELEVANT_STATUS_SQL})
      WHERE p."organizationId" = ${organizationId}
        AND p."status" = 'ACTIVE'::"ProductLifecycleStatus"
      GROUP BY p."id", p."updatedAt"
      ORDER BY
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity * oi.price ELSE 0 END), 0) DESC,
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0) DESC,
        p."updatedAt" DESC
      LIMIT ${limit}
    `
  );
}

async function getLowStockProductIds(organizationId, productStatus) {
  const statusFilter = resolveProductStatusFilter(productStatus);
  const statusCondition =
    statusFilter === undefined
      ? Prisma.empty
      : Prisma.sql`AND p."status" = ${statusFilter}::"ProductLifecycleStatus"`;

  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT p."id" AS "id"
      FROM "Product" p
      WHERE p."organizationId" = ${organizationId}
        ${statusCondition}
        AND p."lowStockThreshold" IS NOT NULL
        AND p."stock" <= p."lowStockThreshold"
    `
  );

  return rows.map((row) => row.id);
}

async function getLowStockCount(organizationId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM "Product" p
      WHERE p."organizationId" = ${organizationId}
        AND p."status" = 'ACTIVE'::"ProductLifecycleStatus"
        AND p."lowStockThreshold" IS NOT NULL
        AND p."stock" <= p."lowStockThreshold"
    `
  );

  return parseMetricNumber(rows[0]?.count);
}

function buildProductWhereClause(organizationId, filters = {}) {
  const {
    search,
    category,
    categoryId,
    minPrice,
    maxPrice,
    stockState,
    status,
  } = filters;

  const where = {
    organizationId,
  };

  const normalizedStatus = resolveProductStatusFilter(status);
  if (normalizedStatus !== undefined) {
    where.status = normalizedStatus;
  }

  const normalizedSearch = normalizeOptionalText(search);
  if (normalizedSearch) {
    where.OR = [
      { name: { contains: normalizedSearch, mode: "insensitive" } },
      {
        sku: {
          contains: normalizedSearch.toUpperCase(),
          mode: "insensitive",
        },
      },
      { barcode: { contains: normalizedSearch, mode: "insensitive" } },
    ];
  }

  const normalizedCategoryId = normalizeOptionalUuid(categoryId);
  if (normalizedCategoryId) {
    where.categoryId = normalizedCategoryId;
  } else {
    const normalizedCategory = normalizeCategoryName(category);
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
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};

    if (minPrice !== undefined) {
      where.price.gte = minPrice;
    }

    if (maxPrice !== undefined) {
      where.price.lte = maxPrice;
    }
  }

  if (stockState === "out_of_stock") {
    where.stock = {
      equals: 0,
    };
  } else if (stockState === "in_stock") {
    where.stock = {
      gt: 0,
    };
  }

  return where;
}

async function enrichProductsWithMetrics(products, organizationId, options = {}) {
  const performanceBenchmarks =
    options.performanceBenchmarks || (await getPerformanceBenchmarks(organizationId));
  const salesMetricsMap =
    options.salesMetricsMap ||
    (await getProductSalesMetrics(
      organizationId,
      products.map((product) => product.id)
    ));

  return Promise.all(
    products.map((product) =>
      mapProductWithMedia(product, {
        includeGalleryPreviewUrls: options.includeGalleryPreviewUrls,
        salesMetrics:
          salesMetricsMap.get(product.id) || EMPTY_PRODUCT_SALES_METRICS,
        performanceBenchmarks,
      })
    )
  );
}

/**
 * Create a new product
 * Validates input and enforces SKU uniqueness per organization
 */
async function createProduct(data, organizationId) {
  const { isValid, errors } = validateCreateProduct(data);
  if (!isValid) {
    throw createError("Validation failed", 400, errors);
  }

  const {
    name,
    description,
    price,
    costPrice,
    stock,
    sku,
    barcode,
    categoryId,
    imageUrl,
    galleryImages,
    lowStockThreshold,
    status,
  } = data;

  const normalizedSku = sku.toUpperCase();

  const existingSku = await prisma.product.findFirst({
    where: {
      organizationId,
      sku: normalizedSku,
    },
  });

  if (existingSku) {
    throw createError("SKU already exists in your organization", 409);
  }

  const resolvedCategory = await ensureProductCategory(categoryId, organizationId);
  const resolvedStatus =
    normalizeLifecycleStatus(status) || PRODUCT_LIFECYCLE_STATUSES.ACTIVE;

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : null,
      stock: parseInt(stock),
      sku: normalizedSku,
      barcode: barcode?.trim(),
      imageUrl: ensureProductAssetPath(imageUrl, organizationId),
      galleryImages: ensureProductGalleryPaths(galleryImages || [], organizationId),
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null,
      organizationId,
      status: resolvedStatus,
      isActive: isPublishedProductStatus(resolvedStatus),
      categoryId: resolvedCategory.id,
    },
    select: productSelect,
  });

  return mapProductWithMedia(product, {
    includeGalleryPreviewUrls: true,
    salesMetrics: EMPTY_PRODUCT_SALES_METRICS,
    performanceBenchmarks: EMPTY_PERFORMANCE_BENCHMARKS,
  });
}

/**
 * Get all products for an organization with pagination, filtering, and search
 */
async function getProducts(organizationId, filters = {}) {
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
    stockState,
    status = "active",
  } = filters;

  const skip = (page - 1) * limit;
  const where = buildProductWhereClause(organizationId, filters);

  if (stockState === "low_stock") {
    const lowStockIds = await getLowStockProductIds(organizationId, status);

    if (lowStockIds.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    where.id = {
      in: lowStockIds,
    };
  }

  const validSortFields = ["name", "price", "stock", "createdAt", "updatedAt"];
  const sortField = validSortFields.includes(sort) ? sort : "createdAt";
  const sortOrder = order && order.toLowerCase() === "asc" ? "asc" : "desc";

  const [products, total, performanceBenchmarks] = await Promise.all([
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
    getPerformanceBenchmarks(organizationId),
  ]);

  const totalPages = Math.ceil(total / limit);
  const salesMetricsMap = await getProductSalesMetrics(
    organizationId,
    products.map((product) => product.id)
  );

  return {
    data: await enrichProductsWithMetrics(products, organizationId, {
      salesMetricsMap,
      performanceBenchmarks,
    }),
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
    },
    select: productSelect,
  });

  if (!product) {
    throw createError("Product not found", 404);
  }

  const [performanceBenchmarks, salesMetricsMap] = await Promise.all([
    getPerformanceBenchmarks(organizationId),
    getProductSalesMetrics(organizationId, [productId]),
  ]);

  return mapProductWithMedia(product, {
    includeGalleryPreviewUrls: true,
    salesMetrics: salesMetricsMap.get(productId) || EMPTY_PRODUCT_SALES_METRICS,
    performanceBenchmarks,
  });
}

/**
 * Update a product
 * Ensures it belongs to the organization and validates updated data
 */
async function updateProduct(productId, data, organizationId) {
  const { isValid, errors } = validateUpdateProduct(data);
  if (!isValid) {
    throw createError("Validation failed", 400, errors);
  }

  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
    select: productSelect,
  });

  if (!existingProduct) {
    throw createError("Product not found", 404);
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
      throw createError("SKU already exists in your organization", 409);
    }
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim();
  if (data.price !== undefined) updateData.price = parseFloat(data.price);
  if (data.costPrice !== undefined) {
    updateData.costPrice = data.costPrice ? parseFloat(data.costPrice) : null;
  }
  if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
  if (data.sku !== undefined) updateData.sku = data.sku.toUpperCase();
  if (data.barcode !== undefined) updateData.barcode = data.barcode?.trim();
  if (data.imageUrl !== undefined) {
    updateData.imageUrl =
      data.imageUrl === null
        ? null
        : ensureProductAssetPath(data.imageUrl, organizationId);
  }
  if (data.galleryImages !== undefined) {
    updateData.galleryImages = ensureProductGalleryPaths(data.galleryImages, organizationId);
  }
  if (data.lowStockThreshold !== undefined) {
    updateData.lowStockThreshold = data.lowStockThreshold
      ? parseInt(data.lowStockThreshold)
      : null;
  }

  const finalPrice =
    updateData.price !== undefined ? updateData.price : Number(existingProduct.price);
  const finalCostPrice =
    updateData.costPrice !== undefined
      ? updateData.costPrice
      : existingProduct.costPrice === null || existingProduct.costPrice === undefined
        ? null
        : Number(existingProduct.costPrice);

  if (finalCostPrice !== null && finalCostPrice > finalPrice) {
    throw createError("Cost price cannot be greater than selling price.", 400);
  }

  if (data.categoryId !== undefined) {
    const resolvedCategory = await ensureProductCategory(data.categoryId, organizationId);
    updateData.categoryId = resolvedCategory.id;
  }

  if (data.status !== undefined) {
    const nextStatus = normalizeLifecycleStatus(data.status);

    if (!nextStatus) {
      throw createError("Invalid product status.", 400);
    }

    const currentStatus =
      normalizeLifecycleStatus(existingProduct.status) ||
      (existingProduct.isActive
        ? PRODUCT_LIFECYCLE_STATUSES.ACTIVE
        : PRODUCT_LIFECYCLE_STATUSES.ARCHIVED);

    assertValidProductStatusTransition(currentStatus, nextStatus);
    updateData.status = nextStatus;
    updateData.isActive = isPublishedProductStatus(nextStatus);
  } else if (data.isActive !== undefined) {
    const nextStatus = data.isActive
      ? PRODUCT_LIFECYCLE_STATUSES.ACTIVE
      : PRODUCT_LIFECYCLE_STATUSES.PAUSED;
    const currentStatus =
      normalizeLifecycleStatus(existingProduct.status) ||
      (existingProduct.isActive
        ? PRODUCT_LIFECYCLE_STATUSES.ACTIVE
        : PRODUCT_LIFECYCLE_STATUSES.ARCHIVED);

    assertValidProductStatusTransition(currentStatus, nextStatus);
    updateData.status = nextStatus;
    updateData.isActive = isPublishedProductStatus(nextStatus);
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: updateData,
    select: productSelect,
  });

  const removedPaths = [];

  if (
    data.imageUrl !== undefined &&
    existingProduct.imageUrl &&
    !areEquivalentImageReferences(existingProduct.imageUrl, product.imageUrl)
  ) {
    removedPaths.push(existingProduct.imageUrl);
  }

  if (data.galleryImages !== undefined) {
    const nextGalleryImages = toComparableImageReferenceSet(product.galleryImages || []);

    for (const existingGalleryImage of existingProduct.galleryImages || []) {
      if (!nextGalleryImages.has(toComparableImageReference(existingGalleryImage))) {
        removedPaths.push(existingGalleryImage);
      }
    }
  }

  await cleanupRemovedFiles(removedPaths, {
    allowedPrefixes: getProductAssetPrefixes(organizationId),
    shouldDelete: async (path) =>
      !(await isProductAssetStillReferenced(path, organizationId)),
    context: `product=${productId} organization=${organizationId}`,
  });

  const [performanceBenchmarks, salesMetricsMap] = await Promise.all([
    getPerformanceBenchmarks(organizationId),
    getProductSalesMetrics(organizationId, [productId]),
  ]);

  return mapProductWithMedia(product, {
    includeGalleryPreviewUrls: true,
    salesMetrics: salesMetricsMap.get(productId) || EMPTY_PRODUCT_SALES_METRICS,
    performanceBenchmarks,
  });
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
    throw createError("Product not found", 404);
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      status: PRODUCT_LIFECYCLE_STATUSES.ARCHIVED,
      isActive: false,
    },
    select: productSelect,
  });

  const [performanceBenchmarks, salesMetricsMap] = await Promise.all([
    getPerformanceBenchmarks(organizationId),
    getProductSalesMetrics(organizationId, [productId]),
  ]);

  return mapProductWithMedia(updated, {
    includeGalleryPreviewUrls: true,
    salesMetrics: salesMetricsMap.get(productId) || EMPTY_PRODUCT_SALES_METRICS,
    performanceBenchmarks,
  });
}

async function permanentlyDeleteProduct(productId, organizationId) {
  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
    select: productSelect,
  });

  if (!existingProduct) {
    throw createError("Product not found", 404);
  }

  const currentStatus =
    normalizeLifecycleStatus(existingProduct.status) ||
    (existingProduct.isActive
      ? PRODUCT_LIFECYCLE_STATUSES.ACTIVE
      : PRODUCT_LIFECYCLE_STATUSES.ARCHIVED);

  if (currentStatus !== PRODUCT_LIFECYCLE_STATUSES.ARCHIVED) {
    throw createError("Only archived products can be deleted permanently.", 400);
  }

  const [orderItemCount, cartItemCount] = await Promise.all([
    prisma.orderItem.count({
      where: {
        productId,
      },
    }),
    prisma.cartItem.count({
      where: {
        productId,
      },
    }),
  ]);

  if (orderItemCount > 0 || cartItemCount > 0) {
    throw createError(
      "This archived product cannot be deleted permanently because it is still referenced.",
      409
    );
  }

  const deletedProduct = await prisma.product.delete({
    where: {
      id: productId,
    },
    select: productSelect,
  });

  await cleanupRemovedFiles(
    [
      deletedProduct.imageUrl,
      ...(deletedProduct.galleryImages || []),
    ],
    {
      allowedPrefixes: getProductAssetPrefixes(organizationId),
      shouldDelete: async (path) =>
        !(await isProductAssetStillReferenced(path, organizationId)),
      context: `product=${productId} organization=${organizationId} permanent-delete`,
    }
  );

  return {
    id: deletedProduct.id,
  };
}

async function updateProductStatus(productId, nextStatus, organizationId) {
  const normalizedNextStatus = normalizeLifecycleStatus(nextStatus);

  if (!normalizedNextStatus) {
    throw createError("Invalid product status.", 400);
  }

  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
    select: productSelect,
  });

  if (!existingProduct) {
    throw createError("Product not found", 404);
  }

  const currentStatus =
    normalizeLifecycleStatus(existingProduct.status) ||
    (existingProduct.isActive
      ? PRODUCT_LIFECYCLE_STATUSES.ACTIVE
      : PRODUCT_LIFECYCLE_STATUSES.ARCHIVED);

  assertValidProductStatusTransition(currentStatus, normalizedNextStatus);

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: {
      status: normalizedNextStatus,
      isActive: isPublishedProductStatus(normalizedNextStatus),
    },
    select: productSelect,
  });

  const [performanceBenchmarks, salesMetricsMap] = await Promise.all([
    getPerformanceBenchmarks(organizationId),
    getProductSalesMetrics(organizationId, [productId]),
  ]);

  return mapProductWithMedia(updatedProduct, {
    includeGalleryPreviewUrls: true,
    salesMetrics: salesMetricsMap.get(productId) || EMPTY_PRODUCT_SALES_METRICS,
    performanceBenchmarks,
  });
}

/**
 * Get low stock products for an organization
 * Useful for alerting
 */
async function getLowStockProducts(organizationId, limit = 20) {
  const products = await prisma.product.findMany({
    where: {
      organizationId,
      status: PRODUCT_LIFECYCLE_STATUSES.ACTIVE,
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

async function getTopPerformingProducts(organizationId, limit = 5) {
  const rankedRows = await getRankedProductMetrics(organizationId, limit);
  const productIds = rankedRows.map((row) => row.productId);

  if (productIds.length === 0) {
    return [];
  }

  const [performanceBenchmarks, products] = await Promise.all([
    getPerformanceBenchmarks(organizationId),
    prisma.product.findMany({
      where: {
        organizationId,
        id: {
          in: productIds,
        },
      },
      select: productSelect,
    }),
  ]);

  const productMap = new Map(products.map((product) => [product.id, product]));

  return Promise.all(
    rankedRows
      .map((row) => {
        const product = productMap.get(row.productId);
        if (!product) {
          return null;
        }

        return mapProductWithMedia(product, {
          salesMetrics: {
            totalSales: parseMetricNumber(row.totalSales),
            revenueGenerated: parseMetricNumber(row.revenueGenerated),
          },
          performanceBenchmarks,
        });
      })
      .filter(Boolean)
  );
}

/**
 * Get product statistics for an organization
 */
async function getProductStats(organizationId) {
  const [catalogStats, performanceBenchmarks, lowStockCount] = await Promise.all([
    prisma.product.aggregate({
      where: {
        organizationId,
        status: PRODUCT_LIFECYCLE_STATUSES.ACTIVE,
      },
      _count: true,
      _sum: {
        stock: true,
      },
      _avg: {
        price: true,
      },
    }),
    getPerformanceBenchmarks(organizationId),
    getLowStockCount(organizationId),
  ]);

  return {
    totalProducts: catalogStats._count,
    totalStock: catalogStats._sum.stock || 0,
    averagePrice: catalogStats._avg.price ? Number(catalogStats._avg.price) : 0,
    totalSales: performanceBenchmarks.totalSales,
    revenueGenerated: performanceBenchmarks.revenueGenerated,
    activeSellingProducts: performanceBenchmarks.activeSellingProducts,
    topPerformers: performanceBenchmarks.topPerformers,
    lowStockCount,
    idleProducts: Math.max(
      0,
      catalogStats._count - performanceBenchmarks.activeSellingProducts
    ),
  };
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  permanentlyDeleteProduct,
  getLowStockProducts,
  getTopPerformingProducts,
  getProductStats,
};
