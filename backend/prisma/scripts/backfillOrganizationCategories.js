const { randomUUID } = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_CATEGORY_SEEDS = [
  {
    name: "Restaurant",
    description: "Restaurants, snacks et services de restauration.",
  },
  {
    name: "Supermarche",
    description: "Commerces alimentaires et de grande distribution.",
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

const DEFAULT_CATEGORY_NAMES = DEFAULT_CATEGORY_SEEDS.map((category) => category.name);
const DEFAULT_BACKFILL_CATEGORY = "Boutique";

async function getOrganizationCategoryColumns(client) {
  const rows = await client.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OrganizationCategory'
  `);

  return new Set(rows.map((row) => row.column_name));
}

async function insertOrganizationCategory(client, category) {
  const columns = await getOrganizationCategoryColumns(client);
  const values = [randomUUID(), category.name];
  const insertColumns = ['"id"', '"name"'];
  const placeholders = ["$1", "$2"];

  if (columns.has("description")) {
    values.push(category.description ?? null);
    insertColumns.push('"description"');
    placeholders.push(`$${values.length}`);
  }

  if (columns.has("createdAt")) {
    values.push(new Date());
    insertColumns.push('"createdAt"');
    placeholders.push(`$${values.length}`);
  }

  if (columns.has("updatedAt")) {
    values.push(new Date());
    insertColumns.push('"updatedAt"');
    placeholders.push(`$${values.length}`);
  }

  await client.$executeRawUnsafe(
    `
      INSERT INTO "OrganizationCategory" (${insertColumns.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT ("name") DO NOTHING
    `,
    ...values
  );
}

async function seedOrganizationCategories(client = prisma) {
  const existingCategories = await client.organizationCategory.findMany({
    select: { name: true },
  });

  const existingNames = new Set(existingCategories.map((category) => category.name));

  for (const category of DEFAULT_CATEGORY_SEEDS) {
    if (existingNames.has(category.name)) {
      continue;
    }

    await insertOrganizationCategory(client, category);
  }
}

async function backfillOrganizationCategories(client = prisma) {
  await seedOrganizationCategories(client);

  const fallbackCategory = await client.organizationCategory.findUnique({
    where: { name: DEFAULT_BACKFILL_CATEGORY },
    select: { id: true },
  });

  if (!fallbackCategory) {
    throw new Error(`Unable to find fallback organization category "${DEFAULT_BACKFILL_CATEGORY}".`);
  }

  await client.$executeRawUnsafe(
    'UPDATE "Organization" SET "categoryId" = $1 WHERE "categoryId" IS NULL',
    fallbackCategory.id
  );
}

async function main() {
  try {
    await backfillOrganizationCategories();
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Organization category backfill failed", error);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_CATEGORY_SEEDS,
  DEFAULT_CATEGORY_NAMES,
  DEFAULT_BACKFILL_CATEGORY,
  seedOrganizationCategories,
  backfillOrganizationCategories,
};
