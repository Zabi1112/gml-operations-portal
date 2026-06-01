-- Cleanup Script: Remove Duplicate Loads from Invoices
-- This script removes all loads that were created from invoices (source='INVOICE')
-- since the real loads should only come from DAILY_REPORT
-- 
-- IMPORTANT: Run this ONCE to clean up production data
-- After running, use the updated invoice.controller.js that no longer creates duplicate loads

-- First, let's see how many duplicate loads we have
SELECT 
  source,
  COUNT(*) as count
FROM "Load"
GROUP BY source
ORDER BY count DESC;

-- Now delete all INVOICE source loads (these are the duplicates)
DELETE FROM "Load" 
WHERE source = 'INVOICE';

-- Verify the cleanup
SELECT 
  source,
  COUNT(*) as count
FROM "Load"
GROUP BY source
ORDER BY count DESC;
