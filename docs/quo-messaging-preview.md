# Sales messaging preview

Open Sales Department > Messages - Preview, or /sales?view=messages.

This is an interactive visual prototype using fictional contacts and phone numbers. It includes conversation search, All/Unread/Open/Done filters, per-thread reply drafts, simulated replies, mark done/reopen, and a carrier details panel. Archived branches cannot compose replies or change status. Preview state resets on leaving the view. No Quo requests, messages, customer data writes, secrets or credentials are included in this implementation.

The next phase is a server-side Quo connection: select the authorized sending number, load conversation/message history, implement explicit sends after recipients/content are decided, and receive replies using verified webhooks or polling. The user has not yet specified recipient rules or message templates. Do not connect the MC fetch worker directly to sending.

Provider reference: https://www.quo.com/api and https://www.quo.com/blog/api-event-recap/ (messages endpoints and message webhooks). Confirm the current detailed endpoint schemas before implementing the live adapter.

Validation: frontend production build and local browser checks for simulated replies, filters, mobile width, and runtime errors. Browser preview uses synthetic branch/auth data; no real SMS sent.
