# Load option directory

Run `node backend/scripts/add-load-option-brokers.js --apply` after `npm install` and `npx prisma generate` in backend. The script is additive/idempotent, preserves existing broker edits, enables RLS and grants service_role access. It was applied to the configured database during implementation.

Public routes below `/api/load-option-directory` expose only active-branch company IDs/names, active driver IDs/names for the selected company, shared broker directory fields, and US states/cities. Driver phone/email and company billing/contact fields are not included. Broker saves require an active ADMIN, MANAGER or EDITOR login; guests can select and customize a draft without changing the shared directory.

The starter set contains 20 popular broker shortcuts (not a claim of the current exact top-20 ranking). Source URLs for individual MC values are stored in `backend/scripts/load-option-broker-seeds.js` and in each seeded record. Daybreak's name/MC comes from the user's example. Names refer to particular legal entities: brands may operate through multiple authorities. Entries are reference data, not a live authority or agent verification. Unsourced contact fields remain blank for staff to fill from their rate confirmation. Staff edits clear the original source reference.

City data: country-state-city package, its bundled license retained in npm package. City selections use center coordinates; ZIP/address search uses the existing ORS proxy and requires confirming a match. Street addresses provide more precise mileage. All stop times are facility-local; overnight windows are labeled in the message and PDF.

Validation: targeted Node tests for directory projection/auth, state/city coordinates, seeds, routing, schedule text and PDF; Vite production build; hidden browser guest company/driver, state/city, after-time, sample reset, PDF and mobile overflow checks.
