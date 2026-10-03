export function canAccessAnalytics(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}
