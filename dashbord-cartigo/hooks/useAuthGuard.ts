"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";

export function useAuthGuard() {
  const { token, isAuthenticated, loading, organizationId, user } = useAuth();

  return useMemo(
    () => ({
      token,
      user,
      organizationId,
      authLoading: loading,
      canQuery: !loading && Boolean(token) && isAuthenticated,
    }),
    [isAuthenticated, loading, organizationId, token, user]
  );
}
