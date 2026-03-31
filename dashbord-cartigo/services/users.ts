import { z } from "zod";

import { apiRequest, apiRequestRaw } from "@/services/api";
import type {
  CreateUserInput,
  OrganizationUser,
  UpdateUserInput,
  UserListParams,
  UserListResponse,
  UserSortField,
  UserSortOrder,
} from "@/types/user";

const USER_SORT_FIELDS = ["name", "email", "createdAt", "updatedAt"] as const satisfies readonly UserSortField[];
const USER_SORT_ORDERS = ["asc", "desc"] as const satisfies readonly UserSortOrder[];

const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().trim().min(1),
  isActive: z.boolean(),
  organizationId: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const userListEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(userSchema),
  pagination: paginationSchema,
});

const createUserInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
});

const updateUserInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    role: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Au moins un champ doit etre modifie.",
  });

const deactivationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().min(1),
});

function buildSearchParams(params: UserListParams) {
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

  if (params.sort && USER_SORT_FIELDS.includes(params.sort)) {
    searchParams.set("sort", params.sort);
  }

  if (params.order && USER_SORT_ORDERS.includes(params.order)) {
    searchParams.set("order", params.order);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeCreatePayload(payload: CreateUserInput) {
  const parsed = createUserInputSchema.parse(payload);

  return {
    email: parsed.email.toLowerCase(),
    password: parsed.password,
    name: parsed.name,
    role: parsed.role,
  };
}

function normalizeUpdatePayload(payload: UpdateUserInput) {
  const parsed = updateUserInputSchema.parse(payload);

  return {
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.role !== undefined ? { role: parsed.role } : {}),
    ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
  };
}

export async function getUsers(params: UserListParams = {}): Promise<UserListResponse> {
  const envelope = await apiRequestRaw<unknown>(`/users${buildSearchParams(params)}`, {
    method: "GET",
  });
  const parsed = userListEnvelopeSchema.parse(envelope);

  return {
    data: parsed.data satisfies OrganizationUser[],
    pagination: parsed.pagination,
  };
}

export async function createUser(payload: CreateUserInput): Promise<OrganizationUser> {
  const data = await apiRequest<unknown>("/users", {
    method: "POST",
    body: normalizeCreatePayload(payload),
  });

  return userSchema.parse(data) satisfies OrganizationUser;
}

export async function updateUser(
  userId: string,
  payload: UpdateUserInput
): Promise<OrganizationUser> {
  const data = await apiRequest<unknown>(`/users/${userId}`, {
    method: "PUT",
    body: normalizeUpdatePayload(payload),
  });

  return userSchema.parse(data) satisfies OrganizationUser;
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
  const payload = await apiRequestRaw<unknown>(`/users/${userId}`, {
    method: "DELETE",
  });

  const parsed = deactivationResponseSchema.parse(payload);
  return { message: parsed.message };
}
