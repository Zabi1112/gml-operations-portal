const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createContractService, validateInput, CONSENT } = require("../src/utils/contracts");
const input = { branchId: 2, companyName: "Test Carrier", companyMC: "123456", ratePercent: "4", seats: "2", effectiveDate: "2026-09-23" };
function fixture() {
  const rows = [];
  const branches = [{ id: 1, isActive: false }, { id: 2, isActive: true }];
  const match = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
  const db = {
    $queryRaw: async (_strings, id) => branches.filter(b => b.id === id),
    company: { findUnique: async ({ where }) => ({ id: where.id, branchId: where.id === 10 ? 1 : 2 }) },
    dispatchContract: {
      create: async ({ data }) => { const row = { id: rows.length + 1, status: "PENDING", templateVersion: "ewl-1", createdAt: new Date(), ...data }; rows.push(row); return { ...row }; },
      findUnique: async ({ where, include }) => { const row = rows.find(r => match(r, where)); return row ? { ...row, ...(include ? { branch: branches.find(b => b.id === row.branchId) } : {}) } : null; },
      findFirst: async ({ where }) => { const row = rows.find(r => match(r, where)); return row ? { ...row, branch: branches.find(b => b.id === row.branchId) } : null; },
      findMany: async ({ where }) => rows.filter(r => match(r, where)),
      updateMany: async ({ where, data }) => { const matching = rows.filter(r => match(r, where)); matching.forEach(r => Object.assign(r, data)); return { count: matching.length }; },
    },
  };
  db.$transaction = fn => fn(db);
  return { service: createContractService(db), rows, branches };
}
const status = code => error => error.status === code;
const response = agreement => ({ action: "sign", signerName: "Test Signer", consent: true, documentHash: agreement.documentHash });
test("new agreement snapshots supplied terms and new company identity", async () => {
  const { service } = fixture();
  const agreement = await service.create(input, 7);
  assert.match(agreement.token, /^[a-f0-9]{64}$/);
  assert.match(agreement.termsText, /EastWestLogisticsLLC/);
  assert.match(agreement.termsText, /Zeeshan Cheema/);
  assert.match(agreement.termsText, /4% weekly/);
  assert.doesNotMatch(agreement.termsText, /Black Matter|Sagheer|Wyoming|30-1327737|Already Delivered/);
  assert.equal(agreement.documentHash, createHash("sha256").update(agreement.termsText).digest("hex"));
  const second = await service.create(input, 7); assert.notEqual(second.token, agreement.token);
});
test("cross-device public access uses persisted records and omits internal fields", async () => {
  const { service } = fixture(); const agreement = await service.create(input, 7);
  const publicRow = await service.publicGet(agreement.token);
  assert.equal(publicRow.canRespond, true);
  for (const field of ["token", "branchId", "createdBy", "companyId"]) assert.equal(field in publicRow, false);
  await assert.rejects(service.publicGet("a".repeat(64)), status(404));
  await assert.rejects(service.publicGet("invalid"), status(404));
});
test("signing stores name, consent and server timestamp and cannot be repeated", async () => {
  const { service } = fixture(); const agreement = await service.create(input, 7);
  const signed = await service.respond(agreement.token, response(agreement));
  assert.equal(signed.status, "SIGNED"); assert.equal(signed.signerName, "Test Signer");
  assert.equal(signed.consentText, CONSENT); assert.ok(signed.signedAt instanceof Date);
  assert.equal((await service.publicGet(agreement.token)).canRespond, false);
  await assert.rejects(service.respond(agreement.token, response(agreement)), status(409));
  await assert.rejects(service.cancel(agreement.id, 2), status(409));
});
test("simultaneous responses permit only one state transition", async () => {
  const { service } = fixture(); const agreement = await service.create(input, 7);
  const results = await Promise.allSettled([service.respond(agreement.token, response(agreement)), service.respond(agreement.token, { ...response(agreement), action: "reject" })]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.status, 409);
});
test("signing requires consent, a name and the reviewed document hash", async () => {
  const { service } = fixture(); const agreement = await service.create(input, 7);
  for (const patch of [{ consent: false }, { signerName: " " }, { signerName: "Name\nInjected clause" }, { action: "edit" }]) await assert.rejects(service.respond(agreement.token, { ...response(agreement), ...patch }), status(400));
  await assert.rejects(service.respond(agreement.token, { ...response(agreement), documentHash: "other" }), status(409));
  assert.equal((await service.publicGet(agreement.token)).status, "PENDING");
});
test("rejection and cancellation permanently close signing", async () => {
  const { service } = fixture();
  const first = await service.create(input, 7); const second = await service.create(input, 7);
  await service.respond(first.token, { action: "reject", documentHash: first.documentHash });
  await service.cancel(second.id, 2);
  for (const agreement of [first, second]) await assert.rejects(service.respond(agreement.token, response(agreement)), status(409));
  assert.equal((await service.publicGet(first.token)).status, "REJECTED");
  assert.equal((await service.publicGet(second.token)).status, "CANCELLED");
});
test("archive remains readable but cannot create, cancel or sign", async () => {
  const { service, branches } = fixture(); const agreement = await service.create(input, 7);
  branches[1].isActive = false;
  await assert.rejects(service.create(input, 7), status(409));
  await assert.rejects(service.cancel(agreement.id, 2), status(409));
  await assert.rejects(service.respond(agreement.token, response(agreement)), status(409));
  assert.equal((await service.publicGet(agreement.token)).canRespond, false);
  assert.equal((await service.list(2)).length, 1);
});
test("company references, details and cancellation enforce branch boundaries", async () => {
  const { service } = fixture();
  await assert.rejects(service.create({ ...input, companyId: 10 }, 7), status(400));
  const agreement = await service.create(input, 7);
  await assert.rejects(service.detail(agreement.id, 1), status(404));
  assert.equal((await service.list(1)).length, 0);
  await assert.rejects(service.cancel(agreement.id, 3), status(404));
});
test("invalid company, date, fee and seat values are rejected", () => {
  for (const patch of [{ companyName: "" }, { companyName: "A\nFake clause" }, { companyName: "x".repeat(201) }, { effectiveDate: "2026-02-30" }, { effectiveDate: "bad" }, { ratePercent: -1 }, { ratePercent: 101 }, { ratePercent: true }, { seats: 1.5 }, { seats: -1 }, { seats: "" }, { branchId: -1 }]) assert.throws(() => validateInput({ ...input, ...patch }), status(400));
});
