import { z } from "zod";

import { apiRequest, apiRequestRaw } from "@/services/api";
import type {
  CreateProductInput,
  Product,
  ProductCategoryOption,
  ProductLowStockItem,
  ProductListParams,
  ProductListResponse,
  ProductOperationalStatus,
  ProductSortField,
  ProductStats,
  ProductStockFilter,
  ProductStatusFilter,
  SortOrder,
  UpdateProductInput,
} from "@/types/product";

const SORT_FIELDS = ["createdAt", "updatedAt", "name", "price", "stock"] as const satisfies readonly ProductSortField[];
const SORT_ORDERS = ["asc", "desc"] as const satisfies readonly SortOrder[];
const STOCK_FILTERS = ["all", "in_stock", "out_of_stock", "low_stock"] as const satisfies readonly ProductStockFilter[];
const STATUS_FILTERS = ["active", "draft", "paused", "archived", "all"] as const satisfies readonly ProductStatusFilter[];
const PRODUCT_OPERATIONAL_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const satisfies readonly ProductOperationalStatus[];

const optionalTextField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const optionalNumericField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value.toString() : undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const imagePathField = z
  .union([z.string().trim().min(1), z.null(), z.undefined()])
  .optional();

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.coerce.number(),
  costPrice: z.coerce.number().nullable(),
  stock: z.number().int().nonnegative(),
  sku: z.string().min(1),
  barcode: z.string().nullable(),
  status: z.enum(PRODUCT_OPERATIONAL_STATUSES),
  categoryId: z.string().nullable(),
  category: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imagePreviewUrl: z.string().nullable().optional().default(null),
  galleryImages: z.array(z.string()).default([]),
  galleryPreviewUrls: z.array(z.string()).optional().default([]),
  isActive: z.boolean(),
  lowStockThreshold: z.number().int().nonnegative().nullable(),
  totalSales: z.number().int().nonnegative(),
  revenueGenerated: z.coerce.number(),
  performanceIndicator: z.enum(["top", "steady", "emerging", "idle"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const productPaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const productListEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(productSchema),
  pagination: productPaginationSchema,
});

const productStatsSchema = z.object({
  totalProducts: z.number().int().nonnegative(),
  totalStock: z.number().int().nonnegative(),
  averagePrice: z.coerce.number(),
  totalSales: z.number().int().nonnegative(),
  revenueGenerated: z.coerce.number(),
  activeSellingProducts: z.number().int().nonnegative(),
  topPerformers: z.number().int().nonnegative(),
  lowStockCount: z.number().int().nonnegative(),
  idleProducts: z.number().int().nonnegative(),
});

const lowStockProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(1),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().nullable(),
});

const lowStockProductsEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(lowStockProductSchema),
  count: z.number().int().nonnegative(),
});

const topPerformersEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(productSchema),
  count: z.number().int().nonnegative(),
});

const deletedProductEnvelopeSchema = z.object({
  id: z.string().min(1),
});

const categoryOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const categoryListSchema = z.object({
  data: z.array(categoryOptionSchema),
  total: z.number().int().nonnegative().optional().default(0),
  skip: z.number().int().nonnegative().optional().default(0),
  take: z.number().int().positive().optional().default(0),
});

const createProductInputSchema = z.object({
  name: z.string().trim().min(2).max(255),
  description: optionalTextField,
  price: z.union([z.string(), z.number()]).transform((value) => String(value).trim()),
  costPrice: optionalNumericField,
  stock: z.union([z.string(), z.number()]).transform((value) => String(value).trim()),
  sku: z.string().trim().min(1).max(100),
  barcode: optionalTextField,
  categoryId: z.string().uuid(),
  status: z.enum(PRODUCT_OPERATIONAL_STATUSES).optional(),
  imageUrl: imagePathField,
  galleryImages: z.array(z.string().trim().min(1)).optional().default([]),
  lowStockThreshold: optionalNumericField,
});

const updateProductInputSchema = createProductInputSchema
  .partial()
  .extend({
    imageUrl: imagePathField,
    isActive: z.boolean().optional(),
    status: z.enum(PRODUCT_OPERATIONAL_STATUSES).optional(),
  });

