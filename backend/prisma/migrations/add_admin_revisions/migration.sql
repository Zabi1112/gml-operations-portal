CREATE TABLE IF NOT EXISTS "AdminRevision" (
 "id" TEXT PRIMARY KEY,
 "branchId" INTEGER NOT NULL REFERENCES "Branch"("id"),
 "entityType" TEXT NOT NULL,
 "entityId" INTEGER NOT NULL,
 "reason" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL,
 "createdBy" INTEGER NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AdminRevision_entity_idx" ON "AdminRevision" ("entityType","entityId","createdAt");
ALTER TABLE "AdminRevision" ENABLE ROW LEVEL SECURITY;
