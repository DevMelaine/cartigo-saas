"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  ApiError,
  clearAccessToken,
  getAccessToken,
  subscribeToAccessToken,
  subscribeToAuthFailure,
} from "@/services/api";
import { getPermissionsForRole, hasPermissionForRole } from "@/lib/permissions";
import * as authService from "@/services/auth";
import type { AuthSession, LoginInput, RegisterOrganizationInput } from "@/types/auth";

type AuthContextValue = {
  user: AuthSession["user"] | null;
  organization: AuthSession["organization"] | null;
  token: string | null;
  role: AuthSession["user"]["role"] | null;
  permissions: AuthSession["user"]["permissions"];
  organizationId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  login: (payload: LoginInput) => Promise<AuthSession>;
  registerOrganization: (payload: RegisterOrganizationInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthSession | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_QUERY_KEY = ["auth", "me"] as const;

async function fetchCurrentUser() {
  try {
    return await authService.getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
      return null;
    }

    throw error;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(subscribeToAccessToken, getAccessToken, () => null);

  const authQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.registerOrganization,
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSettled: async () => {
      clearAccessToken();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });

  useEffect(() => {
    return subscribeToAuthFailure(() => {
      clearAccessToken();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
    });
  }, [queryClient]);

  const login = useCallback(
    async (payload: LoginInput) => loginMutation.mutateAsync(payload),
    [loginMutation]
  );

  const registerOrganization = useCallback(
    async (payload: RegisterOrganizationInput) => registerMutation.mutateAsync(payload),
    [registerMutation]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const refreshUser = useCallback(async () => {
    const result = await queryClient.fetchQuery({
      queryKey: AUTH_QUERY_KEY,
      queryFn: fetchCurrentUser,
    });

    return result;
  }, [queryClient]);

  const role = authQuery.data?.user.role ?? null;
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);
  const hasPermission = useCallback(
    (permission: string) => hasPermissionForRole(role, permission),
    [role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: authQuery.data?.user ?? null,
      organization: authQuery.data?.organization ?? null,
      token,
      role,
      permissions,
      organizationId:
        authQuery.data?.user.organizationId ??
        authQuery.data?.organization?.id ??
        null,
      isAuthenticated: Boolean(token && authQuery.data?.user),
      loading:
        authQuery.isLoading ||
        loginMutation.isPending ||
        registerMutation.isPending ||
        logoutMutation.isPending,
      hasPermission,
      login,
      registerOrganization,
      logout,
      refreshUser,
    }),
    [
      authQuery.data,
      authQuery.isLoading,
      hasPermission,
      login,
      loginMutation.isPending,
      logout,
      logoutMutation.isPending,
      permissions,
      refreshUser,
      registerMutation.isPending,
      registerOrganization,
      role,
      token,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }

  return context;
}
