CREATE TABLE IF NOT EXISTS "PartnerAgreement" (
 "id" SERIAL PRIMARY KEY,
 "branchId" INTEGER NOT NULL REFERENCES "Branch"("id") ON DELETE RESTRICT,
 "settings" JSONB NOT NULL,
 "termsText" TEXT NOT NULL,
 "documentHash" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','PARTIALLY_SIGNED','SIGNED','REJECTED','CANCELLED')),
 "managerTokenHash" TEXT NOT NULL UNIQUE,
 "silentTokenHash" TEXT NOT NULL UNIQUE,
 "encryptedLinks" TEXT NOT NULL,
 "signatures" JSONB NOT NULL DEFAULT '{}',
 "privateIdentity" JSONB NOT NULL DEFAULT '{}',
 "revision" INTEGER NOT NULL DEFAULT 1,
 "createdBy" INTEGER NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PartnerAgreement_branch_created" ON "PartnerAgreement" ("branchId", "createdAt" DESC);
ALTER TABLE "PartnerAgreement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PartnerAgreement" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE "PartnerAgreement_id_seq" FROM PUBLIC, anon, authenticated;
