const test = require("node:test");
const assert = require("node:assert/strict");
const {
  allocatePartnerAmounts,
  defaultAccountsPartnerId
} = require("../src/utils/settlementAllocation");

const partners = [
  { id: 1, name: "Partner 15", percent: 15 },
  { id: 2, name: "Partner 5", percent: 5 },
  { id: 3, name: "Partner 10", percent: 10 },
  { id: 4, name: "Partner 70", percent: 70 }
];

test("accounts fee is deducted only from the selected partner after dispatch", () => {
  const result = allocatePartnerAmounts(10000, 2000, 500, partners, 4);

  assert.equal(result.partnerProfitPKR, 7500);
  assert.deepEqual(
    result.partnerSplits.map(({ grossAmountPKR, accountsDeductionPKR, amountPKR }) => ({
      grossAmountPKR,
      accountsDeductionPKR,
      amountPKR
    })),
    [
      { grossAmountPKR: 1200, accountsDeductionPKR: 0, amountPKR: 1200 },
      { grossAmountPKR: 400, accountsDeductionPKR: 0, amountPKR: 400 },
      { grossAmountPKR: 800, accountsDeductionPKR: 0, amountPKR: 800 },
      { grossAmountPKR: 5600, accountsDeductionPKR: 500, amountPKR: 5100 }
    ]
  );
  assert.equal(
    result.partnerSplits.reduce((sum, partner) => sum + partner.amountPKR, 0),
    result.partnerProfitPKR
  );
});

test("accounts fee can be assigned to the partner selected for this settlement", () => {
  const result = allocatePartnerAmounts(10000, 2000, 500, partners, 1);

  assert.equal(result.accountsPartnerId, 1);
  assert.equal(result.partnerSplits[0].amountPKR, 700);
  assert.equal(result.partnerSplits[3].amountPKR, 5600);
});

test("default accounts partner is the unique 70 percent partner", () => {
  assert.equal(defaultAccountsPartnerId(partners), 4);
  assert.equal(defaultAccountsPartnerId(partners.slice(0, 3)), null);
  assert.equal(
    defaultAccountsPartnerId([...partners, { id: 5, percent: 70 }]),
    null
  );
});

test("rejects invalid partner selections, percentages, and deductions", () => {
  assert.throws(
    () => allocatePartnerAmounts(10000, 2000, 500, partners, 99),
    /Choose an accounts-fee partner/
  );
  assert.throws(
    () => allocatePartnerAmounts(10000, 2000, 500, partners.slice(0, 3), 1),
    /must total 100%/
  );
  assert.throws(
    () => allocatePartnerAmounts(1000, 0, 800, partners, 1),
    /exceeds the selected partner share/
  );
});
