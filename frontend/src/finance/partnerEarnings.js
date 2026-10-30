function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

export function summarizePartnerEarnings(settlements, partners) {
  const partnersById = new Map(
    partners.map((partner) => [String(partner.id), partner])
  );
  const partnersByName = new Map();

  partners.forEach((partner) => {
    const name = normalizeName(partner.name);
    if (!name) return;
    const matches = partnersByName.get(name) || [];
    matches.push(partner);
    partnersByName.set(name, matches);
  });

  const totals = new Map();

  settlements.forEach((settlement) => {
    const splits = Array.isArray(settlement.partnerSplits)
      ? settlement.partnerSplits
      : [];

    splits.forEach((split) => {
      let partner =
        split.partnerId === null || split.partnerId === undefined
          ? null
          : partnersById.get(String(split.partnerId));

      if (!partner) {
        const matches = partnersByName.get(normalizeName(split.name)) || [];
        if (matches.length === 1) [partner] = matches;
      }

      if (!partner) return;

      totals.set(
        partner.id,
        (totals.get(partner.id) || 0) + Number(split.amountPKR || 0)
      );
    });
  });

  return partners
    .filter((partner) => totals.has(partner.id))
    .map((partner) => ({
      name: partner.name,
      amount: totals.get(partner.id)
    }));
}
