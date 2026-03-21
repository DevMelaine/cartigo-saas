const { PrismaClient } = require("@prisma/client");
const {
  seedOrganizationCategories,
  backfillOrganizationCategories,
} = require("./scripts/backfillOrganizationCategories");

const prisma = new PrismaClient();

async function main() {
  try {
    await seedOrganizationCategories(prisma);
    await backfillOrganizationCategories(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Prisma seed failed", error);
    process.exit(1);
  });
}

module.exports = {
  seedOrganizationCategories,
};
