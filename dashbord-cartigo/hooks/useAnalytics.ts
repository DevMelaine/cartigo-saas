"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as analyticsService from "@/services/analytics";
import type {
  DashboardStats,
  ProductAnalytics,
  SalesAnalytics,
  SalesAnalyticsFilters,
  UserAnalytics,
} from "@/types/analytics";

export const analyticsKeys = {
  all: ["analytics"] as const,
  dashboardStats: () => [...analyticsKeys.all, "dashboard-stats"] as const,
  sales: (filters: SalesAnalyticsFilters) => [...analyticsKeys.all, "sales", filters] as const,
  users: () => [...analyticsKeys.all, "users"] as const,
  products: () => [...analyticsKeys.all, "products"] as const,
};

const defaultDashboardStats: DashboardStats = {
  totalRevenue: 0,
  totalOrders: 0,
  totalUsers: 0,
  totalProducts: 0,
  growthRate: 0,
};

const defaultUserAnalytics: UserAnalytics = {
  totalUsers: 0,
  activeUsers: 0,
  newUsers: 0,
};

export function useDashboardStats(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const query = useQuery({
    queryKey: analyticsKeys.dashboardStats(),
    queryFn: analyticsService.getDashboardStats,
    enabled: enabled && canQuery,
    staleTime: 2 * 60_000,
    retry: false,
  });

  return {
    data: query.data ?? defaultDashboardStats,
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

export function useSalesAnalytics(filters: SalesAnalyticsFilters, enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const query = useQuery({
    queryKey: analyticsKeys.sales(filters),
    queryFn: () => analyticsService.getSalesAnalytics(filters),
    enabled: enabled && canQuery,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });

  return {
    data: query.data ?? ([] satisfies SalesAnalytics[]),
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

export function useUserAnalytics(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const query = useQuery({
    queryKey: analyticsKeys.users(),
    queryFn: analyticsService.getUserAnalytics,
    enabled: enabled && canQuery,
    staleTime: 2 * 60_000,
    retry: false,
  });

  return {
    data: query.data ?? defaultUserAnalytics,
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

export function useProductAnalytics(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const query = useQuery({
    queryKey: analyticsKeys.products(),
    queryFn: analyticsService.getProductAnalytics,
    enabled: enabled && canQuery,
    staleTime: 60_000,
    retry: false,
  });

  return {
    data: query.data ?? ([] satisfies ProductAnalytics[]),
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
