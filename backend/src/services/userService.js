
/**
 * User service handles staff management within an organization.
 * All operations enforce tenant isolation by requiring the caller's org ID.
 */

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { validateCreateUser, validateUpdateUser } = require("../validators/userValidator");
const { logActivity } = require("./activityLog.service");
const { logger } = require("../lib/logger");
const {
  sendUserUpdatedEmail,
  sendUserDeactivatedEmail,
  sendUserReactivatedEmail,
  sendUserDeletedEmail,
} = require("./emailService");

// reuse global prisma client when available (jest.setup)
const prisma = global.prisma || new PrismaClient();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

function resolveAuthContext(authContext) {
  if (typeof authContext === "string") {
    return {
      organizationId: authContext,
      performedBy: null,
    };
  }

  return {
    organizationId: authContext?.organizationId || null,
    performedBy: authContext?.userId || null,
  };
}

function buildUserEntityLabel(user) {
  return `${user.name} (${user.email})`;
}

async function getNotificationContext(organizationId, performedBy) {
  const [organization, performer] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    performedBy
      ? prisma.user.findUnique({
          where: { id: performedBy },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    organizationName: organization?.name || null,
    performedByName: performer?.name || null,
  };
}

async function safelySendUserEmail(sendEmail, loggerMessage, meta) {
  try {
    await sendEmail();
    return true;
  } catch (error) {
    logger.warn(loggerMessage, {
      ...meta,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

async function createUser(data, authContext) {
  const { isValid, errors } = validateCreateUser(data);
  if (!isValid) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

  let { email, password, name, role } = data;

  const { organizationId, performedBy } = resolveAuthContext(authContext);

  // ensure organization
  if (!organizationId) {
    const err = new Error("Organization context is required.");
    err.statusCode = 400;
    throw err;
  }

  email = email.toLowerCase();
  // check unique email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("Email already in use.");
    err.statusCode = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        password: hashed,
        name: name.trim(),
        role,
        organizationId,
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

    await logActivity(
      {
        organizationId,
        performedBy,
        action: "USER_CREATED",
        entityType: "user",
        entityId: createdUser.id,
        entityLabel: buildUserEntityLabel(createdUser),
      },
      tx
    );

    return createdUser;
  });

  logger.info("User created.", {
    organizationId,
    performedBy,
    userId: user.id,
    email: user.email,
    role,
  });
  return user;
}

async function listUsers(organizationId, filters = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    sort = "createdAt",
    order = "desc",
    status = "active",
  } = filters;
  const skip = (page - 1) * limit;

  const where = {
    organizationId,
  };

  if (status === "inactive") {
    where.isActive = false;
  } else if (status !== "all") {
    where.isActive = true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const validSort = ["name", "email", "createdAt", "updatedAt"];
  const sortField = validSort.includes(sort) ? sort : "createdAt";
  const sortOrder = order.toLowerCase() === "asc" ? "asc" : "desc";

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        [sortField]: sortOrder,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: users,
    pagination: { page, limit, total, totalPages },
  };
}

async function getUserById(userId, organizationId) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId,
      isActive: true,
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

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return user;
}

async function updateUser(userId, data, authContext) {
  const { isValid, errors } = validateUpdateUser(data);
  if (!isValid) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

  const { organizationId, performedBy } = resolveAuthContext(authContext);

  const existing = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!existing) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  const shouldLogProfileUpdate =
    (data.name !== undefined && data.name.trim() !== existing.name) ||
    (data.role !== undefined && data.role !== existing.role);
  const shouldLogStatusChange =
    data.isActive !== undefined && data.isActive !== existing.isActive;

  if (
    shouldLogStatusChange &&
    existing.role === "ADMIN" &&
    performedBy &&
    existing.id === performedBy
  ) {
    const err = new Error("Admins cannot change their own active status.");
    err.statusCode = 403;
    throw err;
  }

  // if role changed log
  if (data.role && data.role !== existing.role) {
    logger.info("User role changed.", {
      organizationId,
      userId,
      previousRole: existing.role,
      nextRole: data.role,
    });
  }

  const notificationContext =
    shouldLogProfileUpdate || shouldLogStatusChange
      ? await getNotificationContext(organizationId, performedBy)
      : {
          organizationName: null,
          performedByName: null,
        };

  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: updateData,
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

    if (shouldLogProfileUpdate) {
      await logActivity(
        {
          organizationId,
          performedBy,
          action: "USER_UPDATED",
          entityType: "user",
          entityId: updatedUser.id,
          entityLabel: buildUserEntityLabel(updatedUser),
        },
        tx
      );
    }

    if (shouldLogStatusChange) {
      await logActivity(
        {
          organizationId,
          performedBy,
          action: "USER_STATUS_CHANGED",
          entityType: "user",
          entityId: updatedUser.id,
          entityLabel: buildUserEntityLabel(updatedUser),
        },
        tx
      );
    }

    return updatedUser;
  });

  let profileEmailDelivered = null;
  let statusEmailDelivered = null;

  if (shouldLogProfileUpdate && user.email) {
    profileEmailDelivered = await safelySendUserEmail(
      () =>
        sendUserUpdatedEmail({
          to: user.email,
          name: user.name,
          role: user.role,
          organizationName: notificationContext.organizationName,
          performedByName: notificationContext.performedByName,
        }),
      "User update email failed.",
      {
        organizationId,
        userId,
        performedBy,
        email: user.email,
      }
    );
  }

  if (shouldLogStatusChange && user.email) {
    statusEmailDelivered = await safelySendUserEmail(
      () =>
        user.isActive
          ? sendUserReactivatedEmail({
              to: user.email,
              name: user.name,
              organizationName: notificationContext.organizationName,
              performedByName: notificationContext.performedByName,
            })
          : sendUserDeactivatedEmail({
              to: user.email,
              name: user.name,
              organizationName: notificationContext.organizationName,
              performedByName: notificationContext.performedByName,
            }),
      "User status email failed.",
      {
        organizationId,
        userId,
        performedBy,
        email: user.email,
      }
    );
  }

  logger.info("User updated.", {
    organizationId,
    performedBy,
    userId,
    email: user.email,
    previousRole: existing.role,
    nextRole: user.role,
    previousIsActive: existing.isActive,
    nextIsActive: user.isActive,
    profileChanged: shouldLogProfileUpdate,
    statusChanged: shouldLogStatusChange,
    profileEmailDelivered,
    statusEmailDelivered,
  });
  return user;
}

