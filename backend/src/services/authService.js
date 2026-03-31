const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const {
  loginSchema,
  registerOrganizationSchema,
  googleCallbackSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validator");
const {
  exchangeGoogleCode,
  fetchGoogleProfile,
} = require("../utils/googleOAuth");
const { sendPasswordResetEmail } = require("./emailService");

const prisma = global.prisma || new PrismaClient();

function validatePayload(schema, data, message = "Validation failed") {
  const validation = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (validation.error) {
    const error = new Error(message);
    error.statusCode = 400;
    error.details = validation.error.details.map((detail) => detail.message);
    throw error;
  }

  return validation.value;
}

function buildPublicUserInclude() {
  return {
    organization: {
      include: {
        category: true,
      },
    },
  };
}

function createError(message, statusCode = 400, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getDashboardBaseUrl() {
  return (process.env.DASHBOARD_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function buildPasswordResetUrl(token) {
  const url = new URL("/reset-password", `${getDashboardBaseUrl()}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

async function createAuditLog(data) {
  await prisma.auditLog.create({ data });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: buildPublicUserInclude(),
  });
}

async function ensureOrganizationCategory(categoryId) {
  const organizationCategory = await prisma.organizationCategory.findUnique({
    where: { id: categoryId },
  });

  if (!organizationCategory) {
    throw createError("Invalid organization category", 400);
  }

  return organizationCategory;
}

async function createUserWithOrganization({
  organizationName,
  categoryId,
  adminName,
  email,
  password,
}) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw createError("Email already in use", 409);
  }

  const organizationCategory = await ensureOrganizationCategory(categoryId);
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        categoryId: organizationCategory.id,
      },
      include: {
        category: true,
      },
    });

    const user = await tx.user.create({
      data: {
        name: adminName,
        email,
        password: hashedPassword,
        role: "ADMIN",
        organizationId: organization.id,
      },
    });

    return { organization, user };
  });
}

async function ensureActiveUser(user, context = {}) {
  if (!user) {
    await createAuditLog({
      userId: null,
      organizationId: null,
      action: context.failedAction || "LOGIN_FAILED",
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    throw createError("Invalid credentials", 401);
  }

  if (!user.isActive) {
    throw createError("Account is disabled", 403);
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    await createAuditLog({
      userId: user.id,
      organizationId: user.organizationId,
      action: "ACCOUNT_LOCKED",
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    throw createError(
      "Account is temporarily locked due to too many failed login attempts",
      423
    );
  }

  return user;
}

async function resetFailedLoginState(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockUntil: null,
    },
  });
}

async function handleFailedPasswordAttempt(user, context) {
  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const updates = {
    failedLoginAttempts: failedAttempts,
  };
  let action = "LOGIN_FAILED";

  if (failedAttempts >= 5) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + 15);
    updates.lockUntil = lockUntil;
    action = "ACCOUNT_LOCKED";
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: updates,
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        action,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    }),
  ]);

  throw createError("Invalid credentials", 401);
}

async function findOrCreateGoogleUser(profile) {
  const email = profile.email.trim().toLowerCase();
  const googleId = profile.sub;
  const normalizedName =
    (typeof profile.name === "string" && profile.name.trim()) ||
    email.split("@")[0] ||
    "Cartigo User";

  const byGoogleId = await prisma.user.findUnique({
    where: { googleId },
    include: buildPublicUserInclude(),
  });

  if (byGoogleId) {
    return byGoogleId;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email },
    include: buildPublicUserInclude(),
  });

  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== googleId) {
      throw createError("This email is already linked to another Google account.", 409);
    }

    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId,
        name: byEmail.name || normalizedName,
      },
      include: buildPublicUserInclude(),
    });
  }

  const randomPasswordHash = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    10
  );

  return prisma.user.create({
    data: {
      email,
      googleId,
      name: normalizedName,
      password: randomPasswordHash,
      role: "ADMIN",
      organizationId: null,
    },
    include: buildPublicUserInclude(),
  });
}

module.exports = {
  async registerOrganization(data) {
    const value = validatePayload(
      registerOrganizationSchema,
      data,
      "Validation failed"
    );

    const organizationName = (value.organizationName || value.name).trim();
    const adminName = value.adminName.trim();
    const email = value.email.trim().toLowerCase();

    return createUserWithOrganization({
      organizationName,
      categoryId: value.categoryId,
      adminName,
      email,
      password: value.password,
    });
  },

  async login(data, context) {
    const value = validatePayload(loginSchema, data, "Invalid credentials");
    const email = value.email.trim().toLowerCase();
    const password = value.password;

    const user = await findUserByEmail(email);
    await ensureActiveUser(user, {
      ...context,
      failedAction: "LOGIN_FAILED",
    });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await handleFailedPasswordAttempt(user, context);
    }

    await resetFailedLoginState(user.id);

    await createAuditLog({
      userId: user.id,
      organizationId: user.organizationId,
      action: "LOGIN_SUCCESS",
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return user;
  },

  async loginWithGoogle(data, context) {
    const value = validatePayload(
      googleCallbackSchema,
      data,
      "Invalid Google callback payload"
    );

    if (!data.expectedState || value.state !== data.expectedState) {
      throw createError("Invalid OAuth state", 401);
    }

    const tokens = await exchangeGoogleCode(value.code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const user = await findOrCreateGoogleUser(profile);

    await ensureActiveUser(user, {
      ...context,
      failedAction: "GOOGLE_LOGIN_FAILED",
    });

    await resetFailedLoginState(user.id);

    await createAuditLog({
      userId: user.id,
      organizationId: user.organizationId,
      action: "GOOGLE_LOGIN_SUCCESS",
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return user;
  },

  async requestPasswordReset(data) {
    const value = validatePayload(
      forgotPasswordSchema,
      data,
      "Invalid forgot password payload"
    );
    const email = value.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: true };
    }

    const token = createPasswordResetToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: "PASSWORD_RESET_REQUESTED",
        },
      }),
    ]);

    await sendPasswordResetEmail({
      to: user.email,
      resetUrl: buildPasswordResetUrl(token),
      name: user.name,
    });

    return { success: true };
  },

  async resetPassword(data) {
    const value = validatePayload(
      resetPasswordSchema,
      data,
      "Invalid reset password payload"
    );
    const tokenHash = hashOpaqueToken(value.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!resetToken || resetToken.expiresAt <= new Date()) {
      throw createError("Invalid or expired reset token", 400);
    }

    const hashedPassword = await bcrypt.hash(value.password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      }),
      prisma.refreshToken.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: resetToken.userId,
          organizationId: resetToken.user.organizationId,
          action: "PASSWORD_RESET_COMPLETED",
        },
      }),
    ]);

    return { success: true };
  },

  async getCurrentUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: buildPublicUserInclude(),
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    return user;
  },
};
