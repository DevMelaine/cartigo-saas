const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { registerSchema, loginSchema } = require("../validators/customer.validator");

// use global prisma in tests
const prisma = global.prisma || new PrismaClient();

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function registerCustomer(data) {
  const { error } = registerSchema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = error.details.map((d) => d.message);
    throw err;
  }

  const normalizedEmail = normalizeEmail(data.email);
  const normalizedName = data.name.trim();
  const { password } = data;

  const existing = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);

  const customer = await prisma.customer.create({
    data: {
      name: normalizedName,
      email: normalizedEmail,
      password: hashed,
      isActive: true,
    },
  });

  return customer;
}

async function loginCustomer(data) {
  const { error } = loginSchema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const normalizedEmail = normalizeEmail(data.email);
  const { password } = data;

  const customer = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
  if (!customer || !customer.isActive) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, customer.password);
  if (!match) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  return customer;
}

async function getCustomerById(id) {
  return prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

module.exports = {
  registerCustomer,
  loginCustomer,
  getCustomerById,
};
