"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as invitationService from "@/services/invitations";
import type { AcceptInvitationInput, SendInvitationInput } from "@/types/invitation";

export const invitationKeys = {
  all: ["invitations"] as const,
  list: () => [...invitationKeys.all, "list"] as const,
};

export function useInvitations(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const query = useQuery({
    queryKey: invitationKeys.list(),
    queryFn: invitationService.getInvitations,
    enabled: enabled && canQuery,
    staleTime: 30_000,
    retry: false,
  });

  return {
    invitations: query.data ?? [],
    isLoading: authLoading || query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: async () => {
      if (!enabled || !canQuery) {
        return;
      }

      await query.refetch();
    },
  };
}

export function useInvitationMutations() {
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (payload: SendInvitationInput) => invitationService.sendInvitation(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (payload: AcceptInvitationInput) => invitationService.acceptInvitation(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });

  return {
    sendInvitation: sendMutation.mutateAsync,
    acceptInvitation: acceptMutation.mutateAsync,
    isSending: sendMutation.isPending,
    isAccepting: acceptMutation.isPending,
  };
}
