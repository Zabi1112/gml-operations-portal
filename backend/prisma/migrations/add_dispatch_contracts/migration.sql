-- Additive migration: existing business records and user accounts are unchanged.
CREATE TABLE "DispatchContract" (
 "id" SERIAL PRIMARY KEY,
 "branchId" INTEGER NOT NULL REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "companyId" INTEGER,
 "companyName" TEXT NOT NULL,
 "companyMC" TEXT NOT NULL,
 "ratePercent" DOUBLE PRECISION NOT NULL CHECK ("ratePercent" >= 0 AND "ratePercent" <= 100),
 "seats" INTEGER NOT NULL CHECK ("seats" >= 0),
 "effectiveDate" TEXT NOT NULL,
 "token" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','SIGNED','REJECTED','CANCELLED')),
 "termsText" TEXT NOT NULL,
 "documentHash" TEXT NOT NULL,
 "templateVersion" TEXT NOT NULL DEFAULT 'ewl-1',
 "createdBy" INTEGER NOT NULL,
 "signerName" TEXT,
 "consentText" TEXT,
 "signedAt" TIMESTAMP(3),
 "respondedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "DispatchContract_token_key" ON "DispatchContract"("token");
CREATE INDEX "DispatchContract_branchId_createdAt_idx" ON "DispatchContract"("branchId", "createdAt");
-- Access is through authenticated Express routes or an unguessable signing link.
ALTER TABLE "DispatchContract" ENABLE ROW LEVEL SECURITY;
