const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateStatement, createPayStatementService } = require("../src/utils/payStatements");
const input = () => ({ branchId: 2, companyName: "ABC Transport", recipientName: "Test Driver", recipientType: "DRIVER", periodStart: "2026-09-01", periodEnd: "2026-09-07", percent: 30, weeks: 1, loads: [{ pickupDate: "2026-09-01", deliveryDate: "2026-09-03", origin: "PA", destination: "CA", miles: 5535, gross: 8900 }], deductions: [], additions: [] });
const owner = () => ({ ...input(), recipientType: "OWNER_OPERATOR", percent: 10, deductions: [["IFTA",75],["Office fee",65],["Insurance",750],["ELD",40]].map(([description,rate]) => ({description,rate,frequency:"WEEKLY"})) });
const status = code => e => e.status === code;
test("driver earns 30% of gross; deductions and additions apply after that share", () => {
  const body = input(); body.deductions = [{ description: "Advance", rate: 200, frequency: "ONCE" }]; body.additions = [{ description: "Bonus", rate: 50, frequency: "ONCE" }];
  const { totals } = calculateStatement(body);
  assert.equal(totals.grossCents, 890000); assert.equal(totals.earnedCents, 267000); assert.equal(totals.netCents, 252000);
});
test("owner-operator uses 10% of gross plus 930 weekly and variable fuel", () => {
  const body = owner(); body.deductions.push({ description: "Fuel", rate: 1200, frequency: "ONCE" });
  const { totals } = calculateStatement(body);
  assert.equal(totals.feeCents, 89000); assert.equal(totals.otherDeductionsCents, 213000); assert.equal(totals.netCents, 588000);
});
test("all rates, weeks and percentages are editable and fixed charges do not multiply", () => {
  const body = owner(); body.percent = 12.5; body.weeks = 2; body.deductions[0].rate = 50;
  body.deductions.push({ description: "Claim", rate: 100, frequency: "ONCE" });
  const s = calculateStatement(body); assert.equal(s.totals.feeCents, 111250); assert.equal(s.totals.otherDeductionsCents, 191000); assert.equal(s.totals.netCents, 587750);
  body.weeks = 0.5; const half = calculateStatement(body); assert.equal(half.form.deductions[0].amountCents, 2500);
});
test("cent rounding is consistent between line earnings and the total", () => {
  const body = input(); body.percent = 50; body.loads = Array.from({length:3}, () => ({...body.loads[0],gross:0.01}));
  const s = calculateStatement(body); assert.equal(s.totals.earnedCents, 2); assert.equal(s.loads.reduce((sum,l)=>sum+l.payCents,0), 2);
  const fractional = input(); fractional.percent = 10; fractional.loads[0].gross = 0.05; assert.equal(calculateStatement(fractional).totals.earnedCents,1);
});
test("negative net pay remains visible instead of being clamped", () => {
  const body = input(); body.deductions = [{description:"Advance",rate:3000,frequency:"ONCE"}]; assert.equal(calculateStatement(body).totals.netCents,-33000);
});
test("server ignores client-supplied totals and freezes company identity in the snapshot", () => {
  const body = input(); body.netCents = 1; body.totals = {netCents:1}; const s = calculateStatement(body);
  body.companyName = "Changed"; assert.equal(s.form.companyName,"ABC Transport"); assert.equal(s.totals.netCents,267000);
});
test("reject invalid dates, numbers, percentages, logo types and oversized inputs", () => {
  for (const patch of [{percent:101},{percent:-1},{percent:true},{weeks:""},{weeks:NaN},{weeks:0.001},{periodEnd:"2026-08-01"},{periodStart:"2026-02-30"},{recipientName:""},{companyLogo:"https://example.com/logo.png"},{companyLogo:"data:image/svg+xml;base64,aaaa"},{loads:[]},{loads:Array(101).fill(input().loads[0])},{deductions:[{description:"Fee",rate:1,frequency:"MONTHLY"}]}]) assert.throws(()=>calculateStatement({...input(),...patch}),status(400));
  const body = input(); body.loads[0].gross = 0.001; assert.throws(()=>calculateStatement(body),status(400));
});
function fixture() {
  const rows = []; const branches = [{id:1,isActive:false},{id:2,isActive:true}];
  const matches = (row,where)=>Object.entries(where).every(([k,v])=>row[k]===v);
  // Only payStatement and reference reads exist: any financial-table access fails this test.
  const db = {
    $queryRaw: async (_strings,branchId)=>branches.filter(b=>b.id===branchId),
    company: {findUnique: async ({where})=>({id:where.id,branchId:where.id===99?1:2})},
    driver: {findUnique: async ({where})=>({id:where.id,branchId:2,companyId:where.id===99?99:5})},
    truck: {findUnique: async ({where})=>({id:where.id,branchId:2,companyId:where.id===99?99:5})},
    payStatement: {
      create: async ({data})=>{const row={id:rows.length+1,revision:1,...structuredClone(data)};rows.push(row);return structuredClone(row);},
      updateMany: async ({where,data})=>{const row=rows.find(r=>matches(r,where));if(!row)return {count:0};const revision=row.revision+1;Object.assign(row,structuredClone(data),{revision});return {count:1};},
      findUnique: async ({where})=>structuredClone(rows.find(r=>matches(r,where))||null),
      findFirst: async ({where})=>structuredClone(rows.find(r=>matches(r,where))||null),
      findMany: async ({where,skip,take})=>structuredClone(rows.filter(r=>matches(r,where)).slice(skip,skip+take)),
      count: async ({where})=>rows.filter(r=>matches(r,where)).length,
    },
  };
  db.$transaction = fn=>fn(db);
  return {service:createPayStatementService(db),rows,branches};
}
test("create and edit only write paperwork; server recomputes totals and rejects stale edits",async()=>{
  const {service,rows}=fixture();const first=await service.save(input(),7);
  assert.equal(first.netCents,267000); assert.equal(rows.length,1);
  const edited=await service.save({...input(),percent:40,revision:first.revision},8,first.id);
  assert.equal(edited.netCents,356000);assert.equal(edited.revision,2);assert.equal(edited.createdBy,7);assert.equal(edited.updatedBy,8);
  await assert.rejects(service.save({...input(),revision:1},7,first.id),status(409));
  assert.equal((await service.detail(first.id,2)).netCents,356000);
});
test("preview does not persist any records",async()=>{
  const {service,rows}=fixture();assert.equal((await service.preview(input())).totals.netCents,267000);assert.equal(rows.length,0);
});
test("archived branches are readable and cannot save or preview new calculations",async()=>{
  const {service,branches}=fixture();const row=await service.save(input(),7);branches[1].isActive=false;
  assert.equal((await service.detail(row.id,2)).id,row.id);
  await assert.rejects(service.save({...input(),revision:1},7,row.id),status(409));await assert.rejects(service.preview(input()),status(409));
});
test("references must match branch and company; cross-branch detail and update are denied",async()=>{
  const {service}=fixture();
  for(const patch of [{companyId:99},{companyId:5,driverId:99},{companyId:5,truckId:99},{driverId:5}]) await assert.rejects(service.save({...input(),...patch},7),status(400));
  const row=await service.save({...input(),companyId:5,driverId:5,truckId:5},7);
  await assert.rejects(service.detail(row.id,1),status(404));
  await assert.rejects(service.save({...input(),branchId:1,revision:1},7,row.id),status(409));
  assert.equal((await service.list(1)).total,0);
});
