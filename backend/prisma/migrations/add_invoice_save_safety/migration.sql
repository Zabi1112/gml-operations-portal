ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "createRequestId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_createRequestId_key" ON "Invoice"("createRequestId");
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "invoiceSequence" INTEGER NOT NULL DEFAULT 0;
