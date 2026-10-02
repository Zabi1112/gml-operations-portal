# Partner agreements

Implemented: Contracts > Partner agreements (ADMIN only). Existing carrier agreements are unchanged.

## Confirmed commercial terms

- Pennsylvania; actual LLC members with restricted dispatch-only economic interests, not a non-member commission arrangement.
- Separate LLC legal name defaults to EASTWESTLOGISTICSLLC; exact registered name and formation status are entered before issuance.
- Managing member: 85% dispatching interest; runs the office, team and dispatch and bears office expenses.
- Silent member: 15% dispatching interest; no ordinary operational authority or automatic portal access. Statutory information/approval rights are preserved.
- On a collected $1,000 dispatch-service invoice: $250 dispatcher allocation, $112.50 silent member distribution, $637.50 managing member portion before office expenses. Not carrier gross load revenue or unpaid invoice totals.
- Silent member arranges the separate Pennsylvania LLC and applicable US filings/verifications. The form explicitly identifies who bears filing costs.
- No automatic economic interest in trucking or another business under the LLC. Future participation requires an investment and a mutually signed business-line schedule. Internal accounting does not legally segregate liabilities.
- Each partner supplies a full legal name, passport number, issuing country and private scan (PNG/JPEG/PDF, maximum 2 MB). Do not send real passport data through development chat or test fixtures.

## Workflow

1. Sign in as ADMIN, open Contracts, then Partner agreements.
2. Enter both names and separate notice emails, dates, distribution timing, filing-cost responsibility and initial contributions. Review optional additional terms.
3. Preview the full document. Confirm the reviewed wording to create two distinct private links. Nothing is issued before this step.
4. Share each link only with its designated partner. Each partner reviews the frozen terms and signs their own slot with explicit electronic-signature and identity-storage consent.
5. One signature is PARTIALLY_SIGNED. Both signatures on the same SHA-256 document become SIGNED. Download the final PDF from either link or the portal.
6. Administrators can refresh status, view masked receipts, separately retrieve private passport details/scans, and cancel open or partially signed agreements. Signed agreements cannot be cancelled through this workflow. Corrections require cancellation and fresh issuance; no signed wording is edited.

Links have no expiry. Signing closes for a signed slot, rejected/cancelled agreement or archived branch. The final document remains readable through the private links. A link and passport upload are not independent identity verification. No money transfers, invoice settlement changes, portal accounts or operational permissions are created by signing.

## Storage and deployment

- Install the additive migration: `node backend/scripts/add-partner-agreements.js --apply`.
- This migration creates only PartnerAgreement and its index; enables RLS and revokes direct public/anon/authenticated grants. No existing customer or sales-worker records are changed.
- The model is recorded in the Prisma schema; service operations use parameterized SQL for atomic signature/identity writes.
- Passport data and retrievable signing tokens use AES-256-GCM with contextual authenticated data. Lookup tokens are stored as SHA-256 hashes. Public DTOs and PDFs exclude scans, full passport numbers and the other party's signing token.
- Staff endpoints enforce ADMIN. Responses are no-store/no-referrer; passport downloads are attachments with nosniff. A 3 MB JSON request limit accommodates a 2 MB base64 file under Vercel's request limit.
- Encryption uses `PARTNER_AGREEMENT_KEY` if configured, otherwise derives a separate-purpose key from `JWT_SECRET` (minimum 24 characters). Preserve the exact encryption secret in backups. Do not rotate or switch it after storing agreements without a decrypt/re-encrypt migration; otherwise existing private records and signing links will become unreadable. A dedicated high-entropy secret is preferable before production use.
- No automatic passport deletion schedule is configured; retention/deletion must follow the business's actual verification and legal retention requirements. Passport downloads should be handled as sensitive documents.
- The page lists the latest 200 agreements for the selected branch.

## Validation

- `node --test backend/test/*.test.js frontend/test/*.test.js`
- `node backend/scripts/test-partner-agreements.js` creates only synthetic fixtures inside a transaction and rolls them all back. Covers both signatures, duplicate/concurrent submissions, consent/hash checks, encryption, privacy, cancellation, branch isolation and archival.
- `npm run build` in frontend; `npx prisma validate` in backend.
- Local browser check exercised form preview/issuance, both public signing links, synthetic passport uploads, both signatures, final PDF without private data, and mobile viewport sizing. Test artifacts are ignored under tmp/partner-preview.

## Drafting references and limits

The template is a starting agreement for the confirmed terms, not a guarantee of enforceability or a formation filing. A Pennsylvania business attorney and tax adviser should review restricted member economics, future business schedules and tax/capital allocations before execution. There is no universal set of US partnership clauses that resolves every fact pattern.

- Pennsylvania operating agreement scope and mandatory limits: https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/15/00.088.015.000..HTM
- Pennsylvania member information rights: https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/15/00.088.050.000..HTM
- Pennsylvania management: https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/15/00.088.047.000..HTM
- Federal electronic records/signatures: https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title15-section7001
