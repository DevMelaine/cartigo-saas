const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const {
  validateAcceptInvitation,
  validateCreateInvitation,
} = require("../validators/invitationValidator");
const { validateCreateUser } = require("../validators/userValidator");
const { sendInvitationEmail } = require("./emailService");
const { logActivity } = require("./activityLog.service");
const { logger } = require("../lib/logger");

const prisma = global.prisma || new PrismaClient();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;

function createError(message, statusCode = 400, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getDashboardBaseUrl() {
  return (process.env.DASHBOARD_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function buildInvitationUrl(token) {
  const url = new URL("/accept-invite", `${getDashboardBaseUrl()}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

function serializeInvitation(invitation) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organizationId: invitation.organizationId,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    createdBy: invitation.createdBy,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
    inviteUrl: invitation.status === "PENDING" ? buildInvitationUrl(invitation.token) : null,
  };
}

async function expireOrganizationInvitations(organizationId) {
  await prisma.invitation.updateMany({
    where: {
      organizationId,
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: {
      status: "EXPIRED",
    },
  });
}

async function expireInvitationIfNeeded(invitation, tx = prisma) {
  if (invitation.status !== "PENDING" || invitation.expiresAt >= new Date()) {
    return invitation;
  }

  return tx.invitation.update({
    where: { id: invitation.id },
    data: { status: "EXPIRED" },
  });
}

async function ensureInvitationContext(authUser) {
  if (!authUser?.organizationId || !authUser?.userId) {
    throw createError("Unauthorized", 401);
  }

  return {
    organizationId: authUser.organizationId,
    userId: authUser.userId,
  };
}

async function ensureEmailAvailable(email, organizationId) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!existingUser) {
    return;
  }

  if (existingUser.organizationId === organizationId) {
    throw createError("Email already belongs to this organization.", 409);
  }

  throw createError("Email already in use.", 409);
}

async function ensureNoPendingInvitation(email, organizationId) {
  const pendingInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      organizationId,
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!pendingInvitation) {
    return;
  }

  const currentInvitation = await expireInvitationIfNeeded(pendingInvitation);

  if (currentInvitation.status === "PENDING") {
    throw createError("An active invitation already exists for this email.", 409);
  }
}

async function getInvitationNotificationContext(organizationId, userId) {
  const [organization, performer] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    organizationName: organization?.name || null,
    performedByName: performer?.name || null,
  };
}

async function sendInvitationEmailSafely({
  invitation,
  inviteUrl,
  organizationId,
  organizationName,
  performedByName,
  warningMessage,
}) {
  try {
    await sendInvitationEmail({
      to: invitation.email,
      role: invitation.role,
      inviteUrl,
      expiresAt: invitation.expiresAt,
      organizationName,
      performedByName,
    });

    return true;
  } catch (error) {
    logger.warn(warningMessage, {
      organizationId,
      invitationId: invitation.id,
      email: invitation.email,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return false;
  }
}

async function createInvitation(data, authUser) {
  const { isValid, errors } = validateCreateInvitation(data);

  if (!isValid) {
    throw createError("Validation failed", 400, errors);
  }

  const { organizationId, userId } = await ensureInvitationContext(authUser);
  const email = normalizeEmail(data.email);

  await expireOrganizationInvitations(organizationId);
  await ensureEmailAvailable(email, organizationId);
  await ensureNoPendingInvitation(email, organizationId);

  const notificationContext = await getInvitationNotificationContext(organizationId, userId);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role: data.role,
      organizationId,
      token: crypto.randomUUID(),
      status: "PENDING",
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      createdBy: userId,
    },
  });

  await logActivity({
    organizationId,
    performedBy: userId,
    action: "INVITATION_CREATED",
    entityType: "invitation",
    entityId: invitation.id,
    entityLabel: email,
  });

  const inviteUrl = buildInvitationUrl(invitation.token);
  const invitationEmailDelivered = await sendInvitationEmailSafely({
    invitation,
    inviteUrl,
    organizationId,
    organizationName: notificationContext.organizationName,
    performedByName: notificationContext.performedByName,
    warningMessage: "Invitation email failed to send.",
  });

  logger.info("Invitation created.", {
    organizationId,
    performedBy: userId,
    invitationId: invitation.id,
    email: invitation.email,
    role: invitation.role,
    invitationEmailDelivered,
  });

  return serializeInvitation(invitation);
}

async function listInvitations(authUser) {
  const { organizationId } = await ensureInvitationContext(authUser);

  await expireOrganizationInvitations(organizationId);

  const invitations = await prisma.invitation.findMany({
    where: { organizationId },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });

  return invitations.map((invitation) => serializeInvitation(invitation));
}

async function resendInvitation(invitationId, authUser) {
  const { organizationId } = await ensureInvitationContext(authUser);

  const [invitation, notificationContext] = await Promise.all([
    prisma.invitation.findFirst({
      where: { id: invitationId, organizationId },
    }),
    getInvitationNotificationContext(organizationId, authUser?.userId || null),
  ]);

  if (!invitation) {
    throw createError("Invitation not found.", 404);
  }

  if (invitation.status === "ACCEPTED") {
    throw createError("Invitation already accepted.", 409);
  }

  const refreshed = await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      token: crypto.randomUUID(),
      status: "PENDING",
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });

  await logActivity({
    organizationId,
    performedBy: authUser?.userId || null,
    action: "INVITATION_RESENT",
    entityType: "invitation",
    entityId: refreshed.id,
    entityLabel: refreshed.email,
  });

  const inviteUrl = buildInvitationUrl(refreshed.token);
  const invitationEmailDelivered = await sendInvitationEmailSafely({
    invitation: refreshed,
    inviteUrl,
    organizationId,
    organizationName: notificationContext.organizationName,
    performedByName: notificationContext.performedByName,
    warningMessage: "Invitation email failed to resend.",
  });

  logger.info("Invitation resent.", {
    organizationId,
    performedBy: authUser?.userId || null,
    invitationId: refreshed.id,
    email: refreshed.email,
    role: refreshed.role,
    invitationEmailDelivered,
  });

  return serializeInvitation(refreshed);
}

async function deleteInvitation(invitationId, authUser) {
  const { organizationId } = await ensureInvitationContext(authUser);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId },
  });

  if (!invitation) {
    throw createError("Invitation not found.", 404);
  }

  if (invitation.status === "ACCEPTED") {
    throw createError("Invitation already accepted.", 409);
  }

  await prisma.invitation.delete({
    where: { id: invitation.id },
  });

  await logActivity({
    organizationId,
    performedBy: authUser?.userId || null,
    action: "INVITATION_DELETED",
    entityType: "invitation",
    entityId: invitation.id,
    entityLabel: invitation.email,
  });

  logger.info("Invitation deleted.", {
    organizationId,
    performedBy: authUser?.userId || null,
    invitationId,
    email: invitation.email,
    status: invitation.status,
  });

  return { message: "Invitation deleted." };
}

async function acceptInvitation(data) {
  const { isValid, errors } = validateAcceptInvitation(data);

  if (!isValid) {
    throw createError("Validation failed", 400, errors);
  }

  const token = data.token.trim();
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw createError("Invitation not found.", 404);
  }

  const normalizedInvitation = await expireInvitationIfNeeded(invitation);

  if (normalizedInvitation.status === "EXPIRED") {
    throw createError("Invitation expired.", 410);
  }

  if (normalizedInvitation.status === "ACCEPTED") {
    throw createError("Invitation already accepted.", 409);
  }

  const userPayload = {
    email: normalizedInvitation.email,
    password: data.password,
    name: data.name,
    role: normalizedInvitation.role,
  };
  const validation = validateCreateUser(userPayload);

  if (!validation.isValid) {
    throw createError("Validation failed", 400, validation.errors);
  }

  await ensureEmailAvailable(
    normalizeEmail(normalizedInvitation.email),
    normalizedInvitation.organizationId
  );

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizeEmail(normalizedInvitation.email),
        password: hashedPassword,
        name: data.name.trim(),
        role: normalizedInvitation.role,
        organizationId: normalizedInvitation.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const acceptedInvitation = await tx.invitation.update({
      where: { id: normalizedInvitation.id },
      data: {
        status: "ACCEPTED",
      },
    });

    await logActivity(
      {
        organizationId: normalizedInvitation.organizationId,
        performedBy: user.id,
        action: "INVITATION_ACCEPTED",
        entityType: "invitation",
        entityId: acceptedInvitation.id,
        entityLabel: acceptedInvitation.email,
      },
      tx
    );

    return {
      user,
      invitation: acceptedInvitation,
    };
  });

  logger.info("Invitation accepted.", {
    organizationId: normalizedInvitation.organizationId,
    invitationId: normalizedInvitation.id,
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
  });

  return {
    user: result.user,
    invitation: serializeInvitation(result.invitation),
  };
}

module.exports = {
  createInvitation,
  listInvitations,
  resendInvitation,
  deleteInvitation,
  acceptInvitation,
};
