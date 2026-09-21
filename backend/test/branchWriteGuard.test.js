const test = require("node:test");
const assert = require("node:assert/strict");
const { createBranchWriteGuard } = require("../src/middleware/branchWriteGuard");
const db = {
  branch: { findUnique: async ({where}) => [1,2,3].includes(where.id) ? { isActive: where.id !== 1 } : null }
};
for (const model of ["company","employee","truck","driver","invoice","salarySlip","loadReport","load","loadReportReason","branchPartner","branchDispatcher","invoiceSettlement","partnerLoan"]) {
  db[model] = { findUnique: async ({where}) => where.id === 999 ? null : { branchId: where.id === 10 ? 1 : where.id === 30 ? 3 : 2 } };
}
db.partnerLoanRepayment = { findUnique: async ({where}) => ({ loan: { branchId: where.id === 10 ? 1 : 2 } }) };
async function check(method, baseUrl, path, body = {}) {
  let status = 200; let message;
  const res = { status(code) { status = code; return this; }, json(data) { message = data.message; } };
  let allowed = false;
  await createBranchWriteGuard(db)({ method, baseUrl, path, body }, res, () => { allowed = true; });
  return { status, allowed, message };
}
test("historical reads remain available", async () => {
  assert.equal((await check("GET", "/api/companies", "/", { branchId: 1 })).allowed, true);
});
for (const [resource, path] of [
  ["employees","/10"], ["companies","/10"], ["trucks","/10"], ["drivers","/10"],
  ["invoices","/10"], ["salary-slips","/10"], ["loads","/10"], ["loads","/reasons/10"],
  ["load-reports","/10"], ["finance","/partners/10"], ["finance","/dispatchers/10"],
  ["finance","/settlements/10"], ["finance","/loans/10"], ["finance","/loans/repayment/10"],
  ["finance","/settings/1"], ["branches","/1"]
]) {
  test("archive blocks update and delete: " + resource + path, async () => {
    for(const method of ["PATCH", "DELETE"]) {
      const result = await check(method, "/api/" + resource, path, {branchId:2});
      assert.equal(result.status,409); assert.equal(result.allowed,false);
    }
  });
}
test("archive blocks creation and clearing invoices", async () => {
  assert.equal((await check("POST","/api/companies","/",{branchId:1})).status,409);
  assert.equal((await check("POST","/api/finance","/clear-invoice/10")).status,409);
  assert.equal((await check("POST","/api/finance","/loans/repayment",{loanId:10})).status,409);
});
test("new records cannot reference old employees, companies or partners", async () => {
  for(const field of ["employeeId","companyId","truckId","driverId","lenderPartnerId","borrowerPartnerId"]) {
    assert.equal((await check("POST","/api/loads","/",{branchId:2,[field]:10})).status,409);
  }
  assert.equal((await check("POST","/api/finance","/manual-settlement",{branchId:2,dispatcherSplits:[{dispatcherId:10}]})).status,409);
});
test("new-operation writes remain available", async () => {
  assert.equal((await check("POST","/api/companies","/",{branchId:2})).allowed,true);
  assert.equal((await check("PATCH","/api/companies","/20",{branchId:2})).allowed,true);
  assert.equal((await check("POST","/api/finance","/loans/repayment",{loanId:20})).allowed,true);
  assert.equal((await check("POST","/api/branches","/",{branchName:"New"})).allowed,true);
});
test("cross-branch references and invalid IDs are rejected", async () => {
  assert.equal((await check("POST","/api/trucks","/",{branchId:2,companyId:30})).status,400);
  assert.equal((await check("POST","/api/companies","/",{})).status,400);
  assert.equal((await check("PATCH","/api/companies","/bad",{})).status,400);
  assert.equal((await check("PATCH","/api/companies","/999",{})).status,404);
});