async function deleteUser(userId, authContext) {
  const { organizationId, performedBy } = resolveAuthContext(authContext);
  const existing = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!existing) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (!existing.isActive) {
    const err = new Error("User already inactive");
    err.statusCode = 400;
    throw err;
  }

  if (existing.role === "ADMIN" && performedBy && existing.id === performedBy) {
    const err = new Error("Admins cannot deactivate themselves.");
    err.statusCode = 403;
    throw err;
  }

  const notificationContext = await getNotificationContext(organizationId, performedBy);

  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { isActive: false },
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

    await logActivity(
      {
        organizationId,
        performedBy,
        action: "USER_STATUS_CHANGED",
        entityType: "user",
        entityId: updatedUser.id,
        entityLabel: buildUserEntityLabel(updatedUser),
      },
      tx
    );

    return updatedUser;
  });

  let statusEmailDelivered = null;

  if (user.email) {
    statusEmailDelivered = await safelySendUserEmail(
      () =>
        sendUserDeactivatedEmail({
          to: user.email,
          name: user.name,
          organizationName: notificationContext.organizationName,
          performedByName: notificationContext.performedByName,
        }),
      "User deactivation email failed.",
      {
        organizationId,
        userId,
        performedBy,
        email: user.email,
      }
    );
  }

  logger.info("User deactivated.", {
    organizationId,
    performedBy,
    userId,
    email: user.email,
    statusEmailDelivered,
  });

  return user;
}

async function deleteUserPermanently(userId, authContext) {
  const { organizationId, performedBy } = resolveAuthContext(authContext);
  const existing = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!existing) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (existing.isActive) {
    const err = new Error("User must be inactive before deletion.");
    err.statusCode = 400;
    throw err;
  }

  if (existing.role === "ADMIN" && performedBy && existing.id === performedBy) {
    const err = new Error("Admins cannot delete themselves.");
    err.statusCode = 403;
    throw err;
  }

  const notificationContext = await getNotificationContext(organizationId, performedBy);

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({
      where: { id: userId },
    });

    await logActivity(
      {
        organizationId,
        performedBy,
        action: "USER_DELETED",
        entityType: "user",
        entityId: existing.id,
        entityLabel: buildUserEntityLabel(existing),
      },
      tx
    );
  });

  let deletionEmailDelivered = null;

  if (existing.email) {
    deletionEmailDelivered = await safelySendUserEmail(
      () =>
        sendUserDeletedEmail({
          to: existing.email,
          name: existing.name,
          organizationName: notificationContext.organizationName,
          performedByName: notificationContext.performedByName,
        }),
      "User deletion email failed.",
      {
        organizationId,
        userId,
        performedBy,
        email: existing.email,
      }
    );
  }

  logger.info("User permanently deleted.", {
    organizationId,
    performedBy,
    userId,
    email: existing.email,
    deletionEmailDelivered,
  });

  return { message: "User deleted." };
}

module.exports = {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  deleteUserPermanently,
};
