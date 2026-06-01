-- CleanUp: Remove Duplicate Loads Created from Invoices
-- 
-- Issue: When invoices were created, loads were being saved to both:
-- 1. InvoiceLoad table (correct - for invoice tracking)
-- 2. Load table with source='INVOICE' (incorrect - duplicate)
--
-- Solution: Delete all loads with source='INVOICE' since real loads
-- should only come from DAILY_REPORT
--
-- The updated invoice.controller.js no longer creates these duplicates

DELETE FROM "Load" WHERE source = 'INVOICE';
