import { z } from "zod";

import { apiRequest, apiRequestRaw } from "@/services/api";
import type {
  DashboardRecentOrder,
  DashboardSalesTrendPoint,
} from "@/types/dashboard";
import type {
  OrderDetail,
  OrderFilters,
  OrderListItem,
  OrderListParams,
  OrderListResponse,
  OrderOverview,
  OrderStatus,
} from "@/types/order";

const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_FOR_DELIVERY",
  "IN_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

const orderCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
});

const orderItemProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().nullable(),
  imagePreviewUrl: z.string().nullable().optional().default(null),
  inventory: z
    .object({
      quantity: z.number().int(),
    })
    .nullable()
    .optional()
    .default(null),
});

const orderItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.coerce.number(),
  product: orderItemProductSchema.nullable(),
});

const orderAuditLogSchema = z.object({
  id: z.string().min(1),
  previousStatus: orderStatusSchema,
  newStatus: orderStatusSchema,
  changedByUserId: z.string().nullable(),
  changedByRole: z.enum(["ADMIN", "MANAGER", "CASHIER", "STAFF"]).nullable(),
  action: z.string().default("STATUS_CHANGED"),
  createdAt: z.string(),
});

const orderListItemSchema = z.object({
  id: z.string().min(1),
  total: z.coerce.number(),
  status: orderStatusSchema,
  readyForDelivery: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  customer: orderCustomerSchema,
});

const orderDetailSchema = orderListItemSchema.extend({
  items: z.array(orderItemSchema),
  auditLogs: z.array(orderAuditLogSchema).default([]),
});

const orderPaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const orderListEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(orderListItemSchema),
  pagination: orderPaginationSchema,
});

const orderOverviewSchema = z.object({
  totalOrders: z.number().int().nonnegative(),
  totalRevenue: z.coerce.number(),
  pendingOrders: z.number().int().nonnegative(),
  inProgressOrders: z.number().int().nonnegative(),
  deliveredOrders: z.number().int().nonnegative(),
  cancelledOrders: z.number().int().nonnegative(),
});

const salesTrendPointSchema = z.object({
  date: z.string().min(1),
  revenue: z.coerce.number(),
  orders: z.number().int().nonnegative(),
});

const salesTrendEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(salesTrendPointSchema),
});

function buildOrderSearchParams(params: OrderListParams = {}) {
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

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.dateFrom) {
    searchParams.set("dateFrom", params.dateFrom);
  }

  if (params.dateTo) {
    searchParams.set("dateTo", params.dateTo);
  }

  if (typeof params.minTotal === "number" && Number.isFinite(params.minTotal)) {
    searchParams.set("minTotal", String(params.minTotal));
  }

  if (typeof params.maxTotal === "number" && Number.isFinite(params.maxTotal)) {
    searchParams.set("maxTotal", String(params.maxTotal));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function buildOrderFilters(params: OrderFilters, page: number, limit: number): OrderListParams {
  const normalizeNumber = (value?: string) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const parsedValue = Number.parseFloat(value.trim());
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  };

  return {
    page,
    limit,
    search: params.search?.trim() || undefined,
    status:
      params.status && params.status !== "all"
        ? params.status
        : undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    minTotal: normalizeNumber(params.minTotal),
    maxTotal: normalizeNumber(params.maxTotal),
  };
}

export async function getOrders(params: OrderListParams = {}): Promise<OrderListResponse> {
  const envelope = await apiRequestRaw<unknown>(`/orders${buildOrderSearchParams(params)}`, {
    method: "GET",
  });

  const parsed = orderListEnvelopeSchema.parse(envelope);

  return {
    data: parsed.data satisfies OrderListItem[],
    pagination: parsed.pagination,
  };
}

export async function getOrder(orderId: string): Promise<OrderDetail> {
  const data = await apiRequest<unknown>(`/orders/${orderId}/details`, {
    method: "GET",
  });

  return orderDetailSchema.parse(data) satisfies OrderDetail;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<OrderDetail> {
  const data = await apiRequest<unknown>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: {
      status,
    },
  });

  return orderDetailSchema.parse(data) satisfies OrderDetail;
}

export async function getOrderOverview(): Promise<OrderOverview> {
  const data = await apiRequest<unknown>("/orders/stats/overview", {
    method: "GET",
  });

  return orderOverviewSchema.parse(data) satisfies OrderOverview;
}

export async function getRecentOrders(limit = 5): Promise<DashboardRecentOrder[]> {
  const response = await getOrders({
    page: 1,
    limit,
  });

  return response.data.map((order) => ({
    id: order.id,
    customerName: order.customer.name,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
  })) satisfies DashboardRecentOrder[];
}

export async function getSalesTrend(days = 30): Promise<DashboardSalesTrendPoint[]> {
  const data = await apiRequest<unknown>(`/orders/stats/sales-trend?days=${days}`, {
    method: "GET",
  });

  return salesTrendEnvelopeSchema.shape.data.parse(data) satisfies DashboardSalesTrendPoint[];
}
