const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { loginSchema, registerOrganizationSchema } = require("../validators/auth.validator");

// share prisma instance when available (tests set global.prisma)
const prisma = global.prisma || new PrismaClient();

async function registerOrganization(data) {
  const validation = registerOrganizationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (validation.error) {
    const validationError = new Error("Validation failed");
    validationError.statusCode = 400;
    validationError.details = validation.error.details.map((detail) => detail.message);
    throw validationError;
  }

  const { value } = validation;
  const organizationName = (value.organizationName || value.name).trim();
  const adminName = value.adminName.trim();
  const email = value.email.trim().toLowerCase();
  const { password, categoryId } = value;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  const organizationCategory = await prisma.organizationCategory.findUnique({
    where: { id: categoryId },
  });

  if (!organizationCategory) {
    const error = new Error("Invalid organization category");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
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

  return result;
}

async function login(data, context) {
  const validation = loginSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (validation.error) {
    const authError = new Error("Invalid credentials");
    authError.statusCode = 401;
    throw authError;
  }

  const { value } = validation;
  const email = value.email.trim().toLowerCase();
  const { password } = value;
  const ipAddress = context?.ipAddress;
  const userAgent = context?.userAgent;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: {
        include: {
          category: true,
        },
      },
    },
  });

  const now = new Date();

  if (!user) {
    await prisma.auditLog.create({
      data: {
        userId: null,
        organizationId: null,
        action: "LOGIN_FAILED",
        ipAddress,
        userAgent,
      },
    });

    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  if (user.lockUntil && user.lockUntil > now) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        action: "ACCOUNT_LOCKED",
        ipAddress,
        userAgent,
      },
    });

    const error = new Error("Account is temporarily locked due to too many failed login attempts");
    error.statusCode = 423;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
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
          ipAddress,
          userAgent,
        },
      }),
    ]);

    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockUntil: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      action: "LOGIN_SUCCESS",
      ipAddress,
      userAgent,
    },
  });

  return user;
}

module.exports = {
  registerOrganization,
  login,
};
