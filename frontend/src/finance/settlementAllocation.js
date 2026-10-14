// Keep allocation behavior aligned with the backend utility.
export function allocatePartnerAmounts(
  total,
  dispatcher,
  accounts,
  partners,
  accountsPartnerId = null
) {
  const toCents = (value) => Math.round(Number(value) * 100);
  const revenueCents = toCents(total);
  const dispatcherCents = toCents(dispatcher);
  const accountsCents = toCents(accounts);

  if (
    ![revenueCents, dispatcherCents, accountsCents].every(Number.isSafeInteger) ||
    revenueCents < 0 ||
    dispatcherCents < 0 ||
    accountsCents < 0
  ) {
    throw new Error("Settlement amounts must be valid non-negative amounts.");
  }
  if (dispatcherCents + accountsCents > revenueCents) {
    throw new Error("Dispatcher and accounts amounts cannot exceed revenue.");
  }

  const hasSelectedPartner =
    accountsPartnerId !== null &&
    accountsPartnerId !== "" &&
    accountsPartnerId !== undefined;
  const selectedPartner = hasSelectedPartner
    ? partners.find((partner) => Number(partner.id) === Number(accountsPartnerId))
    : null;

  if (hasSelectedPartner && !selectedPartner) {
    throw new Error("Choose an accounts-fee partner from this branch.");
  }
  if (
    partners.some(
      (partner) =>
        !Number.isFinite(Number(partner.percent)) ||
        Number(partner.percent) < 0 ||
        Number(partner.percent) > 100
    )
  ) {
    throw new Error("Partner percentages must be between 0 and 100.");
  }
  if (
    hasSelectedPartner &&
    Math.abs(
      partners.reduce((sum, partner) => sum + Number(partner.percent), 0) - 100
    ) > 0.000001
  ) {
    throw new Error(
      "Partner percentages must total 100% before assigning the accounts fee."
    );
  }

  const distributableCents =
    revenueCents - dispatcherCents - (hasSelectedPartner ? 0 : accountsCents);
  const shares = partners.map((partner) => ({
    partnerId: partner.id,
    name: partner.name,
    percent: Number(partner.percent),
    grossCents: Math.round(
      (distributableCents * Number(partner.percent)) / 100
    )
  }));

  if (hasSelectedPartner) {
    const roundingCents =
      distributableCents - shares.reduce((sum, share) => sum + share.grossCents, 0);
    shares.find(
      (share) => Number(share.partnerId) === Number(accountsPartnerId)
    ).grossCents += roundingCents;
  }

  const partnerSplits = shares.map((share) => {
    const accountsDeductionCents =
      hasSelectedPartner &&
      Number(share.partnerId) === Number(accountsPartnerId)
        ? accountsCents
        : 0;

    if (accountsDeductionCents > share.grossCents) {
      throw new Error(
        "Accounts fee exceeds the selected partner share. Reduce the fee or choose another partner."
      );
    }

    return {
      partnerId: share.partnerId,
      name: share.name,
      percent: share.percent,
      grossAmountPKR: share.grossCents / 100,
      accountsDeductionPKR: accountsDeductionCents / 100,
      amountPKR: (share.grossCents - accountsDeductionCents) / 100
    };
  });

  return {
    partnerProfitPKR: (revenueCents - dispatcherCents - accountsCents) / 100,
    partnerSplits,
    accountsPartnerId: hasSelectedPartner ? Number(accountsPartnerId) : null
  };
}

export function defaultAccountsPartner(partners) {
  const majorityPartners = partners.filter(
    (partner) => Number(partner.percent) === 70
  );
  return majorityPartners.length === 1 ? String(majorityPartners[0].id) : "";
}
