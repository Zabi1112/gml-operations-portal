import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  allocatePartnerAmounts,
  defaultAccountsPartner
} from "../src/finance/settlementAllocation.js";

const require = createRequire(import.meta.url);
const backendAllocation = require("../../backend/src/utils/settlementAllocation.js");

const partners = [
  { id: 1, name: "Partner 15", percent: 15 },
  { id: 2, name: "Partner 5", percent: 5 },
  { id: 3, name: "Partner 10", percent: 10 },
  { id: 4, name: "Partner 70", percent: 70 }
];

test("frontend and backend allocate the accounts deduction identically", () => {
  const frontend = allocatePartnerAmounts(10000, 2000, 500, partners, 4);
  const backend = backendAllocation.allocatePartnerAmounts(
    10000,
    2000,
    500,
    partners,
    4
  );

  assert.deepEqual(frontend, backend);
  assert.equal(defaultAccountsPartner(partners), "4");
  assert.equal(frontend.partnerSplits[3].amountPKR, 5100);
  assert.equal(frontend.partnerSplits[0].amountPKR, 1200);
});
