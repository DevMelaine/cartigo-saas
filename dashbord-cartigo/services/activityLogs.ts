import { z } from "zod";

import { apiRequestRaw } from "@/services/api";
import type { ActivityLogFilters, ActivityLogResponse } from "@/types/activity";

const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_FOR_DELIVERY",
  "IN_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

const activityFilterOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const activityLogSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().nullable().optional().default(null),
  performedBy: z.string().nullable().optional().default(null),
  action: z.string().min(1),
  entityType: z.enum(["user", "auth", "system", "order"]),
  entityId: z.string().nullable().optional().default(null),
  entityLabel: z.string().min(1),
  orderReference: z.string().min(1),
  customerName: z.string().min(1),
  actorUserId: z.string().nullable().optional().default(null),
  actorName: z.string().nullable().optional().default(null),
  actorRole: z.string().nullable().optional().default(null),
  previousStatus: orderStatusSchema.nullable().optional().default(null),
  newStatus: orderStatusSchema.nullable().optional().default(null),
  timestamp: z.string(),
  createdAt: z.string(),
});

const activityLogResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(activityLogSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  filterOptions: z.object({
    actions: z.array(activityFilterOptionSchema),
    users: z.array(activityFilterOptionSchema),
    types: z.array(activityFilterOptionSchema),
  }),
  source: z.string().min(1),
});

function buildSearchParams(params: ActivityLogFilters) {
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

  if (params.userId?.trim()) {
    searchParams.set("userId", params.userId);
  }

  if (params.action?.trim()) {
    searchParams.set("action", params.action);
  }

  if (params.type && params.type !== "all") {
    searchParams.set("type", params.type);
  }

  if (params.dateFrom) {
    searchParams.set("dateFrom", params.dateFrom);
  }

  if (params.dateTo) {
    searchParams.set("dateTo", params.dateTo);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getActivityLogs(
  params: ActivityLogFilters = {}
): Promise<ActivityLogResponse> {
  const payload = await apiRequestRaw<unknown>(`/activity-logs${buildSearchParams(params)}`, {
    method: "GET",
  });

  return activityLogResponseSchema.parse(payload);
}
