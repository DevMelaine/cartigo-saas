"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as activityLogService from "@/services/activityLogs";
import type { ActivityLogFilters, ActivityLogResponse } from "@/types/activity";

export const activityLogKeys = {
  all: ["activity-logs"] as const,
  list: (filters: ActivityLogFilters) => [...activityLogKeys.all, filters] as const,
};

function defaultResponse(filters: ActivityLogFilters): ActivityLogResponse {
  return {
    data: [],
    pagination: {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
      total: 0,
      totalPages: 0,
    },
    filterOptions: {
      actions: [],
      users: [],
      types: [{ value: "order", label: "Commandes" }],
    },
    source: "order-audit-logs",
  };
}

export function useActivityLogs(filters: ActivityLogFilters, enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const query = useQuery({
    queryKey: activityLogKeys.list(filters),
    queryFn: () => activityLogService.getActivityLogs(filters),
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
