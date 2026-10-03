ALTER TABLE "AuditLog"
ADD COLUMN "entityType" TEXT,
ADD COLUMN "entityId" TEXT,
ADD COLUMN "entityLabel" TEXT;

CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
