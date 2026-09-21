# Current and previous operations

EWL Haji Pura is the current startup. GML Haji Pura retains the previous partnership records.

Use Dashboard > Current operation for new staff, companies, loads, invoices, partners and settlements.
Use Dashboard > Previous operation to browse historical staff, companies, load reports, finance settings, settlements and History. Existing document viewing and exports remain available.

User accounts are shared and were preserved. The new branch starts with no business records and zero dispatcher/accounts percentages. Configure allocations in Finance Settings before recording new settlements.

Inactive branches are treated as historical/read-only by the updated API. Writes are checked against the persisted record's branch, including nested loan repayments and related company, employee and dispatcher references. Reads retain the existing role permissions. Deploy the backend checks together with the frontend controls; older deployments do not contain these protections.

## Transition and verification

Run from backend: node scripts/start-new-operation.js for a read-only check. The --apply option performs the one-time transition. It saves a business-record snapshot under tmp/operation-backups (git-ignored), then atomically marks the original branch inactive and creates the new one. It verifies historical record equality, unchanged users, and empty new-branch relations before committing. Re-running after completion makes no changes.

No rows were deleted or moved. The backup does not contain environment credentials or user password hashes. Retain it securely as it contains business records.

Run focused checks from the repository root:

    node --test backend/test/branchWriteGuard.test.js frontend/test/branchSelection.test.js
    npm --prefix frontend run build
