"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as orderService from "@/services/orders";
import type {
  OrderDetail,
  OrderListParams,
  OrderListResponse,
  OrderOverview,
  OrderStatus,
} from "@/types/order";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (params: OrderListParams) => [...orderKeys.lists(), params] as const,
  detail: (orderId: string) => [...orderKeys.all, "detail", orderId] as const,
  overview: () => [...orderKeys.all, "overview"] as const,
};

function defaultOverview(): OrderOverview {
  return {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  };
}

function defaultPagination(filters: OrderListParams) {
  return {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
    total: 0,
    totalPages: 0,
  };
}

function updateOrderInListCache(
  previous: OrderListResponse | undefined,
  nextOrder: OrderDetail
) {
  if (!previous) {
    return previous;
  }

  const hasOrder = previous.data.some((order) => order.id === nextOrder.id);

  if (!hasOrder) {
    return previous;
  }

  return {
    ...previous,
    data: previous.data.map((order) =>
      order.id === nextOrder.id
        ? {
            ...order,
            ...nextOrder,
          }
        : order
    ),
  };
}

export function useOrders(filters: OrderListParams) {
  const { authLoading, canQuery } = useAuthGuard();

  const listQuery = useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => orderService.getOrders(filters),
    enabled: canQuery,
    staleTime: 30_000,
  });

  const overviewQuery = useQuery({
    queryKey: orderKeys.overview(),
    queryFn: orderService.getOrderOverview,
    enabled: canQuery,
    staleTime: 60_000,
  });

  return {
    orders: listQuery.data?.data ?? [],
    pagination: listQuery.data?.pagination ?? defaultPagination(filters),
    overview: overviewQuery.data ?? defaultOverview(),
    isLoading: authLoading || listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isOverviewLoading: authLoading || overviewQuery.isLoading,
    error:
      listQuery.error instanceof Error
        ? listQuery.error.message
        : overviewQuery.error instanceof Error
          ? overviewQuery.error.message
          : null,
    refetch: async () => {
      if (!canQuery) {
        return;
      }

      await Promise.all([listQuery.refetch(), overviewQuery.refetch()]);
    },
  };
}

export function useOrder(orderId?: string | null, enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  return useQuery({
    queryKey: orderId ? orderKeys.detail(orderId) : [...orderKeys.all, "detail", "draft"],
    queryFn: () => orderService.getOrder(orderId as string),
    enabled: Boolean(orderId) && enabled && !authLoading && canQuery,
    staleTime: 30_000,
  });
}

export function useOrderMutations() {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => orderService.updateOrderStatus(orderId, status),
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.setQueriesData<OrderListResponse>(
        { queryKey: orderKeys.lists() },
        (previous) => updateOrderInListCache(previous, order)
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id), exact: true }),
      ]);
    },
  });

  return {
    updateOrderStatus: statusMutation.mutateAsync,
    updatingOrderId: statusMutation.variables?.orderId ?? null,
    isUpdatingStatus: statusMutation.isPending,
  };
}
