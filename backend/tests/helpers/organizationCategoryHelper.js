const prisma = global.prisma || require("../../src/lib/prisma");

async function ensureOrganizationCategory({
  name = "Boutique",
  description = "Categorie par defaut pour les organisations de test.",
} = {}) {
  const existingCategory = await prisma.organizationCategory.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existingCategory) {
    return existingCategory;
  }

  return prisma.organizationCategory.create({
    data: {
      name,
      description,
    },
  });
}

async function createOrganizationForTest(overrides = {}) {
  const categoryId = overrides.categoryId || (await ensureOrganizationCategory()).id;

  return prisma.organization.create({
    data: {
      name: overrides.name || `Org Test ${Date.now()}`,
      categoryId,
      logo: overrides.logo ?? null,
      isPublic: overrides.isPublic ?? true,
      isActive: overrides.isActive ?? true,
      address: overrides.address ?? null,
    },
  });
}

module.exports = {
  ensureOrganizationCategory,
  createOrganizationForTest,
};