function buildSearchParams(params: ProductListParams) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.category?.trim()) {
    searchParams.set("category", params.category.trim());
  }

  if (params.categoryId?.trim()) {
    searchParams.set("categoryId", params.categoryId.trim());
  }

  if (typeof params.minPrice === "number" && Number.isFinite(params.minPrice)) {
    searchParams.set("minPrice", String(params.minPrice));
  }

  if (typeof params.maxPrice === "number" && Number.isFinite(params.maxPrice)) {
    searchParams.set("maxPrice", String(params.maxPrice));
  }

  if (params.stockState && STOCK_FILTERS.includes(params.stockState)) {
    searchParams.set("stockState", params.stockState);
  }

  if (params.status && STATUS_FILTERS.includes(params.status)) {
    searchParams.set("status", params.status);
  }

  if (params.sort && SORT_FIELDS.includes(params.sort)) {
    searchParams.set("sort", params.sort);
  }

  if (params.order && SORT_ORDERS.includes(params.order)) {
    searchParams.set("order", params.order);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeCreatePayload(payload: CreateProductInput) {
  const parsed = createProductInputSchema.parse(payload);

  return {
    name: parsed.name,
    description: parsed.description,
    price: parsed.price,
    costPrice: parsed.costPrice,
    stock: parsed.stock,
    sku: parsed.sku.toUpperCase(),
    barcode: parsed.barcode,
    categoryId: parsed.categoryId,
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    imageUrl: parsed.imageUrl,
    galleryImages: parsed.galleryImages,
    lowStockThreshold: parsed.lowStockThreshold,
  };
}

function normalizeUpdatePayload(payload: UpdateProductInput) {
  const parsed = updateProductInputSchema.parse(payload);

  return {
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    ...(parsed.price !== undefined ? { price: parsed.price } : {}),
    ...(parsed.costPrice !== undefined ? { costPrice: parsed.costPrice } : {}),
    ...(parsed.stock !== undefined ? { stock: parsed.stock } : {}),
    ...(parsed.sku !== undefined ? { sku: parsed.sku.toUpperCase() } : {}),
    ...(parsed.barcode !== undefined ? { barcode: parsed.barcode } : {}),
    ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId } : {}),
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    ...(parsed.imageUrl !== undefined ? { imageUrl: parsed.imageUrl } : {}),
    ...(parsed.galleryImages !== undefined ? { galleryImages: parsed.galleryImages } : {}),
    ...(parsed.lowStockThreshold !== undefined
      ? { lowStockThreshold: parsed.lowStockThreshold }
      : {}),
    ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
  };
}

export async function getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  const envelope = await apiRequestRaw<unknown>(`/products${buildSearchParams(params)}`, {
    method: "GET",
  });

  const parsed = productListEnvelopeSchema.parse(envelope);

  return {
    data: parsed.data satisfies Product[],
    pagination: parsed.pagination,
  };
}

export async function getProduct(productId: string): Promise<Product> {
  const data = await apiRequest<unknown>(`/products/${productId}`, {
    method: "GET",
  });

  return productSchema.parse(data) satisfies Product;
}

export async function getProductStats(): Promise<ProductStats> {
  const data = await apiRequest<unknown>("/products/stats/overview", {
    method: "GET",
  });

  return productStatsSchema.parse(data) satisfies ProductStats;
}

export async function getProductCategories(): Promise<ProductCategoryOption[]> {
  const data = await apiRequest<unknown>("/categories?skip=0&take=100", {
    method: "GET",
  });

  const parsed = categoryListSchema.parse(data);

  return parsed.data
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name)) satisfies ProductCategoryOption[];
}

export async function getLowStockProducts(limit = 5): Promise<ProductLowStockItem[]> {
  const envelope = await apiRequestRaw<unknown>(`/products/stats/low-stock?limit=${limit}`, {
    method: "GET",
  });

  const parsed = lowStockProductsEnvelopeSchema.parse(envelope);
  return parsed.data satisfies ProductLowStockItem[];
}

export async function getTopPerformingProducts(limit = 5): Promise<Product[]> {
  const envelope = await apiRequestRaw<unknown>(
    `/products/stats/top-performers?limit=${limit}`,
    {
      method: "GET",
    }
  );

  const parsed = topPerformersEnvelopeSchema.parse(envelope);
  return parsed.data satisfies Product[];
}

export async function createProduct(payload: CreateProductInput): Promise<Product> {
  const data = await apiRequest<unknown>("/products", {
    method: "POST",
    body: normalizeCreatePayload(payload),
  });

  return productSchema.parse(data) satisfies Product;
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductInput
): Promise<Product> {
  const data = await apiRequest<unknown>(`/products/${productId}`, {
    method: "PUT",
    body: normalizeUpdatePayload(payload),
  });

  return productSchema.parse(data) satisfies Product;
}

export async function updateProductStatus(
  productId: string,
  status: ProductOperationalStatus
): Promise<Product> {
  const data = await apiRequest<unknown>(`/products/${productId}/status`, {
    method: "PATCH",
    body: { status },
  });

  return productSchema.parse(data) satisfies Product;
}

export async function deleteProduct(productId: string) {
  const data = await apiRequest<unknown>(`/products/${productId}`, {
    method: "DELETE",
  });

  return productSchema.parse(data) satisfies Product;
}

export async function permanentlyDeleteProduct(productId: string): Promise<{ id: string }> {
  const data = await apiRequest<unknown>(`/products/${productId}/permanent`, {
    method: "DELETE",
  });

  return deletedProductEnvelopeSchema.parse(data);
}
