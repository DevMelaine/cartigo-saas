const { PrismaClient } = require("@prisma/client");

const prisma = global.prisma || new PrismaClient();

const DEFAULT_ORGANIZATION_CATEGORY_NAME = "Supermarket";

async function ensureOrganizationCategory(
  name = DEFAULT_ORGANIZATION_CATEGORY_NAME
) {
  return prisma.organizationCategory.upsert({
    where: { name },
    update: {},
    create: { name },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
}

async function createTestOrganization({
  name = `Test Organization ${Date.now()}`,
  categoryName = DEFAULT_ORGANIZATION_CATEGORY_NAME,
  ...rest
} = {}) {
  const category = await ensureOrganizationCategory(categoryName);

  return prisma.organization.create({
    data: {
      name,
      categoryId: category.id,
      ...rest,
    },
    include: {
      category: true,
    },
  });
}

module.exports = {
  DEFAULT_ORGANIZATION_CATEGORY_NAME,
  ensureOrganizationCategory,
  createTestOrganization,
};
