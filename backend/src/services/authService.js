const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function validateRegisterOrganizationInput(body) {
  const errors = [];

  if (!body.name || typeof body.name !== "string") {
    errors.push("Organization name is required.");
  }
  if (!body.adminName || typeof body.adminName !== "string") {
    errors.push("Admin name is required.");
  }
  if (!body.email || typeof body.email !== "string") {
    errors.push("Email is required.");
  } else if (!/^\S+@\S+\.\S+$/.test(body.email)) {
    errors.push("Email is invalid.");
  }
  if (!body.password || typeof body.password !== "string") {
    errors.push("Password is required.");
  } else if (body.password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateLoginInput(body) {
  const errors = [];

  if (!body.email || typeof body.email !== "string") {
    errors.push("Email is required.");
  }
  if (!body.password || typeof body.password !== "string") {
    errors.push("Password is required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function registerOrganization(data) {
  const { isValid, errors } = validateRegisterOrganizationInput(data);
  if (!isValid) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  const { name, adminName, email, password } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name,
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
  const { isValid, errors } = validateLoginInput(data);
  if (!isValid) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const { email, password } = data;
  const ipAddress = context?.ipAddress;
  const userAgent = context?.userAgent;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: true,
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
