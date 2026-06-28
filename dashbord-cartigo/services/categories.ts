import { z } from "zod";

import { apiRequest, apiRequestRaw } from "@/services/api";
import type {
  CreateProductCategoryInput,
  ProductCategory,
  ProductCategoryListResponse,
  UpdateProductCategoryInput,
} from "@/types/category";
import type { ProductCategoryOption } from "@/types/product";

const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  productCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const categoryListEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.object({
    data: z.array(categorySchema),
    total: z.number().int().nonnegative(),
    skip: z.number().int().nonnegative(),
    take: z.number().int().positive(),
  }),
});

const createCategoryPayloadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }),
});

const updateCategoryPayloadSchema = createCategoryPayloadSchema.partial();

function buildSearchParams(params?: { skip?: number; take?: number; search?: string }) {
  const searchParams = new URLSearchParams();

  if (typeof params?.skip === "number" && Number.isFinite(params.skip) && params.skip >= 0) {
    searchParams.set("skip", String(params.skip));
  }

  if (typeof params?.take === "number" && Number.isFinite(params.take) && params.take > 0) {
    searchParams.set("take", String(params.take));
  }

  if (params?.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getCategories(params?: {
  skip?: number;
  take?: number;
  search?: string;
}): Promise<ProductCategoryListResponse> {
  const envelope = await apiRequestRaw<unknown>(
    `/categories${buildSearchParams(params)}`,
    {
      method: "GET",
    }
  );

  const parsed = categoryListEnvelopeSchema.parse(envelope);
  return parsed.data satisfies ProductCategoryListResponse;
}

export async function getCategoryOptions(): Promise<ProductCategoryOption[]> {
  const result = await getCategories({ skip: 0, take: 100 });

  return result.data.map((category) => ({
    id: category.id,
    name: category.name,
  })) satisfies ProductCategoryOption[];
}

export async function createCategory(
  payload: CreateProductCategoryInput
): Promise<ProductCategory> {
  const parsed = createCategoryPayloadSchema.parse(payload);
  const data = await apiRequest<unknown>("/categories", {
    method: "POST",
    body: {
      name: parsed.name,
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    },
  });

  return categorySchema.parse(data) satisfies ProductCategory;
}

export async function updateCategory(
  categoryId: string,
  payload: UpdateProductCategoryInput
): Promise<ProductCategory> {
  const parsed = updateCategoryPayloadSchema.parse(payload);
  const data = await apiRequest<unknown>(`/categories/${categoryId}`, {
    method: "PATCH",
    body: {
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    },
  });

  return categorySchema.parse(data) satisfies ProductCategory;
}

export async function deleteCategory(categoryId: string) {
  await apiRequest(`/categories/${categoryId}`, {
    method: "DELETE",
  });
}
