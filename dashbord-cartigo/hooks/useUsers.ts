"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as userService from "@/services/users";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListParams,
} from "@/types/user";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  detail: (userId: string) => [...userKeys.all, "detail", userId] as const,
};

function defaultPagination(filters: UserListParams) {
  return {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
    total: 0,
    totalPages: 0,
  };
}

export function useUsers(filters: UserListParams, enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const listQuery = useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => userService.getUsers(filters),
    enabled: enabled && canQuery,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });

  return {
    users: listQuery.data?.data ?? [],
    pagination: listQuery.data?.pagination ?? defaultPagination(filters),
    isLoading: authLoading || listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error instanceof Error ? listQuery.error.message : null,
    refetch: async () => {
      if (!enabled || !canQuery) {
        return;
      }

      await listQuery.refetch();
    },
  };
}

export function useUserMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserInput) => userService.createUser(payload),
    onSuccess: async (user) => {
      queryClient.setQueryData(userKeys.detail(user.id), user);
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateUserInput;
    }) => userService.updateUser(userId, payload),
    onSuccess: async (user) => {
      queryClient.setQueryData(userKeys.detail(user.id), user);
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });

  return {
    createUser: createMutation.mutateAsync,
    updateUser: updateMutation.mutateAsync,
    deleteUser: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    updatingUserId: updateMutation.variables?.userId ?? null,
    deletingUserId: deleteMutation.variables ?? null,
  };
}
