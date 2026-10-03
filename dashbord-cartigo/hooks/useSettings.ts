"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as settingsService from "@/services/settings";
import type {
  BillingInfo,
  BrandingSettings,
  ChangePasswordInput,
  NotificationSettings,
  OrganizationSettings,
} from "@/types/settings";

export const settingsKeys = {
  all: ["settings"] as const,
  organization: () => [...settingsKeys.all, "organization"] as const,
  branding: () => [...settingsKeys.all, "branding"] as const,
  notifications: () => [...settingsKeys.all, "notifications"] as const,
  billing: () => [...settingsKeys.all, "billing"] as const,
};

export function useOrganizationSettings(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  return useQuery({
    queryKey: settingsKeys.organization(),
    queryFn: settingsService.getOrganizationSettings,
    enabled: enabled && canQuery && !authLoading,
    staleTime: 60_000,
  });
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OrganizationSettings) =>
      settingsService.updateOrganizationSettings(payload),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(settingsKeys.organization(), updatedSettings);

      queryClient.setQueryData<BrandingSettings | undefined>(
        settingsKeys.branding(),
        (previous) =>
          previous
            ? {
                ...previous,
                logoUrl: updatedSettings.logoUrl,
              }
            : previous
      );
    },
  });
}

export function useBrandingSettings(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  return useQuery({
    queryKey: settingsKeys.branding(),
    queryFn: settingsService.getBrandingSettings,
    enabled: enabled && canQuery && !authLoading,
    staleTime: 60_000,
  });
}

export function useUpdateBrandingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BrandingSettings) =>
      settingsService.updateBrandingSettings(payload),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(settingsKeys.branding(), updatedSettings);

      queryClient.setQueryData<OrganizationSettings | undefined>(
        settingsKeys.organization(),
        (previous) =>
          previous
            ? {
                ...previous,
                logoUrl: updatedSettings.logoUrl,
              }
            : previous
      );
    },
  });
}

export function useNotificationSettings(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  return useQuery({
    queryKey: settingsKeys.notifications(),
    queryFn: settingsService.getNotificationSettings,
    enabled: enabled && canQuery && !authLoading,
    staleTime: 2 * 60_000,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NotificationSettings) =>
      settingsService.updateNotificationSettings(payload),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(settingsKeys.notifications(), updatedSettings);
    },
  });
}

export function useBillingInfo(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  return useQuery({
    queryKey: settingsKeys.billing(),
    queryFn: settingsService.getBillingInfo,
    enabled: enabled && canQuery && !authLoading,
    staleTime: 5 * 60_000,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordInput) =>
      settingsService.changePassword(payload),
  });
}
