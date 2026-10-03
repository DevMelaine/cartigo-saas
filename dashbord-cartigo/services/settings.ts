import { z } from "zod";

import { apiRequest } from "@/services/api";
import type {
  BillingInfo,
  BrandingSettings,
  ChangePasswordInput,
  NotificationSettings,
  OrganizationSettings,
} from "@/types/settings";

const SETTINGS_STORAGE_PREFIX = "cartigo.dashboard.settings";
const DEFAULT_PRIMARY_COLOR = "#0f766e";
const DEFAULT_CURRENCY = "XOF";
const DEFAULT_TIMEZONE = "Africa/Lome";

const organizationProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().nullable().optional().default(null),
  description: z.string().nullable().optional().default(null),
  logoUrl: z.string().nullable().optional().default(null),
  coverImageUrl: z.string().nullable().optional().default(null),
  openingHours: z.unknown().nullable().optional().default(null),
  categoryId: z.string().nullable().optional().default(null),
  category: z.string().nullable().optional().default(null),
  createdAt: z.string().optional(),
});

const updateOrganizationPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().max(30).or(z.literal("")),
  address: z.string().trim().max(255),
  currency: z.string().trim().length(3).or(z.literal("")),
  timezone: z.string().trim().min(2).or(z.literal("")),
  logoUrl: z.string().nullable(),
});

const updateBrandingPayloadSchema = z.object({
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  logoUrl: z.string().nullable(),
  displayName: z.string().trim().min(2).max(120),
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  lowStockAlerts: z.boolean(),
  salesAlerts: z.boolean(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

type OrganizationProfile = z.infer<typeof organizationProfileSchema>;
type OrganizationSettingsExtras = Pick<
  OrganizationSettings,
  "email" | "phone" | "currency" | "timezone"
>;
type BrandingSettingsExtras = Pick<BrandingSettings, "primaryColor" | "displayName">;

let cachedOrganizationId: string | null = null;

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function buildScopedStorageKey(suffix: string, organizationId: string) {
  return `${SETTINGS_STORAGE_PREFIX}:${organizationId}:${suffix}`;
}

function readStoredValue<T>(key: string, fallback: T): T {
  if (!canUseBrowserStorage()) {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    return {
      ...fallback,
      ...JSON.parse(rawValue),
    };
  } catch {
    return fallback;
  }
}

function writeStoredValue(key: string, value: unknown) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

async function getOrganizationProfile() {
  const organization = organizationProfileSchema.parse(
    await apiRequest<unknown>("/organizations/me", {
      method: "GET",
    })
  );

  cachedOrganizationId = organization.id;
  return organization;
}

async function resolveOrganizationId() {
  if (cachedOrganizationId) {
    return cachedOrganizationId;
  }

  const organization = await getOrganizationProfile();
  return organization.id;
}

function defaultOrganizationExtras(): OrganizationSettingsExtras {
  return {
    email: "",
    phone: "",
    currency: DEFAULT_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
  };
}

function defaultBrandingExtras(displayName: string): BrandingSettingsExtras {
  return {
    primaryColor: DEFAULT_PRIMARY_COLOR,
    displayName,
  };
}

function defaultNotificationSettings(): NotificationSettings {
  return {
    emailNotifications: true,
    lowStockAlerts: true,
    salesAlerts: true,
  };
}

function buildMockBillingInfo(): BillingInfo {
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 30);

  return {
    plan: "Growth",
    status: "ACTIVE",
    renewalDate: renewalDate.toISOString(),
  };
}

function mapOrganizationSettings(
  organization: OrganizationProfile,
  extras: OrganizationSettingsExtras
): OrganizationSettings {
  return {
    name: organization.name,
    email: extras.email,
    phone: extras.phone,
    address: organization.address ?? "",
    currency: extras.currency,
    timezone: extras.timezone,
    logoUrl: organization.logoUrl,
  };
}

function mapBrandingSettings(
  organization: OrganizationProfile,
  extras: BrandingSettingsExtras
): BrandingSettings {
  return {
    primaryColor: extras.primaryColor,
    logoUrl: organization.logoUrl,
    displayName: extras.displayName,
  };
}

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  const organization = await getOrganizationProfile();
  const extras = readStoredValue(
    buildScopedStorageKey("organization", organization.id),
    defaultOrganizationExtras()
  );

  return mapOrganizationSettings(organization, extras);
}

export async function updateOrganizationSettings(
  payload: OrganizationSettings
): Promise<OrganizationSettings> {
  const parsed = updateOrganizationPayloadSchema.parse(payload);
  const currentOrganization = await getOrganizationProfile();
  const nextExtras: OrganizationSettingsExtras = {
    email: parsed.email,
    phone: parsed.phone,
    currency: parsed.currency ? parsed.currency.toUpperCase() : DEFAULT_CURRENCY,
    timezone: parsed.timezone ? parsed.timezone : DEFAULT_TIMEZONE,
  };

  const updatedOrganization = organizationProfileSchema.parse(
    await apiRequest<unknown>("/organizations/me", {
      method: "PUT",
      body: {
        name: parsed.name,
        address: parsed.address.trim() ? parsed.address : null,
      },
    })
  );

  writeStoredValue(
    buildScopedStorageKey("organization", currentOrganization.id),
    nextExtras
  );

  return mapOrganizationSettings(updatedOrganization, nextExtras);
}

export async function getBrandingSettings(): Promise<BrandingSettings> {
  const organization = await getOrganizationProfile();
  const extras = readStoredValue(
    buildScopedStorageKey("branding", organization.id),
    defaultBrandingExtras(organization.name)
  );

  return mapBrandingSettings(organization, extras);
}

export async function updateBrandingSettings(
  payload: BrandingSettings
): Promise<BrandingSettings> {
  const parsed = updateBrandingPayloadSchema.parse(payload);
  const currentOrganization = await getOrganizationProfile();

  const updatedOrganization =
    parsed.logoUrl !== currentOrganization.logoUrl
      ? organizationProfileSchema.parse(
          await apiRequest<unknown>("/organizations/me", {
            method: "PUT",
            body: {
              logoUrl: parsed.logoUrl,
            },
          })
        )
      : currentOrganization;

  writeStoredValue(buildScopedStorageKey("branding", currentOrganization.id), {
    primaryColor: parsed.primaryColor,
    displayName: parsed.displayName,
  });

  return mapBrandingSettings(updatedOrganization, {
    primaryColor: parsed.primaryColor,
    displayName: parsed.displayName,
  });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const organizationId = await resolveOrganizationId();

  return readStoredValue(
    buildScopedStorageKey("notifications", organizationId),
    defaultNotificationSettings()
  );
}

export async function updateNotificationSettings(
  payload: NotificationSettings
): Promise<NotificationSettings> {
  const parsed = notificationSettingsSchema.parse(payload);
  const organizationId = await resolveOrganizationId();

  writeStoredValue(buildScopedStorageKey("notifications", organizationId), parsed);

  return parsed;
}

export async function changePassword(payload: ChangePasswordInput) {
  const parsed = changePasswordSchema.parse(payload);

  if (parsed.currentPassword === parsed.newPassword) {
    throw new Error("Le nouveau mot de passe doit etre different de l'ancien.");
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });

  return {
    success: true,
    source: "mock",
  };
}

export async function getBillingInfo(): Promise<BillingInfo> {
  const organizationId = await resolveOrganizationId();

  return readStoredValue(
    buildScopedStorageKey("billing", organizationId),
    buildMockBillingInfo()
  );
}
