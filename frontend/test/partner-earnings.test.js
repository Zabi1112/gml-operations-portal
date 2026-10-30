import test from "node:test";
import assert from "node:assert/strict";
import { summarizePartnerEarnings } from "../src/finance/partnerEarnings.js";

test("partner earnings include only current branch partners and consolidate by id", () => {
  const partners = [
    { id: 1, name: "Current Partner" },
    { id: 2, name: "Second Partner" }
  ];
  const settlements = [
    {
      partnerSplits: [
        { partnerId: 1, name: "Old Partner Name", amountPKR: 500 },
        { partnerId: 2, name: "Second Partner", amountPKR: 250 },
        { partnerId: 99, name: "Deleted Partner", amountPKR: 900 }
      ]
    },
    {
      partnerSplits: [
        { partnerId: "1", name: "Current Partner", amountPKR: 100 }
      ]
    }
  ];

  assert.deepEqual(summarizePartnerEarnings(settlements, partners), [
    { name: "Current Partner", amount: 600 },
    { name: "Second Partner", amount: 250 }
  ]);
});

test("legacy splits without ids match one current partner by normalized name", () => {
  const partners = [{ id: 1, name: "Current Partner" }];
  const settlements = [{
    partnerSplits: [
      { name: " current partner ", amountPKR: 125 },
      { name: "Deleted Partner", amountPKR: 800 }
    ]
  }];

  assert.deepEqual(summarizePartnerEarnings(settlements, partners), [
    { name: "Current Partner", amount: 125 }
  ]);
});
