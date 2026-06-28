export const INVITABLE_ROLES = ["MANAGER", "CASHIER", "STAFF"] as const;
export type InvitationRole = (typeof INVITABLE_ROLES)[number];

export const INVITATION_STATUSES = ["PENDING", "ACCEPTED", "EXPIRED"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export type Invitation = {
  id: string;
  email: string;
  role: InvitationRole;
  organizationId: string;
  status: InvitationStatus;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  inviteUrl: string | null;
};

export type SendInvitationInput = {
  email: string;
  role: InvitationRole;
};

export type AcceptInvitationInput = {
  token: string;
  name: string;
  password: string;
};

export type AcceptedInvitationUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AcceptInvitationResponse = {
  user: AcceptedInvitationUser;
  invitation: Invitation;
};
