export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ["*"],
  MANAGER: [
    "activity.read",
    "analytics.read",
    "category.create",
    "category.delete",
    "category.read",
    "category.update",
    "order.cancel",
    "order.read",
    "order.update",
    "product.create",
    "product.delete",
    "product.read",
    "product.update",
    "user.read",
  ],
  CASHIER: [
    "order.payment.confirm",
    "order.read",
  ],
  STAFF: [
    "order.read",
    "order.status.ready",
  ],
};

export function getPermissionsForRole(role?: string | null) {
  if (!role) {
    return [];
  }

  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermissionForRole(role: string | null | undefined, permission: string) {
  const rolePermissions = getPermissionsForRole(role);

  if (rolePermissions.includes("*")) {
    return true;
  }

  return rolePermissions.includes(permission);
}

export function hasAnyPermissionForRole(
  role: string | null | undefined,
  permissions: readonly string[]
) {
  return permissions.some((permission) => hasPermissionForRole(role, permission));
}
