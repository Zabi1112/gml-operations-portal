-- Add per-truck rate breakdown storage for FIXED billing invoices
-- Lets each selected truck have its own rate instead of a single rate x count multiply

ALTER TABLE "Invoice" ADD COLUMN "truckRateBreakdown" JSONB;
