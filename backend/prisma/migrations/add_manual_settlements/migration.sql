-- Create AmountType enum if it doesn't exist
CREATE TYPE "AmountType" AS ENUM ('PERCENTAGE', 'ABSOLUTE', 'MIXED');

-- AlterTable InvoiceSettlement
-- First, create the new columns
ALTER TABLE "InvoiceSettlement" 
  ADD COLUMN "totalAmountPKR" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "amountType" "AmountType" NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN "dispatcherValue" DOUBLE PRECISION NOT NULL DEFAULT 25,
  ADD COLUMN "accountsValue" DOUBLE PRECISION NOT NULL DEFAULT 10,
  ADD COLUMN "settlementDate" TIMESTAMP(3),
  ALTER COLUMN "invoiceId" DROP NOT NULL,
  ALTER COLUMN "clearedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Migrate data from old columns to new structure
UPDATE "InvoiceSettlement"
SET 
  "totalAmountPKR" = COALESCE("invoiceAmountPKR", 0),
  "dispatcherValue" = COALESCE("dispatcherPercent", 25),
  "accountsValue" = COALESCE("accountsPercent", 10),
  "amountType" = 'PERCENTAGE'::"AmountType",
  "settlementDate" = "clearedAt"
WHERE "totalAmountPKR" = 0;

-- Drop old columns (optional - comment out if you want to keep them for backup)
-- ALTER TABLE "InvoiceSettlement" DROP COLUMN "invoiceAmountUSD";
-- ALTER TABLE "InvoiceSettlement" DROP COLUMN "usdRate";
-- ALTER TABLE "InvoiceSettlement" DROP COLUMN "invoiceAmountPKR";
-- ALTER TABLE "InvoiceSettlement" DROP COLUMN "dispatcherPercent";
-- ALTER TABLE "InvoiceSettlement" DROP COLUMN "accountsPercent";
