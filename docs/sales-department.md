# Sales Department

The portal route is `/sales`. Administrators and managers can create, pause, resume, stop and replace keys for MC ranges. Editors can use lists, export CSVs, edit notes/status/follow-up dates and record contacts. Historical branches remain read-only.

## Local use

1. In `backend`, run `npm run sales:migrate` once, then `npm start`.
2. In another terminal in `backend`, run `npm run sales:worker`.
3. In `frontend`, run `npm run dev -- --port 5174`.
4. Open `http://localhost:5174/sales`, sign in and select the current branch. Enter your SaferWebAPI key and numeric MC range, then Start fetching.

Local fetching needs the backend worker process and PC to remain running. Closing the browser does not stop it. The local environment uses the configured Supabase database, so saved real jobs and leads persist there. The worker makes no provider calls until a runnable range exists. Test a small known range first to validate the provider key and actual response behavior.

## Production setup

After deploying the new backend route, run `node backend/scripts/install-sales-scheduler.js --apply`. Without `--apply` the command is a dry run. The installer verifies the protected production endpoint exists before enabling scheduling.

The installer enables Supabase pg_cron/pg_net, stores a generated worker token in Supabase Vault, stores only its hash in SalesWorker and schedules a two-second SQL trigger. The trigger makes authenticated HTTP calls to `/api/sales/tick` only while eligible jobs exist. Each HTTP call handles one MC and persists its checkpoint through the atomic `ewl_sales_finish` database function. `npm run sales:migrate` installs both the tables and this function before deployment. A database lease prevents parallel workers from issuing overlapping requests. Local and production workers share that lease, but stop the local worker after production scheduling is enabled.

The scheduler heartbeat appears on the screen. This indicates scheduling availability; per-job errors show provider failures. Vercel requests must allow at least 30 seconds for the bounded worker call. Network/service outages delay progress; the stored checkpoint survives. Failed requests retry the same MC and block after five unsuccessful attempts. Provider 429 responses honor Retry-After up to 24 hours. Scheduler logs belonging to this module are pruned after two days; other jobs' logs are untouched.

## Data and filters

- Lists contain up to 1,000 unique qualifying MCs per branch. A final partial list stays downloadable. Names use the first and last accepted MC, not every number in the scanned range.
- US address, carrier identity, matching MC, USDOT and property authorization must be confirmed. Missing/ambiguous information is held in Needs review, outside qualified lists.
- Garbage/refuse, hay, farm supplies, grain/feed and livestock exclude the carrier even when General Freight is also present. Refrigerated food/fresh produce remain eligible freight categories.
- Cargo categories indicate freight suitability; they do not prove a specific trailer/equipment type. Reported power units are not verified truck ownership. Missing emails stay blank.
- Excluded/missing MCs are counted by reason rather than storing large full snapshots. Qualified leads and review records are saved. CSV includes contact counts, notes/status and follow-up dates, with formula injection protection.
- Contact actions use UUIDs to make retries idempotent; undo retains the audit event. Lead edits reject stale revisions.
- API keys are encrypted with AES-256-GCM using SALES_ENCRYPTION_KEY or the existing JWT_SECRET. Keep the encryption secret consistent across environments; rotating it requires replacing keys for unfinished jobs. Stopping/completing a job removes its stored API key. Keys never appear in list responses or CSVs.

## Verification

- `node --test backend/test/*.test.js frontend/test/*.test.js`
- `node backend/scripts/test-sales-integration.js` (requires the tables; synthetic records roll back; refuses to run with active jobs)
- `npm run build` in frontend

The integration test covers checkpoints, pause/resume, rate limits, rejected keys, missing/excluded records, duplicate MCs, key removal on completion, contact idempotency/undo, branch isolation, stale edits, 1,000-row rollover and CSV export. Live provider requests require the user's key and are intentionally not part of automated tests.
