export type UserRole = string;
export type UserPermission = string;

export type OrganizationCategory = {
  id: string;
  name: string;
  createdAt?: string;
};

export type AuthOrganization = {
  id: string;
  name: string;
  categoryId: string;
  category: OrganizationCategory | null;
  createdAt?: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: UserPermission[];
  organizationId: string | null;
  createdAt?: string;
};

export type AuthSession = {
  user: AuthUser;
  organization: AuthOrganization | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterOrganizationInput = {
  organizationName: string;
  categoryId: string;
  adminName: string;
  email: string;
  password: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};
