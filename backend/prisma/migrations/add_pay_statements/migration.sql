-- Paperwork only: no changes to financial tables or existing records.
CREATE TABLE "PayStatement" (
 "id" SERIAL PRIMARY KEY,
 "branchId" INTEGER NOT NULL REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "companyId" INTEGER,
 "driverId" INTEGER,
 "truckId" INTEGER,
 "companyName" TEXT NOT NULL,
 "recipientName" TEXT NOT NULL,
 "recipientType" TEXT NOT NULL CHECK ("recipientType" IN ('DRIVER', 'OWNER_OPERATOR')),
 "periodStart" TEXT NOT NULL,
 "periodEnd" TEXT NOT NULL,
 "netCents" INTEGER NOT NULL,
 "snapshot" JSONB NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "createdBy" INTEGER NOT NULL,
 "updatedBy" INTEGER NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PayStatement_branchId_createdAt_idx" ON "PayStatement"("branchId", "createdAt");
ALTER TABLE "PayStatement" ENABLE ROW LEVEL SECURITY;
