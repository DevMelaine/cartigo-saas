CREATE TYPE "ProductLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

ALTER TABLE "Product"
ADD COLUMN "status" "ProductLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Product"
SET "status" = CASE
  WHEN "isActive" = true THEN 'ACTIVE'::"ProductLifecycleStatus"
  ELSE 'ARCHIVED'::"ProductLifecycleStatus"
END;

CREATE INDEX "Product_organizationId_status_idx" ON "Product"("organizationId", "status");
