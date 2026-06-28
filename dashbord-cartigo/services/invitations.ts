import { z } from "zod";

import { apiRequest, apiRequestRaw } from "@/services/api";
import type {
  AcceptInvitationInput,
  AcceptInvitationResponse,
  Invitation,
  SendInvitationInput,
} from "@/types/invitation";

const invitationSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["MANAGER", "CASHIER", "STAFF"]),
  organizationId: z.string().min(1),
  status: z.enum(["PENDING", "ACCEPTED", "EXPIRED"]),
  expiresAt: z.string(),
  createdBy: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  inviteUrl: z.string().url().nullable(),
});

const invitationListEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(invitationSchema),
});

const sendInvitationInputSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["MANAGER", "CASHIER", "STAFF"]),
});

const acceptInvitationInputSchema = z.object({
  token: z.string().trim().min(16),
  name: z.string().trim().min(1),
  password: z.string().min(8),
});

const acceptedUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().trim().min(1),
  isActive: z.boolean(),
  organizationId: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const acceptInvitationResponseSchema = z.object({
  user: acceptedUserSchema,
  invitation: invitationSchema,
});

function normalizeSendInvitationPayload(payload: SendInvitationInput) {
  const parsed = sendInvitationInputSchema.parse(payload);

  return {
    email: parsed.email.toLowerCase(),
    role: parsed.role,
  };
}

function normalizeAcceptInvitationPayload(payload: AcceptInvitationInput) {
  const parsed = acceptInvitationInputSchema.parse(payload);

  return {
    token: parsed.token,
    name: parsed.name,
    password: parsed.password,
  };
}

export async function getInvitations(): Promise<Invitation[]> {
  const payload = await apiRequestRaw<unknown>("/invitations", {
    method: "GET",
  });
  const parsed = invitationListEnvelopeSchema.parse(payload);

  return parsed.data satisfies Invitation[];
}

export async function sendInvitation(payload: SendInvitationInput): Promise<Invitation> {
  const data = await apiRequest<unknown>("/invitations", {
    method: "POST",
    body: normalizeSendInvitationPayload(payload),
  });

  return invitationSchema.parse(data) satisfies Invitation;
}

export async function acceptInvitation(
  payload: AcceptInvitationInput
): Promise<AcceptInvitationResponse> {
  const data = await apiRequest<unknown>("/invitations/accept", {
    method: "POST",
    body: normalizeAcceptInvitationPayload(payload),
    requiresAuth: false,
  });

  return acceptInvitationResponseSchema.parse(data) satisfies AcceptInvitationResponse;
}
