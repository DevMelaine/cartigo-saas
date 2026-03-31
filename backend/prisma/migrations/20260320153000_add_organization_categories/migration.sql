CREATE TABLE IF NOT EXISTS "OrganizationCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationCategory_name_key" ON "OrganizationCategory"("name");

ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OrganizationCategory'
      AND column_name = 'updatedAt'
  ) THEN
    INSERT INTO "OrganizationCategory" ("id", "name", "createdAt", "updatedAt")
    VALUES
        ('0d1534fb-c161-4265-93b5-52fe0f77a790', 'Restaurant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('2d49f84e-2ccf-4d5d-b411-f9131023440e', 'Supermarket', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('910470bb-d6a9-4357-ae43-c15f54d4a3cf', 'Pharmacy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('4d0b2661-dbc0-4d49-80ae-364421eed47d', 'Boutique', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("name") DO NOTHING;
  ELSE
    INSERT INTO "OrganizationCategory" ("id", "name")
    VALUES
        ('0d1534fb-c161-4265-93b5-52fe0f77a790', 'Restaurant'),
        ('2d49f84e-2ccf-4d5d-b411-f9131023440e', 'Supermarket'),
        ('910470bb-d6a9-4357-ae43-c15f54d4a3cf', 'Pharmacy'),
        ('4d0b2661-dbc0-4d49-80ae-364421eed47d', 'Boutique')
    ON CONFLICT ("name") DO NOTHING;
  END IF;
END $$;

WITH fallback AS (
    SELECT "id"
    FROM "OrganizationCategory"
    WHERE "name" = 'Boutique'
    LIMIT 1
)
UPDATE "Organization" AS org
SET "categoryId" = fallback."id"
FROM fallback
WHERE org."categoryId" IS NULL
   OR NOT EXISTS (
       SELECT 1
       FROM "OrganizationCategory" AS category
       WHERE category."id" = org."categoryId"
   );

ALTER TABLE "Organization"
ALTER COLUMN "categoryId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Organization_categoryId_idx" ON "Organization"("categoryId");

DO $$
BEGIN
  ALTER TABLE "Organization"
    ADD CONSTRAINT "Organization_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "OrganizationCategory"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
