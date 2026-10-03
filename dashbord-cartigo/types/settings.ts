export type OrganizationSettings = {
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  logoUrl: string | null;
};

export type BrandingSettings = {
  primaryColor: string;
  logoUrl: string | null;
  displayName: string;
};

export type NotificationSettings = {
  emailNotifications: boolean;
  lowStockAlerts: boolean;
  salesAlerts: boolean;
};

export type SecuritySettings = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type BillingInfo = {
  plan: string;
  status: string;
  renewalDate: string;
};
