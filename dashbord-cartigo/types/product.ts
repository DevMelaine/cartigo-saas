export type ProductSortField = "createdAt" | "updatedAt" | "name" | "price" | "stock";
export type SortOrder = "asc" | "desc";
export type ProductOperationalStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type ProductStatusFilter = "active" | "draft" | "paused" | "archived" | "all";
export type ProductStockFilter = "all" | "in_stock" | "out_of_stock" | "low_stock";
export type ProductPerformanceIndicator = "top" | "steady" | "emerging" | "idle";

export type ProductCategoryOption = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  sku: string;
  barcode: string | null;
  status: ProductOperationalStatus;
  categoryId: string | null;
  category: string | null;
  imageUrl: string | null;
  imagePreviewUrl: string | null;
  galleryImages: string[];
  galleryPreviewUrls: string[];
  isActive: boolean;
  lowStockThreshold: number | null;
  totalSales: number;
  revenueGenerated: number;
  performanceIndicator: ProductPerformanceIndicator;
  createdAt: string;
  updatedAt: string;
};

export type ProductPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductListResponse = {
  data: Product[];
  pagination: ProductPagination;
};

export type ProductListParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  stockState?: Exclude<ProductStockFilter, "all">;
  status?: Exclude<ProductStatusFilter, "active">;
  sort?: ProductSortField;
  order?: SortOrder;
};

export type ProductFilters = {
  search?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  stockState?: ProductStockFilter;
  status?: ProductStatusFilter;
  sortBy?: ProductSortField;
  sortOrder?: SortOrder;
};

export type ProductStats = {
  totalProducts: number;
  totalStock: number;
  averagePrice: number;
  totalSales: number;
  revenueGenerated: number;
  activeSellingProducts: number;
  topPerformers: number;
  lowStockCount: number;
  idleProducts: number;
};

export type ProductLowStockItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number | null;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  price: string | number;
  costPrice?: string | number | null;
  stock: string | number;
  sku: string;
  barcode?: string;
  categoryId: string;
  status?: ProductOperationalStatus;
  imageUrl?: string | null;
  galleryImages?: string[];
  lowStockThreshold?: string | number | null;
};

export type UpdateProductInput = Partial<CreateProductInput> & {
  isActive?: boolean;
};
