const cents = value => Math.round(Number(value || 0) * 100);
export function paymentFeePreview(invoice, form) {
  const pending = cents(invoice?.accountsFeePendingUSD);
  const due = cents(invoice?.outstandingAmountUSD ?? invoice?.netPayable);
  const received = cents(form.amountReceivedUSD);
  const full = received > 0 && received === due;
  const fee = full ? pending : form.includesAccountsFee === 'yes' ? cents(form.accountsFeeReceivedUSD) : 0;
  let error = '';
  if (invoice?.accountsFeeBalanceConflict) error = 'Unpaid accounts fees exceed a recorded invoice balance. Reconcile the balance before recording payment.';
  else if (pending > 0 && !full && !form.includesAccountsFee) error = 'Choose whether this partial payment includes accounts fees.';
  else if (!Number.isSafeInteger(fee) || fee < 0 || fee > pending || fee > received) error = 'Accounts fee received cannot exceed the payment or pending accounts fee.';
  else if (!full && form.includesAccountsFee === 'yes' && fee <= 0) error = 'Enter the accounts fee amount received.';
  else if (received - fee > due - pending) error = 'Include the accounts fee portion: this payment exceeds the remaining non-accounts balance.';
  return { full, pendingUSD: pending / 100, feeUSD: fee / 100, error };
}
export function receivedInvoiceFeeUSD(settlement) {
  return (settlement.paymentAllocations || []).reduce((sum, allocation) => sum + cents(allocation.accountsFeeUSD), 0) / 100;
}

export function partnerReceiptGross(settlement) {
  const feeUSD = receivedInvoiceFeeUSD(settlement);
  const feePKR = cents(feeUSD * Number(settlement.usdRate || 0));
  return {
    usd: (cents(settlement.invoiceAmountUSD) - cents(feeUSD)) / 100,
    pkr: (cents(settlement.totalAmountPKR) - feePKR) / 100
  };
}

export function accountsTeamSummary(settlement) {
  const splits = (settlement.paymentAllocations || []).flatMap(item => Array.isArray(item.accountsTeamSplits) ? item.accountsTeamSplits : []);
  const total = cents(settlement.accountsAmountPKR);
  const assigned = splits.reduce((sum,row)=>sum+cents(row.amountPKR),0);
  return {splits,totalPKR:total/100,unassignedPKR:Math.max(0,total-assigned)/100};
}
