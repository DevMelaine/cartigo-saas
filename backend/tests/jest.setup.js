const prisma = require("../src/lib/prisma");

global.prisma = prisma;

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {

  const tables = ["User", "Organization", "RefreshToken"];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }

});

afterAll(async () => {
  await prisma.$disconnect();
});