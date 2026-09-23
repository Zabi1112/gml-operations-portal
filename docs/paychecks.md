# Client pay statements

Paychecks prepares USD statements for a client's drivers and owner-operators. It does not transfer money, post expenses, clear invoices, update payroll, or change account/partner balances. The client company handles payment.

## Defaults (all editable per statement)

- Driver: 30% of the selected loads' total gross, then subtract deductions and add additional earnings.
- Owner-operator: total gross minus 10% of gross, then subtract deductions and add additional earnings.
- Owner-operator weekly charges: IFTA $75, office $65, insurance $750, ELD $40. These total $930 per chargeable week.
- Fuel starts at $0 and is entered when known. Add rows for claims, repairs, advances, bonuses, reimbursements, or other adjustments.
- Each adjustment can be per statement or per week. Chargeable weeks starts at 1 and can be edited, including fractions. Dates never silently prorate charges.

For $8,900 gross, a driver at 30% earns $2,670 before adjustments. An owner-operator at 10%, with one week of default charges and $1,200 fuel, has $5,880 net payable.

The API computes all totals using integer cents. Percentages support two decimal places. Driver per-load shares use cumulative cent rounding so line totals always equal the percentage of total gross. Negative net balances remain visible for review.

## Workflow

1. Select the current branch and open Paychecks (ADMIN, MANAGER or EDITOR).
2. Choose an existing company or enter the client's details manually. The PDF uses that company name, optional logo, MC/DOT and contact details. It does not use East West branding.
3. Select an existing driver/truck or type the recipient's name and vehicle details. Choose Driver or Owner-operator. Switching pay type restores that type's default percentage and deductions.
4. Enter period dates and chargeable weeks. Enter loads manually, or select a company and driver/truck and import recorded loads. Import filters by the existing load date field, not delivery date. Review imported dates and gross amounts; they remain editable. Repeated imports skip already included source load IDs.
5. Edit rates, fuel, deductions and additional earnings. Calculate & preview shows a draft PDF. Save statement stores the document and its calculations. Download the PDF to share with the client.
6. Open a saved statement to view/download or edit it. Use as template retains branding and rates but resets the period and loads for a new statement.

Statements are paperwork, not payment confirmations. No automated email delivery is configured. Historical branches are read-only. Existing staff Salary Slips and company/partner Settlements remain separate.

## Storage and access

Only the new PayStatement table is written. It stores a company/recipient snapshot, normalized inputs, calculated totals, creator/updater IDs and revision. Company profile changes do not change saved PDFs. Concurrent edits use revision checks so stale edits cannot silently overwrite newer work. There is no delete endpoint.

Saved edits replace the previous snapshot and increment its revision; this is not a full historical version archive. Previously downloaded PDFs remain unchanged. There is a 100-load and 30-row limit for each adjustment section; lists are paginated at 25 records.

Company/driver/truck references are checked against the branch and selected company. Manual names do not create new company or driver records. Imported load IDs are informational references only; copying a load does not modify it. The branch foreign key restricts deletion. RLS blocks direct public table access; all routes require an active authorized portal account.

Logo upload accepts PNG, JPEG or WebP locally, resizes to a small PNG, and saves it within the statement. No external logo URL is fetched. Uploaded company logos can be carried forward using Use as template.

## Migration and deployment

From the repository root:

    npm.cmd --prefix backend run build
    node backend/scripts/add-pay-statements.js
    node backend/scripts/add-pay-statements.js --apply

The migration creates only PayStatement, its index and RLS within a transaction. An advisory lock and existing-table check make reruns safe. No existing data is reset or changed. Applied to the configured database on 2026-09-23.

Deploy the matching backend and frontend after installing the table. Pushing main triggers the configured Vercel deployment of the matching frontend and backend.

## Verification

    node --test backend/test/payStatements.test.js backend/test/payStatementRoutes.test.js frontend/test/payPdf.test.js
    npm.cmd --prefix frontend run build

Tests cover both recipient types, all editable rates, weekly/fixed charges, cent rounding, negative net amounts, tampered totals, validation, permissions, branch/company isolation, stale edits and client-branded multi-page PDFs. The service fixture deliberately exposes no financial-write models.

Browser checks used synthetic API data for company/recipient selection, owner defaults, import deduplication, editable fuel and percentage, preview, save/edit, mobile layout and multi-page PDF generation. A Supabase transaction tested real persistence and revision conflicts and then rolled back; no synthetic statements were retained.
