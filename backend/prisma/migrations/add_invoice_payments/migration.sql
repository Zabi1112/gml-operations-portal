ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currentChargesUSD" DOUBLE PRECISION;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAmountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "carryForward" JSONB;
ALTER TABLE "InvoiceSettlement" ADD COLUMN IF NOT EXISTS "paymentAllocations" JSONB;
ALTER TABLE "InvoiceSettlement" ADD COLUMN IF NOT EXISTS "paymentRequestId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSettlement_paymentRequestId_key" ON "InvoiceSettlement"("paymentRequestId");
UPDATE "Invoice" SET "paidAmountUSD"="netPayable" WHERE "isCleared"=true AND "currentChargesUSD" IS NULL AND "paidAmountUSD"=0;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "balanceTransferredToInvoiceId" INTEGER;
-- Owner-approved opening balance: latest invoice replaces unreconciled older debt.
-- Retain original PDF totals and settlement records. This is not a cash receipt.
WITH affected AS (
 SELECT DISTINCT "branchId", "companyId" FROM "Invoice"
 WHERE "currentChargesUSD" IS NULL AND "includePreviousInvoiceInNet"=true
 AND "previousInvoiceAmount">0 AND "companyId" IS NOT NULL
), latest AS (
 SELECT DISTINCT ON (i."branchId",i."companyId") i."id",i."branchId",i."companyId"
 FROM "Invoice" i JOIN affected a ON i."branchId"=a."branchId" AND i."companyId"=a."companyId"
 ORDER BY i."branchId",i."companyId",i."createdAt" DESC,i."id" DESC
)
UPDATE "Invoice" i SET
 "currentChargesUSD"=CASE WHEN i."id"=l."id" OR i."isCleared" THEN i."netPayable" ELSE 0 END,
 "balanceTransferredToInvoiceId"=CASE WHEN i."id"<>l."id" AND NOT i."isCleared" THEN l."id" ELSE NULL END,
 "isCleared"=CASE WHEN i."id"<>l."id" THEN true ELSE i."isCleared" END
FROM latest l WHERE i."branchId"=l."branchId" AND i."companyId"=l."companyId" AND i."currentChargesUSD" IS NULL;
