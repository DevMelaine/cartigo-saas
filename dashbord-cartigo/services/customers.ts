import { z } from "zod";

import { apiRequestRaw } from "@/services/api";
import type {
  CustomerListParams,
  CustomerListResponse,
  CustomerSortField,
  CustomerSortOrder,
  CustomerStatusFilter,
  OrganizationCustomer,
} from "@/types/customer";

const CUSTOMER_STATUS_FILTERS = ["all", "active", "inactive"] as const satisfies readonly CustomerStatusFilter[];
const CUSTOMER_SORT_FIELDS = ["totalSpent", "lastOrderAt", "totalOrders"] as const satisfies readonly CustomerSortField[];
const CUSTOMER_SORT_ORDERS = ["asc", "desc"] as const satisfies readonly CustomerSortOrder[];

const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional().default(null),
  totalOrders: z.number().int().nonnegative(),
  totalSpent: z.coerce.number(),
  lastOrderAt: z.string().nullable().optional().default(null),
  isActive: z.boolean(),
});

const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const summarySchema = z.object({
  totalClients: z.number().int().nonnegative(),
  activeClients: z.number().int().nonnegative(),
  totalRevenue: z.coerce.number(),
  averageOrderValue: z.coerce.number(),
});

const customerListEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(customerSchema),
  pagination: paginationSchema,
  summary: summarySchema,
});

function buildSearchParams(params: CustomerListParams) {
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

  if (params.status && CUSTOMER_STATUS_FILTERS.includes(params.status)) {
    searchParams.set("status", params.status);
  }

  if (params.sortBy && CUSTOMER_SORT_FIELDS.includes(params.sortBy)) {
    searchParams.set("sortBy", params.sortBy);
  }

  if (params.sortOrder && CUSTOMER_SORT_ORDERS.includes(params.sortOrder)) {
    searchParams.set("sortOrder", params.sortOrder);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getCustomers(
  params: CustomerListParams = {}
): Promise<CustomerListResponse> {
  const envelope = await apiRequestRaw<unknown>(
    `/organizations/customers${buildSearchParams(params)}`,
    {
      method: "GET",
    }
  );

  const parsed = customerListEnvelopeSchema.parse(envelope);

  return {
    data: parsed.data satisfies OrganizationCustomer[],
    pagination: parsed.pagination,
    summary: parsed.summary,
  };
}
