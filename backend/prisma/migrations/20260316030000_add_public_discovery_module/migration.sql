ALTER TABLE "Organization"
ADD COLUMN     "category" TEXT,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Organization_category_idx" ON "Organization"("category");
CREATE INDEX "Organization_isPublic_idx" ON "Organization"("isPublic");
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");
CREATE INDEX "Organization_isPublic_isActive_category_idx" ON "Organization"("isPublic", "isActive", "category");
CREATE INDEX "Product_organizationId_isActive_idx" ON "Product"("organizationId", "isActive");
