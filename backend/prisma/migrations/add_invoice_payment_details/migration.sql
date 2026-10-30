ALTER TABLE "InvoiceSettlement"
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
