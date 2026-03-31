
/**
 * User service handles staff management within an organization.
 * All operations enforce tenant isolation by requiring the caller's org ID.
 */

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { validateCreateUser, validateUpdateUser } = require("../validators/userValidator");

// reuse global prisma client when available (jest.setup)
const prisma = global.prisma || new PrismaClient();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

async function createUser(data, organizationId) {
  const { isValid, errors } = validateCreateUser(data);
  if (!isValid) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

  let { email, password, name, role } = data;

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

  const user = await prisma.user.create({
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

  console.log(`USER_CREATED org=${organizationId} user=${user.id} role=${role}`);
  return user;
}

async function listUsers(organizationId, filters = {}) {
  const { page = 1, limit = 20, search, sort = "createdAt", order = "desc" } = filters;
  const skip = (page - 1) * limit;

  const where = {
    organizationId,
    isActive: true,
  };

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

async function updateUser(userId, data, organizationId) {
  const { isValid, errors } = validateUpdateUser(data);
  if (!isValid) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

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

  // if role changed log
  if (data.role && data.role !== existing.role) {
    console.log(
      `ROLE_CHANGE user=${userId} from=${existing.role} to=${data.role}`
    );
  }

  const user = await prisma.user.update({
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

  return user;
}

async function deleteUser(userId, organizationId) {
  const existing = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!existing) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (!existing.isActive) {
    // already deleted
    const err = new Error("User already inactive");
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.update({
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

  console.log(`USER_DEACTIVATED user=${userId}`);
  return user;
}

module.exports = {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
};
