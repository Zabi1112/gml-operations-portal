# Dispatch contracts

The Contracts sidebar tab is available to ADMIN, MANAGER and EDITOR accounts. Select a branch from Dashboard first. Historical branches show agreements read-only.

## Workflow

1. Choose an existing company or enter a carrier manually. Set MC number, dispatch fee percentage, DAT seats and effective date.
2. Create the agreement and review its saved preview. Copy the link and share it with the carrier. Creating a contract does not automatically create a company record.
3. The carrier opens /agreement/:token without a portal login, reviews the terms, enters their name and explicitly consents to an electronic signature. They may instead reject the agreement, with confirmation.
4. The receipt and PDF are available after signing. Refresh the Contracts list to see the recorded response. Pending agreements can be cancelled with confirmation.

Generate client links on the deployed portal so the URL uses https://portal.eastandwestlogistics.com. Local preview URLs are only for local testing.

## Terms and identity

Adapted from https://github.com/Zabi1112/Carrier-Agreement-Form (create.html, index.html, success.html and rejected.html).

Company: EastWestLogisticsLLC. Owner / dispatcher representative: Zeeshan Cheema. The old Black Matter LLC, Wyoming registration, EIN and Cash App payment instructions were removed. The template no longer asserts that the carrier documents were already delivered. The other supplied terms were preserved, including the original applicable-State wording.

Template source: backend/src/utils/contractTemplate.js. Each issued agreement stores a complete terms snapshot, template version and SHA-256 digest. Later template changes do not alter issued or signed agreements. Correct a pending agreement by cancelling it and creating a replacement.

The old browser-only storage and default 72-hour expiry were replaced with persistent database storage and no automatic expiry. Signing is single-use. Rejection, cancellation and branch archival close signing. A completed link remains usable for viewing and downloading its receipt.

The original EmailJS account is not used. This implementation creates copyable links and records responses in the portal; it does not send automated emails.

## Database installation

The new DispatchContract table is additive; existing companies, employees, historical records and user accounts are unchanged. The branch foreign key restricts deletion to preserve agreements. RLS is enabled with no public policies, so access is through the Express API.

From the repository root:

    npm.cmd --prefix backend run build
    node backend/scripts/add-contracts.js
    node backend/scripts/add-contracts.js --apply

The first script invocation checks readiness. The --apply invocation creates only the contract table and indexes inside a transaction. It uses an advisory lock and checks for an existing table, making reruns safe. Use this focused script for this repository's existing manual migration history; do not reset the database.

The migration was applied to the configured database on 2026-09-23. Deploy the matching frontend and backend together after the migration. Pushing main triggers the configured Vercel deployment.

## Access and lifecycle

Management routes require an active authenticated ADMIN, MANAGER or EDITOR. Branch selection scopes lists and detail requests; company references must belong to that branch. This follows the portal's existing role-based access across branches.

Public tokens use 32 cryptographically random bytes. Treat a shareable link as private: anyone possessing it can read the agreement and respond while it is pending. Possession of the link and the typed name do not independently verify a person's identity.

Public responses omit internal creator, company and branch identifiers and the token. API responses disable caching, and the frontend uses a no-referrer policy. No third-party signature or email script is loaded.

Consent and signer name are server-validated. The client submits the digest of the reviewed document; it cannot submit replacement terms. Conditional database updates permit exactly one transition from PENDING to SIGNED, REJECTED or CANCELLED. Server timestamps and the exact consent text are saved. Shared branch locks serialize writes against branch archival. There are no edit/delete endpoints for contracts.

## Verification

    node --test backend/test/contracts.test.js backend/test/contractRoutes.test.js backend/test/branchWriteGuard.test.js frontend/test/branchSelection.test.js
    npm.cmd --prefix frontend run build

Tests cover creation, document snapshots, public field restrictions, consent, duplicate/concurrent responses, rejection, cancellation, role authorization and historical branch isolation. Browser checks used synthetic API fixtures for the desktop management tab, mobile signing and receipt reload. A real database transaction verified persistence, signature readback and duplicate-response rejection, then rolled back all synthetic records. No test agreements were retained.
