# Sales Department: list messaging with Quo

The former inbox preview is replaced by `/sales?view=messages` (Sales Department > List messaging).

## Operator flow

1. An ADMIN or MANAGER enters a Quo API key and the sales sending number. The server verifies the number with `GET /v1/phone-numbers`; this sends no SMS. Keys are encrypted and never returned to the browser.
2. Select an existing fetched sales list, enter a campaign name and message, and use `{{company_name}}` or `{{mc_number}}` where personalization is needed.
3. Preview counts and the first ten personalized records. Save a draft to review every frozen recipient in pages of 50. Saving never starts delivery.
4. Explicitly confirm the draft and press **Send N messages**. The independent cloud queue processes one recipient at a time, at most once every 10 seconds; the browser and PC can be closed.
5. View each outcome, pause or stop remaining messages, and use **Messages / status** to retrieve up to 20 recent Quo messages for a recipient, including incoming replies and provider status. This view refreshes on demand; there is no incoming-message webhook or notification inbox in this version.

Each SMS contains a single recipient; this is not group messaging. The list is snapshotted when the draft is created, so later fetched leads are not automatically included. Invalid/missing US/Canada numbers, unsupported extensions, duplicate phone numbers, the sender's own number and Not interested recipients are skipped. A phone shared with a Not interested lead in the same selected list is also excluded. Before submitting each SMS, the worker rechecks the current phone and Not interested status across the branch. No changes are made to sales-list membership, contact counts or MC-fetching jobs.

## Outcomes and failures

- **Queued**: waiting to submit.
- **Submitting**: request in progress. Pause/stop cannot recall an already-started request.
- **Accepted by Quo**: provider returned a message ID. This is NOT confirmation of delivery; the initial Quo status is shown separately.
- **Rejected**: Quo returned a definite client error; no automatic resend.
- **Needs review**: timeout, ambiguous server response or interrupted process; no automatic resend because the provider may already have accepted it. Review the conversation in Quo before taking any further action.
- **Skipped**: invalid/duplicate/excluded at preview, or lead phone/status changed before submission.

Rate limits back off. Authentication, account/billing limits and known sender-registration errors pause the campaign. To replace a rejected API key, save the original sending number with a current key, then Resume. The original number/phone ID must match. Resume submits only remaining queued recipients, never accepted, rejected or uncertain records. A new campaign can intentionally contact the same recipients again; deduplication is within a campaign, not across all campaigns.

## Deployment

- `node backend/scripts/add-quo-campaigns.js --apply` installs additive QuoConnection, QuoCampaign, QuoRecipient and QuoWorker tables, indexes, RLS and explicit revokes for anon/authenticated.
- Deploy `/api/quo/tick` before `node backend/scripts/install-quo-scheduler.js --apply`.
- The separate `ewl-quo-messages` pg_cron job calls the protected worker every 10 seconds when work is present. It uses the existing Vault worker-authentication token and a separate queue/lease; it does not change the MC fetch scheduler. Scheduler heartbeat must be recent before a draft can start.
- Credentials are encrypted with AES-256-GCM using a Quo-specific derived key. `QUO_ENCRYPTION_KEY` is preferred if configured before storing connections; otherwise `JWT_SECRET` is used. Preserve the encryption secret. Changing it without re-encrypting existing records makes stored keys unreadable.
- Campaigns retain encrypted credentials to support their original sending number and on-demand message history. No credentials appear in campaign/list DTOs or client assets.
- This app uses Prisma/direct PostgreSQL with its backend role, not Supabase's Data API. The October 30, 2026 change to default Data API grants does not require exposing these private tables. The migration grants no public Data API access.

## Verification

- `node --test backend/test/*.test.js frontend/test/*.test.js`
- `node backend/scripts/test-quo-campaigns.js`: refuses to run alongside active real SMS campaigns; uses synthetic records in a transaction and rolls them back. Every Quo request is mocked, including sends.
- Frontend build and local browser form checks use a synthetic Quo provider. No real SMS is sent as part of development tests.

## Provider references

- Send schema and accepted response: https://www.quo.com/docs/mdx/api-reference/messages/send-a-text-message
- Sender number lookup: https://www.quo.com/docs/mdx/api-reference/phone-numbers/list-phone-numbers
- Message/reply lookup: https://www.quo.com/docs/mdx/api-reference/messages/list-messages
- Supabase announcement: https://github.com/orgs/supabase/discussions/45329

Quo API message charges and account/sender restrictions still apply. Only an operator's explicit Start action queues real messages; no provided chat API key is embedded in source code or automatically used to send.
