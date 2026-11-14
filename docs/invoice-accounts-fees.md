# Invoice accounts fee receipts

No SQL migration is required: the existing InvoiceSettlement.paymentAllocations JSON stores each receipt's accountsFeeUSD and accountsFeeAllocations (original invoice ID and USD amount). Deploy the backend and frontend together.

Opening position confirmed by the owner: historical payments have received zero invoice accounts fees. Existing settlement accountsAmountPKR values describe the earlier partner-funded allocation and must not be interpreted as invoice fee receipts. Historical settlements are not rewritten.

Only the latest company invoice accepts payments. For partial payments, the admin explicitly selects whether accounts fees are included and enters their amount. Full payment automatically includes the pending accounts fees. Fees are allocated oldest first, independently of non-fee revenue, so payments without fees cannot consume fee balances.

Pending fees follow the existing carryForward references and legacy balanceTransferredToInvoiceId links. Each original invoice is counted once. The total is calculated from original fees minus explicit fee receipts. Customer invoice PDFs continue to show the carried balance as one pending amount. Pending fee metadata is returned only to admins. Existing settled invoices without a link to the current balance are not added to the customer's debt.

The received invoice fee is converted at the payment exchange rate and reserved entirely for Accounts before dispatcher and partner calculations. Existing partner-funded accounts allocations apply to the remaining revenue. accountsAmountPKR stores both accounts portions; the full settlement shows each separately. Partner-specific PDFs do not show the new internal fee breakdown.

Deleting a payment restores its principal allocations; deleting the same receipt removes its fee allocations, restoring pending fees. Request IDs and the existing company transaction lock protect duplicate/concurrent payments.

If pending fees exceed a source invoice's recorded remaining balance, recording payment is blocked for reconciliation. The application does not increase customer debt or guess that fees were received.

Validation: focused backend and frontend automated tests, including an in-memory payment endpoint test, plus the frontend production build. Live database verification is unavailable until Supabase authentication is fixed.

Accounts Team replaces the optional partner fee transfer feature. While recording an invoice payment, admins can enter team member names and PKR amounts, up to the total of received invoice fees plus the existing accounts allocation. Details are stored once on the first paymentAllocations entry as accountsTeamSplits. Unassigned funds remain under Accounts Team. Partner shares are not increased by these payments. Complete settlements show an Accounts Team table and have a dedicated Accounts Team PDF download. Partner PDFs continue to exclude invoice fees from gross and never include team names or amounts. Existing saved settlements are not rewritten. No schema migration is required.
