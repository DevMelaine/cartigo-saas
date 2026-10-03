export function canAccessSettings(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canEditOrganization(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canEditBranding(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canEditNotifications(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canAccessSecurity(role?: string | null) {
  return role === "ADMIN";
}

export function canAccessBilling(role?: string | null) {
  return role === "ADMIN";
}
