-- CreateTable
CREATE TABLE "OrganizationCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "categoryId" TEXT;

-- Seed predefined categories required by the business flow.
INSERT INTO "OrganizationCategory" ("id", "name", "description", "createdAt", "updatedAt")
VALUES
    ('11111111-1111-4111-8111-111111111111', 'Boutique', 'Commerces de detail et magasins specialises.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-4222-8222-222222222222', 'Supermarche', 'Commerces alimentaires et grande distribution.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('33333333-3333-4333-8333-333333333333', 'Restaurant', 'Restaurants, snacks et services de restauration.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-8444-444444444444', 'Pharmacie', 'Pharmacies et points de vente de produits de sante.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill normalized category rows from the legacy Organization.category text column.
WITH normalized_categories AS (
    SELECT
        LOWER(BTRIM("category")) AS normalized_name,
        MIN(BTRIM("category")) AS display_name
    FROM "Organization"
    WHERE "category" IS NOT NULL
      AND BTRIM("category") <> ''
    GROUP BY LOWER(BTRIM("category"))
)
INSERT INTO "OrganizationCategory" ("id", "name", "description", "createdAt", "updatedAt")
SELECT
    LOWER(
        SUBSTRING(md5(normalized_name), 1, 8) || '-' ||
        SUBSTRING(md5(normalized_name), 9, 4) || '-' ||
        SUBSTRING(md5(normalized_name), 13, 4) || '-' ||
        SUBSTRING(md5(normalized_name), 17, 4) || '-' ||
        SUBSTRING(md5(normalized_name), 21, 12)
    ),
    display_name,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM normalized_categories
WHERE NOT EXISTS (
    SELECT 1
    FROM "OrganizationCategory" AS existing_category
    WHERE LOWER(existing_category."name") = normalized_categories.normalized_name
);

-- Link organizations to the newly created relation rows.
UPDATE "Organization" AS org
SET "categoryId" = org_category."id"
FROM "OrganizationCategory" AS org_category
WHERE org."category" IS NOT NULL
  AND BTRIM(org."category") <> ''
  AND LOWER(BTRIM(org."category")) = LOWER(org_category."name");

-- Guarantee a required category for legacy organizations without one by assigning Boutique.
UPDATE "Organization"
SET "categoryId" = '11111111-1111-4111-8111-111111111111'
WHERE "categoryId" IS NULL;

-- Remove old indexes using the legacy text column before dropping it.
DROP INDEX IF EXISTS "Organization_category_idx";
DROP INDEX IF EXISTS "Organization_isPublic_isActive_category_idx";

-- Drop the legacy text column now that relation data is backfilled.
ALTER TABLE "Organization" DROP COLUMN "category";
ALTER TABLE "Organization" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCategory_name_key" ON "OrganizationCategory"("name");
CREATE INDEX "OrganizationCategory_createdAt_idx" ON "OrganizationCategory"("createdAt");
CREATE INDEX "Organization_categoryId_idx" ON "Organization"("categoryId");
CREATE INDEX "Organization_isPublic_isActive_categoryId_idx" ON "Organization"("isPublic", "isActive", "categoryId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OrganizationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
