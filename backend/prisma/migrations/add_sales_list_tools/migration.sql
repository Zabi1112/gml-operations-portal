CREATE TABLE IF NOT EXISTS "SalesExportPreference" (
 "branchId" INTEGER PRIMARY KEY REFERENCES "Branch"(id) ON DELETE RESTRICT,
 "messageTemplate" TEXT NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT true,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "SalesListContactBatch" (
 "id" TEXT PRIMARY KEY,
 "listId" INTEGER NOT NULL REFERENCES "SalesList"(id) ON DELETE RESTRICT,
 "userId" INTEGER NOT NULL,
 "leadCount" INTEGER NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "SalesListContactBatch_listId_idx" ON "SalesListContactBatch"("listId");
ALTER TABLE "SalesExportPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesListContactBatch" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SalesExportPreference", "SalesListContactBatch" FROM anon, authenticated;
