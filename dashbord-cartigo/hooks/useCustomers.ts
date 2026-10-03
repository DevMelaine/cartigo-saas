"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as customerService from "@/services/customers";
import type { CustomerListParams, CustomerListResponse } from "@/types/customer";

export const customerKeys = {
  all: ["customers"] as const,
  list: (params: CustomerListParams) => [...customerKeys.all, params] as const,
};

function defaultResponse(filters: CustomerListParams): CustomerListResponse {
  return {
    data: [],
    pagination: {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
      total: 0,
      totalPages: 0,
    },
    summary: {
      totalClients: 0,
      activeClients: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    },
  };
}

export function useCustomers(filters: CustomerListParams, enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const query = useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => customerService.getCustomers(filters),
    enabled: enabled && canQuery,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });

  return {
    data: query.data ?? defaultResponse(filters),
    isLoading: authLoading || query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: async () => {
      if (!enabled || !canQuery) {
        return;
      }

      await query.refetch();
    },
  };
}
