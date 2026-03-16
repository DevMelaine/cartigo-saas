const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const defaultOrganizationCategories = [
  {
    name: "Supermarche",
    description: "Commerces alimentaires et de grande distribution.",
  },
  {
    name: "Restaurant",
    description: "Restaurants, snacks et services de restauration.",
  },
  {
    name: "Pharmacie",
    description: "Pharmacies et points de vente de produits de sante.",
  },
  {
    name: "Boutique",
    description: "Boutiques, commerces de detail et magasins specialises.",
  },
];

async function main() {
  for (const category of defaultOrganizationCategories) {
    const existingCategory = await prisma.organizationCategory.findFirst({
      where: {
        name: {
          equals: category.name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCategory) {
      await prisma.organizationCategory.update({
        where: {
          id: existingCategory.id,
        },
        data: {
          name: category.name,
          description: category.description,
        },
      });
      continue;
    }

    await prisma.organizationCategory.create({
      data: category,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Organization category seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
