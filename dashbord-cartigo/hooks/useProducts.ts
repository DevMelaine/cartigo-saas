"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as productService from "@/services/products";
import type {
  CreateProductInput,
  Product,
  ProductCategoryOption,
  ProductListParams,
  ProductListResponse,
  ProductOperationalStatus,
  ProductStats,
  UpdateProductInput,
} from "@/types/product";

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  stats: () => [...productKeys.all, "stats"] as const,
  categories: () => [...productKeys.all, "categories"] as const,
  detail: (productId: string) => [...productKeys.all, "detail", productId] as const,
};

function matchesProductListParams(product: Product, params: ProductListParams = {}) {
  const expectedStatus = params.status ?? "active";

  if (expectedStatus !== "all") {
    const expectedOperationalStatus =
      expectedStatus === "active" ? "ACTIVE" : expectedStatus.toUpperCase();

    if (product.status !== expectedOperationalStatus) {
      return false;
    }
  }

  const normalizedSearch = params.search?.trim().toLowerCase();
  if (normalizedSearch) {
    const searchableFields = [product.name, product.sku, product.barcode ?? ""]
      .join(" ")
      .toLowerCase();

    if (!searchableFields.includes(normalizedSearch)) {
      return false;
    }
  }

  if (params.categoryId && product.categoryId !== params.categoryId) {
    return false;
  }

  if (
    params.category &&
    (product.category ?? "").trim().toLowerCase() !== params.category.trim().toLowerCase()
  ) {
    return false;
  }

  if (typeof params.minPrice === "number" && product.price < params.minPrice) {
    return false;
  }

  if (typeof params.maxPrice === "number" && product.price > params.maxPrice) {
    return false;
  }

  if (params.stockState === "in_stock" && product.stock <= 0) {
    return false;
  }

  if (params.stockState === "out_of_stock" && product.stock !== 0) {
    return false;
  }

  if (
    params.stockState === "low_stock" &&
    !(typeof product.lowStockThreshold === "number" && product.stock <= product.lowStockThreshold)
  ) {
    return false;
  }

  return true;
}

function compareProducts(left: Product, right: Product, params: ProductListParams = {}) {
  const sortField = params.sort ?? "updatedAt";
  const sortOrder = params.order ?? "desc";
  let comparison = 0;

  switch (sortField) {
    case "name":
      comparison = left.name.localeCompare(right.name);
      break;
    case "price":
      comparison = left.price - right.price;
      break;
    case "stock":
      comparison = left.stock - right.stock;
      break;
    case "createdAt":
      comparison =
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      break;
    case "updatedAt":
    default:
      comparison =
        new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      break;
  }

  if (comparison === 0) {
    comparison = left.id.localeCompare(right.id);
  }

  return sortOrder === "asc" ? comparison : comparison * -1;
}

function syncProductInListCache(
  previous: ProductListResponse | undefined,
  nextProduct: Product,
  params: ProductListParams = {}
) {
  if (!previous) {
    return previous;
  }

  const existingIndex = previous.data.findIndex((product) => product.id === nextProduct.id);
  const alreadyPresent = existingIndex >= 0;
  const shouldBePresent = matchesProductListParams(nextProduct, params);

  let nextData = previous.data.filter((product) => product.id !== nextProduct.id);

  if (shouldBePresent) {
    nextData = [...nextData, nextProduct].sort((left, right) =>
      compareProducts(left, right, params)
    );

    if (previous.pagination.limit > 0) {
      nextData = nextData.slice(0, previous.pagination.limit);
    }
  }

  const totalDelta = shouldBePresent ? (alreadyPresent ? 0 : 1) : alreadyPresent ? -1 : 0;
  const nextTotal = Math.max(0, previous.pagination.total + totalDelta);

  return {
    ...previous,
    data: nextData,
    pagination: {
      ...previous.pagination,
      total: nextTotal,
      totalPages:
        previous.pagination.limit > 0
          ? Math.ceil(nextTotal / previous.pagination.limit)
          : previous.pagination.totalPages,
    },
  };
}

function applyProductToCachedLists(
  queryClient: ReturnType<typeof useQueryClient>,
  nextProduct: Product
) {
  const cachedLists = queryClient.getQueriesData<ProductListResponse>({
    queryKey: productKeys.lists(),
  });

  cachedLists.forEach(([queryKey, data]) => {
    const params =
      Array.isArray(queryKey) && queryKey.length >= 3
        ? (queryKey[2] as ProductListParams)
        : {};

    queryClient.setQueryData(
      queryKey,
      syncProductInListCache(data, nextProduct, params)
    );
  });

  return cachedLists;
}

