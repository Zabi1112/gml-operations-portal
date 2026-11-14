const payments = require('./invoicePayments');
const { cents, fail } = payments;

// Opening position confirmed by the owner: historical payments received no
// invoice accounts fees. Only explicit fee receipts in this ledger reduce them.
async function receipts(db, rows) {
  return db.invoiceSettlement.findMany({
    where: { invoiceId: { in: rows.map(row => row.id) } },
    select: { paymentAllocations: true }
  });
}

function context(invoice, rows, settlements) {
  const scoped = rows.filter(row => row.branchId === invoice.branchId &&
    (invoice.companyId ? row.companyId === invoice.companyId : row.id === invoice.id));
  const byId = new Map(scoped.map(row => [row.id, row]));
  const received = new Map();
  for (const settlement of settlements) {
    for (const allocation of settlement.paymentAllocations || []) {
      for (const fee of allocation.accountsFeeAllocations || []) {
        received.set(fee.invoiceId, (received.get(fee.invoiceId) || 0) + cents(fee.amountUSD));
      }
    }
  }
  const buckets = new Map();
  const visited = new Set();
  function visit(id, ownerId = id) {
    if (visited.has(id)) return;
    visited.add(id);
    const row = byId.get(id);
    if (!row) return;
    if (!buckets.has(ownerId)) buckets.set(ownerId, { invoiceId: ownerId, amountCents: payments.ownDue(byId.get(ownerId)), fees: [] });
    const pending = Math.max(0, cents(row.accountsFeeTotal) - (received.get(id) || 0));
    if (pending) buckets.get(ownerId).fees.push({ invoiceId: id, amountCents: pending });
    // Legacy consolidated balances belong to the replacement invoice, but fees
    // retain their original invoice identity for receipts and reversal.
    for (const source of scoped.filter(source => source.balanceTransferredToInvoiceId === id)) visit(source.id, ownerId);
    for (const source of Array.isArray(row.carryForward) ? row.carryForward : []) visit(source.invoiceId);
  }
  visit(invoice.id);
  const available = payments.allocationsFor(invoice, rows);
  const order = new Map(available.map((entry, index) => [entry.invoiceId, index]));
  const sources = [...buckets.values()].sort((a,b) => (order.get(a.invoiceId) ?? -1) - (order.get(b.invoiceId) ?? -1));
  for (const source of sources) {
    source.amountCents = available.find(entry => entry.invoiceId === source.invoiceId)?.amountCents || 0;
    source.fees.sort((a, b) => (Date.parse(byId.get(a.invoiceId).createdAt) - Date.parse(byId.get(b.invoiceId).createdAt)) || a.invoiceId - b.invoiceId);
    source.feeCents = source.fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  }
  const pendingCents = sources.reduce((sum, source) => sum + source.feeCents, 0);
  return { sources, pendingCents, conflict: sources.some(source => source.feeCents > source.amountCents) };
}

function plan(invoice, rows, settlements, receivedUSD, requestedFeeUSD) {
  // Reuse the existing amount, latest-invoice and overpayment checks.
  payments.paymentPlan(invoice, rows, receivedUSD);
  const state = context(invoice, rows, settlements);
  if (state.conflict) fail(409, 'Unpaid accounts fees exceed the recorded balance on a source invoice. Reconcile that balance before recording payment.');
  const totalDue = state.sources.reduce((sum, source) => sum + source.amountCents, 0);
  const amount = cents(receivedUSD);
  const full = amount === totalDue;
  if (!full && state.pendingCents > 0 && (requestedFeeUSD === undefined || requestedFeeUSD === null || requestedFeeUSD === '')) {
    fail(400, 'Specify the accounts fee received with this partial payment (zero if none).');
  }
  const fee = full ? state.pendingCents : cents(requestedFeeUSD);
  if (!Number.isSafeInteger(fee) || !Number.isFinite(Number(requestedFeeUSD ?? 0)) ||
      (!full && Math.abs(Number(requestedFeeUSD || 0) * 100 - fee) > 0.00001) ||
      fee < 0 || fee > state.pendingCents || fee > amount) {
    fail(400, 'Accounts fee received must be between zero and the smaller of the payment and pending accounts fee.');
  }
  if (amount - fee > totalDue - state.pendingCents) {
    fail(400, 'This payment exceeds the remaining non-accounts balance. Include the accounts fee portion received.');
  }
  let feeLeft = fee, revenueLeft = amount - fee;
  const allocations = [];
  for (const source of state.sources) {
    const feeAmount = Math.min(feeLeft, source.feeCents);
    const revenueAmount = Math.min(revenueLeft, source.amountCents - source.feeCents);
    feeLeft -= feeAmount;
    revenueLeft -= revenueAmount;
    if (!feeAmount && !revenueAmount) continue;
    let remaining = feeAmount;
    const feeAllocations = [];
    for (const origin of source.fees) {
      const allocated = Math.min(remaining, origin.amountCents);
      if (allocated) feeAllocations.push({ invoiceId: origin.invoiceId, amountUSD: allocated / 100 });
      remaining -= allocated;
    }
    allocations.push({ invoiceId: source.invoiceId, amountUSD: (feeAmount + revenueAmount) / 100,
      accountsFeeUSD: feeAmount / 100, accountsFeeAllocations: feeAllocations });
  }
  if (feeLeft || revenueLeft) fail(409, 'Payment balances changed. Refresh and try again.');
  return { allocations, accountsFeeUSD: fee / 100 };
}

async function decorate(db, invoices, rows) {
  const ledger = await receipts(db, rows);
  return invoices.map(invoice => {
    const state = context(invoice, rows, ledger);
    return { ...invoice, accountsFeePendingUSD: state.pendingCents / 100,
      accountsFeeBalanceConflict: state.conflict };
  });
}
// Team payouts are independent of branch partners and never increase partner shares.
function accountantsSplits(requested = [], totalPKR) {
  if (!Array.isArray(requested) || requested.length > 100) fail(400, 'Enter a valid Accountants list.');
  const names = new Set();
  let allocated = 0;
  const splits = requested.map(item => {
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    const amount = Number(item?.amountPKR), value = cents(amount);
    if (!name || name.length > 100 || names.has(name.toLowerCase())) fail(400, 'Enter a distinct Accountants name for each row (up to 100 characters).');
    if (!Number.isFinite(amount) || !Number.isSafeInteger(value) || value <= 0 || Math.abs(amount * 100 - value) > 0.00001) fail(400, 'Enter a positive Accountants amount with at most two decimal places.');
    names.add(name.toLowerCase());allocated += value;
    return {name, amountPKR:value / 100};
  });
  if (allocated > cents(totalPKR)) fail(400, 'Accountants amounts exceed the invoice fees received by Accountants.');
  return splits;
}
module.exports = { receipts, context, plan, decorate, accountantsSplits };
