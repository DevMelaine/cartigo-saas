import { z } from "zod";

import {
  apiRequest,
  buildApiUrl,
  clearAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "@/services/api";
import type {
  AuthSession,
  ForgotPasswordInput,
  LoginInput,
  OrganizationCategory,
  RegisterOrganizationInput,
  ResetPasswordInput,
} from "@/types/auth";

const loginInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const registerOrganizationInputSchema = z.object({
  organizationName: z.string().trim().min(2),
  categoryId: z.string().uuid(),
  adminName: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const forgotPasswordInputSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordInputSchema = z.object({
  token: z.string().trim().min(32),
  password: z.string().min(8),
});

const organizationCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().optional(),
});

const organizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().min(1),
  category: organizationCategorySchema.nullable(),
  createdAt: z.string().optional(),
});

const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().trim().min(1),
  permissions: z.array(z.string().trim().min(1)).optional().default([]),
  organizationId: z.string().nullable(),
  createdAt: z.string().optional(),
});

const authSessionSchema = z.object({
  user: userSchema,
  organization: organizationSchema.nullable(),
  accessToken: z.string().min(1),
  refreshToken: z.string().nullable().optional(),
});

const currentUserSchema = z.object({
  user: userSchema,
  organization: organizationSchema.nullable(),
});

const categoryListSchema = z.array(organizationCategorySchema);

export async function login(payload: LoginInput) {
  const parsedInput = loginInputSchema.parse({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  });

  const data = await apiRequest<unknown>("/auth/login", {
    method: "POST",
    body: parsedInput,
    requiresAuth: false,
  });

  const parsed = authSessionSchema.parse(data);
  setAccessToken(parsed.accessToken);

  return {
    user: parsed.user,
    organization: parsed.organization,
  } satisfies AuthSession;
}

export async function registerOrganization(payload: RegisterOrganizationInput) {
  const parsedInput = registerOrganizationInputSchema.parse({
    organizationName: payload.organizationName.trim(),
    categoryId: payload.categoryId,
    adminName: payload.adminName.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  });

  const data = await apiRequest<unknown>("/auth/register-organization", {
    method: "POST",
    body: parsedInput,
    requiresAuth: false,
  });

  const parsed = authSessionSchema.parse(data);
  setAccessToken(parsed.accessToken);

  return {
    user: parsed.user,
    organization: parsed.organization,
  } satisfies AuthSession;
}

export async function logout() {
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
      requiresAuth: false,
    });
  } finally {
    clearAccessToken();
  }
}

export async function refreshToken() {
  return refreshAccessToken();
}

export async function getCurrentUser() {
  const data = await apiRequest<unknown>("/auth/me", {
    method: "GET",
  });

  return currentUserSchema.parse(data) satisfies AuthSession;
}

export async function listOrganizationCategories() {
  const data = await apiRequest<unknown>("/public/categories", {
    method: "GET",
    requiresAuth: false,
  });

  return categoryListSchema.parse(data) satisfies OrganizationCategory[];
}

export async function requestPasswordReset(payload: ForgotPasswordInput) {
  const parsedInput = forgotPasswordInputSchema.parse({
    email: payload.email.trim().toLowerCase(),
  });

  return apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: parsedInput,
    requiresAuth: false,
  });
}

export async function resetPassword(payload: ResetPasswordInput) {
  const parsedInput = resetPasswordInputSchema.parse({
    token: payload.token.trim(),
    password: payload.password,
  });

  return apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: parsedInput,
    requiresAuth: false,
  });
}

export function startGoogleAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.location.assign(buildApiUrl("/auth/google"));
}