function removeProductFromListCache(previous: ProductListResponse | undefined, productId: string) {
  if (!previous) {
    return previous;
  }

  const nextData = previous.data.filter((product) => product.id !== productId);

  if (nextData.length === previous.data.length) {
    return previous;
  }

  return {
    ...previous,
    data: nextData,
    pagination: {
      ...previous.pagination,
      total: Math.max(0, previous.pagination.total - 1),
      totalPages:
        previous.pagination.limit > 0
          ? Math.ceil(Math.max(0, previous.pagination.total - 1) / previous.pagination.limit)
          : previous.pagination.totalPages,
    },
  };
}

function parseOptionalText(value: string | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function resolveCategoryLabel(
  categories: ProductCategoryOption[],
  categoryId: string | null | undefined
) {
  if (!categoryId) {
    return null;
  }

  return categories.find((category) => category.id === categoryId)?.name ?? null;
}

function parseOptionalNumber(
  value: string | number | null | undefined
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalizedValue =
    typeof value === "number" ? value : Number.parseFloat(String(value).trim());

  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

function mapStatusToLegacyIsActive(status: ProductOperationalStatus) {
  return status === "ACTIVE";
}

function buildOptimisticProduct(
  current: Product,
  payload: UpdateProductInput,
  categories: ProductCategoryOption[]
): Product {
  const nextName = payload.name !== undefined ? payload.name.trim() : current.name;
  const nextDescription =
    payload.description !== undefined
      ? parseOptionalText(payload.description) ?? null
      : current.description;
  const nextPrice =
    payload.price !== undefined ? parseOptionalNumber(payload.price) ?? current.price : current.price;
  const nextCostPrice =
    payload.costPrice !== undefined
      ? parseOptionalNumber(payload.costPrice)
      : current.costPrice;
  const nextStock =
    payload.stock !== undefined ? parseOptionalNumber(payload.stock) ?? current.stock : current.stock;
  const nextLowStockThreshold =
    payload.lowStockThreshold !== undefined
      ? parseOptionalNumber(payload.lowStockThreshold)
      : current.lowStockThreshold;
  const nextCategoryId =
    payload.categoryId !== undefined ? payload.categoryId : current.categoryId;
  const nextCategory =
    payload.categoryId !== undefined
      ? resolveCategoryLabel(categories, payload.categoryId)
      : current.category;
  const nextStatus =
    payload.status !== undefined ? payload.status : current.status;

  return {
    ...current,
    name: nextName,
    description: nextDescription,
    price: nextPrice,
    costPrice: nextCostPrice === undefined ? current.costPrice : nextCostPrice,
    stock: Number.isFinite(nextStock) ? Number(nextStock) : current.stock,
    sku: payload.sku !== undefined ? payload.sku.trim().toUpperCase() : current.sku,
    barcode:
      payload.barcode !== undefined
        ? parseOptionalText(payload.barcode) ?? null
        : current.barcode,
    status: nextStatus,
    categoryId: nextCategoryId ?? null,
    category: nextCategory,
    imageUrl: payload.imageUrl !== undefined ? payload.imageUrl ?? null : current.imageUrl,
    imagePreviewUrl:
      payload.imageUrl !== undefined
        ? payload.imageUrl ?? null
        : current.imagePreviewUrl,
    galleryImages:
      payload.galleryImages !== undefined ? payload.galleryImages : current.galleryImages,
    galleryPreviewUrls:
      payload.galleryImages !== undefined
        ? payload.galleryImages
        : current.galleryPreviewUrls,
    isActive:
      payload.status !== undefined
        ? mapStatusToLegacyIsActive(payload.status)
        : payload.isActive ?? current.isActive,
    lowStockThreshold:
      nextLowStockThreshold === undefined ? current.lowStockThreshold : nextLowStockThreshold,
    updatedAt: new Date().toISOString(),
  };
}

function buildDuplicatePayload(product: Product): CreateProductInput {
  if (!product.categoryId) {
    throw new Error("Ce produit ne peut pas etre duplique tant qu'il n'a pas de categorie.");
  }

  const skuSuffix = Date.now().toString().slice(-6);
  const nextSku = `${product.sku}-COPY-${skuSuffix}`.slice(0, 100);
  const nextName = `${product.name} (copie)`.slice(0, 255);

  return {
    name: nextName,
    description: product.description ?? undefined,
    price: product.price,
    costPrice: product.costPrice,
    stock: product.stock,
    sku: nextSku,
    barcode: product.barcode ?? undefined,
    categoryId: product.categoryId,
    status: "DRAFT",
    lowStockThreshold: product.lowStockThreshold,
  };
}

function defaultStats(): ProductStats {
  return {
    totalProducts: 0,
    totalStock: 0,
    averagePrice: 0,
    totalSales: 0,
    revenueGenerated: 0,
    activeSellingProducts: 0,
    topPerformers: 0,
    lowStockCount: 0,
    idleProducts: 0,
  };
}

function defaultPagination(filters: ProductListParams) {
  return {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
    total: 0,
    totalPages: 0,
  };
}

export function useProducts(filters: ProductListParams, enabled = true) {
  const queryClient = useQueryClient();
  const { authLoading, canQuery } = useAuthGuard();

  const listQuery = useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productService.getProducts(filters),
    enabled: enabled && canQuery,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const statsQuery = useQuery({
    queryKey: productKeys.stats(),
    queryFn: productService.getProductStats,
    enabled: enabled && canQuery,
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: productKeys.categories(),
    queryFn: productService.getProductCategories,
    enabled: enabled && canQuery,
    staleTime: 5 * 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });
      await queryClient.cancelQueries({ queryKey: productKeys.detail(productId), exact: true });

      const previousDetail = queryClient.getQueryData<Product>(productKeys.detail(productId));
      const previousLists = queryClient.getQueriesData<ProductListResponse>({
        queryKey: productKeys.lists(),
      });

      const sourceProduct =
        previousDetail ??
        previousLists
          .map(([, data]) => data?.data.find((product) => product.id === productId) ?? null)
          .find(Boolean) ??
        null;

      if (sourceProduct) {
        const optimisticArchivedProduct: Product = {
          ...sourceProduct,
          status: "ARCHIVED",
          isActive: false,
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(productKeys.detail(productId), optimisticArchivedProduct);
        applyProductToCachedLists(queryClient, optimisticArchivedProduct);
      } else {
        queryClient.removeQueries({ queryKey: productKeys.detail(productId), exact: true });
      }

      return { previousDetail, previousLists };
    },
    onError: (_error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(productKeys.detail(variables), context.previousDetail);
      }

      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: async (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      applyProductToCachedLists(queryClient, product);
    },
    onSettled: async (_result, _error, productId) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: productKeys.lists(), type: "all" }),
        queryClient.invalidateQueries({ queryKey: productKeys.stats() }),
        queryClient.invalidateQueries({ queryKey: productKeys.detail(productId), exact: true }),
      ]);
    },
  });

  return {
    products: listQuery.data?.data ?? [],
    pagination: listQuery.data?.pagination ?? defaultPagination(filters),
    stats: statsQuery.data ?? defaultStats(),
    categories: categoriesQuery.data ?? ([] satisfies ProductCategoryOption[]),
    isLoading: authLoading || listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isStatsLoading: authLoading || statsQuery.isLoading,
    isCategoriesLoading: authLoading || categoriesQuery.isLoading,
    error:
      listQuery.error instanceof Error
        ? listQuery.error.message
        : statsQuery.error instanceof Error
          ? statsQuery.error.message
          : categoriesQuery.error instanceof Error
            ? categoriesQuery.error.message
            : null,
    deleteProduct: deleteMutation.mutateAsync,
    deletingProductId: deleteMutation.variables ?? null,
    isDeleting: deleteMutation.isPending,
    refetch: async () => {
      if (!enabled || !canQuery) {
        return;
      }

      await Promise.all([
        listQuery.refetch(),
        statsQuery.refetch(),
        categoriesQuery.refetch(),
      ]);
    },
  };
}

