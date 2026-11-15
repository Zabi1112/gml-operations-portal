export function getInvoicePaymentRecords(invoiceId, settlements) {
  const targetInvoiceId = Number(invoiceId);

  return settlements
    .map((settlement) => {
      // A receipt recorded on this invoice includes its carried-forward balance.
      // Its internal allocation to new charges is not the amount received.
      if (Number(settlement.invoiceId) === targetInvoiceId) {
        return { ...settlement, amountReceivedUSD: Number(settlement.invoiceAmountUSD || 0) };
      }
      if (Array.isArray(settlement.paymentAllocations)) {
        const amountReceivedUSD = settlement.paymentAllocations
          .filter((allocation) => Number(allocation.invoiceId) === targetInvoiceId)
          .reduce((total, allocation) => total + Number(allocation.amountUSD || 0), 0);

        return amountReceivedUSD > 0
          ? { ...settlement, amountReceivedUSD }
          : null;
      }

      return null;
    })
    .filter(Boolean)
    .sort(
      (first, second) =>
        new Date(second.settlementDate || second.createdAt).getTime() -
        new Date(first.settlementDate || first.createdAt).getTime()
    );
}
