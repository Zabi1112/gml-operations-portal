# Admin corrections deployment

Run migration.sql from this directory in the Supabase project SQL Editor before deploying this change. It adds only the AdminRevision table and its index; existing invoice/payment rows are not migrated. The backend database role needs INSERT and SELECT access to this table. RLS blocks browser Data API access; revisions are served through authenticated ADMIN endpoints.

This table is accessed by parameterized SQL and does not require regenerating the Prisma client. Retain this migration alongside the application. Do not use schema resets to install it.

## Admin workflow

- Company trucks/drivers, finance partners/dispatchers, users, and no-load reasons have Edit controls.
- Saved paychecks use their existing revision-checked editor; Edit is now explicit.
- History has salary slip and load report corrections with a required reason, original snapshot, and stale-edit protection. Saved report edits do not change source load rows.
- Paid invoice correction archives the invoice, loads and receipts in one transaction, reverses those receipt allocations, and removes the active settlements. The admin then edits the invoice and records the actual receipts again. This is not a refund and does not send money. Re-enter settlement splits from the archived receipts as appropriate; financial summaries temporarily reflect the reversal until receipts are re-recorded.
- Only the latest invoice in a company's payment chain can be reopened. Earlier carried-forward invoices and legacy reconciled opening balances remain protected; they need a reviewed balance adjustment rather than this workflow.
- Signed agreements use Revise to create new terms and signing links. Original signatures remain on the original agreement. Cancel obsolete unsigned links separately.
- Archived branches remain read-only.

## Verification

Automated checks use fixtures; this change has not been verified against the live Supabase database. After installing the migration, verify an admin correction and revision-history download with a test record, and confirm non-admin accounts cannot call correction endpoints.