export function useProduct(productId?: string | null, enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  return useQuery({
    queryKey: productId ? productKeys.detail(productId) : [...productKeys.all, "detail", "draft"],
    queryFn: () => productService.getProduct(productId as string),
    enabled: Boolean(productId) && enabled && !authLoading && canQuery,
    staleTime: 30_000,
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductInput) => productService.createProduct(payload),
    onSuccess: async (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productKeys.stats() }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories() }),
      ]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string;
      payload: UpdateProductInput;
    }) => productService.updateProduct(productId, payload),
    onMutate: async ({ productId, payload }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: productKeys.lists() }),
        queryClient.cancelQueries({ queryKey: productKeys.detail(productId), exact: true }),
      ]);

      const previousDetail = queryClient.getQueryData<Product>(productKeys.detail(productId));
      const previousLists = queryClient.getQueriesData<ProductListResponse>({
        queryKey: productKeys.lists(),
      });

      const sourceProduct =
        previousDetail ??
        previousLists
          .map(([, data]) => data?.data.find((product) => product.id === productId) ?? null)
        .find(Boolean) ??
        null;
      const availableCategories =
        queryClient.getQueryData<ProductCategoryOption[]>(productKeys.categories()) ?? [];

      if (sourceProduct) {
        const optimisticProduct = buildOptimisticProduct(
          sourceProduct,
          payload,
          availableCategories
        );

        queryClient.setQueryData(productKeys.detail(productId), optimisticProduct);
        applyProductToCachedLists(queryClient, optimisticProduct);
      }

      return { previousDetail, previousLists };
    },
    onError: (_error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          productKeys.detail(variables.productId),
          context.previousDetail
        );
      }

      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: async (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      applyProductToCachedLists(queryClient, product);
    },
    onSettled: async (_result, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productKeys.stats() }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories() }),
        queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId), exact: true }),
      ]);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (product: Product) =>
      productService.createProduct(buildDuplicatePayload(product)),
    onSuccess: async (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productKeys.stats() }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories() }),
      ]);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      productId,
      status,
    }: {
      productId: string;
      status: ProductOperationalStatus;
    }) => productService.updateProductStatus(productId, status),
    onMutate: async ({ productId, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: productKeys.lists() }),
        queryClient.cancelQueries({ queryKey: productKeys.detail(productId), exact: true }),
      ]);

      const previousDetail = queryClient.getQueryData<Product>(productKeys.detail(productId));
      const previousLists = queryClient.getQueriesData<ProductListResponse>({
        queryKey: productKeys.lists(),
      });

      const sourceProduct =
        previousDetail ??
        previousLists
          .map(([, data]) => data?.data.find((product) => product.id === productId) ?? null)
          .find(Boolean) ??
        null;

      if (sourceProduct) {
        const optimisticProduct: Product = {
          ...sourceProduct,
          status,
          isActive: mapStatusToLegacyIsActive(status),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(productKeys.detail(productId), optimisticProduct);
        applyProductToCachedLists(queryClient, optimisticProduct);
      }

      return { previousDetail, previousLists };
    },
    onError: (_error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(productKeys.detail(variables.productId), context.previousDetail);
      }

      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: async (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      applyProductToCachedLists(queryClient, product);
    },
    onSettled: async (_result, _error, variables) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: productKeys.lists(), type: "all" }),
        queryClient.invalidateQueries({ queryKey: productKeys.stats() }),
        queryClient.invalidateQueries({
          queryKey: productKeys.detail(variables.productId),
          exact: true,
        }),
      ]);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: productService.permanentlyDeleteProduct,
    onMutate: async (productId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: productKeys.lists() }),
        queryClient.cancelQueries({ queryKey: productKeys.detail(productId), exact: true }),
      ]);

      const previousDetail = queryClient.getQueryData<Product>(productKeys.detail(productId));
      const previousLists = queryClient.getQueriesData<ProductListResponse>({
        queryKey: productKeys.lists(),
      });

      queryClient.setQueriesData<ProductListResponse>(
        { queryKey: productKeys.lists() },
        (previous) => removeProductFromListCache(previous, productId)
      );
      queryClient.removeQueries({ queryKey: productKeys.detail(productId), exact: true });

      return { previousDetail, previousLists };
    },
    onError: (_error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(productKeys.detail(variables), context.previousDetail);
      }

      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: async (_result, _error, productId) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: productKeys.lists(), type: "all" }),
        queryClient.invalidateQueries({ queryKey: productKeys.stats() }),
        queryClient.removeQueries({ queryKey: productKeys.detail(productId), exact: true }),
      ]);
    },
  });

  return {
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    updateProductStatus: statusMutation.mutateAsync,
    permanentlyDeleteProduct: permanentDeleteMutation.mutateAsync,
    duplicateProduct: duplicateMutation.mutateAsync,
    permanentlyDeletingProductId: permanentDeleteMutation.variables ?? null,
    updatingStatusProductId: statusMutation.variables?.productId ?? null,
    duplicatingProductId: duplicateMutation.variables?.id ?? null,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUpdatingStatus: statusMutation.isPending,
    isPermanentlyDeleting: permanentDeleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}
