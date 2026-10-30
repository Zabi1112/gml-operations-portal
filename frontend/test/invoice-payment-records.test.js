import test from "node:test";
import assert from "node:assert/strict";
import { getInvoicePaymentRecords } from "../src/finance/invoicePaymentRecords.js";

test("payment records show the amount allocated to an invoice", () => {
  const settlements = [
    {
      id: 1,
      invoiceId: 20,
      invoiceAmountUSD: 150,
      paymentMethod: "Wire Transfer",
      settlementDate: "2026-10-10",
      paymentAllocations: [
        { invoiceId: 10, amountUSD: 100 },
        { invoiceId: 20, amountUSD: 50 }
      ]
    },
    {
      id: 2,
      invoiceId: 10,
      invoiceAmountUSD: 35,
      paymentMethod: "PayPal",
      settlementDate: "2026-10-12",
      paymentAllocations: [{ invoiceId: 10, amountUSD: 35 }]
    },
    {
      id: 3,
      invoiceId: 30,
      invoiceAmountUSD: 200,
      paymentAllocations: [{ invoiceId: 30, amountUSD: 200 }]
    }
  ];

  assert.deepEqual(
    getInvoicePaymentRecords(10, settlements).map((record) => ({
      id: record.id,
      amountReceivedUSD: record.amountReceivedUSD,
      paymentMethod: record.paymentMethod
    })),
    [
      { id: 2, amountReceivedUSD: 35, paymentMethod: "PayPal" },
      { id: 1, amountReceivedUSD: 100, paymentMethod: "Wire Transfer" }
    ]
  );
});

test("legacy invoice settlements without allocations use their recorded invoice amount", () => {
  const records = getInvoicePaymentRecords(10, [
    { id: 1, invoiceId: 10, invoiceAmountUSD: 60 },
    { id: 2, invoiceId: 11, invoiceAmountUSD: 20 }
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].amountReceivedUSD, 60);
});
