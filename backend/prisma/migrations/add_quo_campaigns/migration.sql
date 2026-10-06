CREATE TABLE IF NOT EXISTS "QuoConnection" (
 "branchId" INTEGER PRIMARY KEY REFERENCES "Branch"(id) ON DELETE RESTRICT,
 "sender" TEXT NOT NULL,
 "phoneNumberId" TEXT NOT NULL,
 "encryptedKey" TEXT NOT NULL,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "QuoCampaign" (
 "id" TEXT PRIMARY KEY,
 "branchId" INTEGER NOT NULL REFERENCES "Branch"(id) ON DELETE RESTRICT,
 "listId" INTEGER NOT NULL REFERENCES "SalesList"(id) ON DELETE RESTRICT,
 "name" TEXT NOT NULL,
 "template" TEXT NOT NULL,
 "sender" TEXT NOT NULL,
 "phoneNumberId" TEXT NOT NULL,
 "encryptedKey" TEXT NOT NULL,
 "reviewHash" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RUNNING','PAUSED','STOPPED','COMPLETED')),
 "lastError" TEXT,
 "createdBy" INTEGER NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "QuoRecipient" (
 "id" SERIAL PRIMARY KEY,
 "campaignId" TEXT NOT NULL REFERENCES "QuoCampaign"(id) ON DELETE CASCADE,
 "leadId" INTEGER NOT NULL,
 "mc" INTEGER NOT NULL,
 "companyName" TEXT NOT NULL,
 "phone" TEXT,
 "content" TEXT NOT NULL,
 "status" TEXT NOT NULL CHECK (status IN ('READY','SENDING','ACCEPTED','FAILED','UNKNOWN','SKIPPED')),
 "reason" TEXT,
 "providerId" TEXT,
 "providerStatus" TEXT,
 "owner" TEXT,
 "startedAt" TIMESTAMPTZ,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE ("campaignId","leadId")
);
CREATE INDEX IF NOT EXISTS "QuoRecipient_campaign_status" ON "QuoRecipient" ("campaignId",status,id);
CREATE INDEX IF NOT EXISTS "QuoCampaign_branch_created" ON "QuoCampaign" ("branchId","createdAt" DESC);
CREATE TABLE IF NOT EXISTS "QuoWorker" (
 id TEXT PRIMARY KEY,
 owner TEXT,
 "leaseUntil" TIMESTAMPTZ,
 "nextRequestAt" TIMESTAMPTZ,
 "heartbeatAt" TIMESTAMPTZ,
 "schedulerAt" TIMESTAMPTZ
);
INSERT INTO "QuoWorker" (id) VALUES ('main') ON CONFLICT DO NOTHING;
ALTER TABLE "QuoConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoWorker" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "QuoConnection","QuoCampaign","QuoRecipient","QuoWorker" FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE "QuoRecipient_id_seq" FROM PUBLIC,anon,authenticated;
