require("dotenv").config({ path: ".env.test" });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

global.prisma = prisma;

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
});
