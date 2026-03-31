"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as categoryService from "@/services/categories";
import { productKeys } from "@/hooks/useProducts";
import type {
  CreateProductCategoryInput,
  ProductCategory,
  ProductCategoryListResponse,
  UpdateProductCategoryInput,
} from "@/types/category";

export const categoryKeys = {
  all: ["product-categories"] as const,
  list: (params: { skip?: number; take?: number; search?: string }) =>
    [...categoryKeys.all, "list", params] as const,
};

function updateCategoryInCache(
  previous: ProductCategoryListResponse | undefined,
  nextCategory: ProductCategory
) {
  if (!previous) {
    return previous;
  }

  const hasCategory = previous.data.some((category) => category.id === nextCategory.id);

  return {
    ...previous,
    data: hasCategory
      ? previous.data.map((category) =>
          category.id === nextCategory.id ? nextCategory : category
        )
      : [nextCategory, ...previous.data],
    total: hasCategory ? previous.total : previous.total + 1,
  };
}

function removeCategoryFromCache(
  previous: ProductCategoryListResponse | undefined,
  categoryId: string
) {
  if (!previous) {
    return previous;
  }

  const nextData = previous.data.filter((category) => category.id !== categoryId);

  if (nextData.length === previous.data.length) {
    return previous;
  }

  return {
    ...previous,
    data: nextData,
    total: Math.max(0, previous.total - 1),
  };
}

export function useCategories(search = "", enabled = true) {
  const queryClient = useQueryClient();
  const normalizedSearch = search.trim();
  const { authLoading, canQuery } = useAuthGuard();

  const listQuery = useQuery({
    queryKey: categoryKeys.list({ skip: 0, take: 100, search: normalizedSearch }),
    queryFn: () =>
      categoryService.getCategories({
        skip: 0,
        take: 100,
        search: normalizedSearch || undefined,
      }),
    enabled: enabled && canQuery,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductCategoryInput) => categoryService.createCategory(payload),
    onSuccess: async (category) => {
      queryClient.setQueriesData<ProductCategoryListResponse>(
        { queryKey: categoryKeys.all },
        (previous) => updateCategoryInCache(previous, category)
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories() }),
      ]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: UpdateProductCategoryInput;
    }) => categoryService.updateCategory(categoryId, payload),
    onSuccess: async (category) => {
      queryClient.setQueriesData<ProductCategoryListResponse>(
        { queryKey: categoryKeys.all },
        (previous) => updateCategoryInCache(previous, category)
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories() }),
        queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productKeys.stats() }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onMutate: async (categoryId) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      const previousLists = queryClient.getQueriesData<ProductCategoryListResponse>({
        queryKey: categoryKeys.all,
      });

      queryClient.setQueriesData<ProductCategoryListResponse>(
        { queryKey: categoryKeys.all },
        (previous) => removeCategoryFromCache(previous, categoryId)
      );

      return { previousLists };
    },
    onError: (_error, _categoryId, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories() }),
      ]);
    },
  });

  return {
    categories: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    isLoading: authLoading || listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error instanceof Error ? listQuery.error.message : null,
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingCategoryId: deleteMutation.variables ?? null,
    refetch: async () => {
      if (!enabled || !canQuery) {
        return;
      }

      await listQuery.refetch();
    },
  };
}
