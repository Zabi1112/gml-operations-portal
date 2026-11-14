const test = require('node:test');
const assert = require('node:assert/strict');
const fees = require('../src/utils/invoiceAccountsFees');
const payments = require('../src/utils/invoicePayments');
const row = (id, charges, fee, paid = 0, carry = []) => ({ id, branchId: 1, companyId: 1,
  createdAt: new Date(2026, 0, id), currentChargesUSD: charges, accountsFeeTotal: fee,
  paidAmountUSD: paid, carryForward: carry, netPayable: charges + carry.reduce((n,s)=>n+s.amountUSD,0) });
const apply = (rows, plan) => { for (const a of plan.allocations) rows.find(r=>r.id===a.invoiceId).paidAmountUSD += a.amountUSD; };

test('historical partial payments received no accounts fees; 260 less 100 leaves 160', () => {
  const invoice = row(1, 1000, 260, 200);
  const old = { paymentAllocations: [{invoiceId:1, amountUSD:200}], accountsAmountPKR:500 };
  assert.equal(fees.context(invoice,[invoice],[old]).pendingCents,26000);
  const plan = fees.plan(invoice,[invoice],[old],300,100);
  apply([invoice],plan);
  assert.equal(fees.context(invoice,[invoice],[old,{paymentAllocations:plan.allocations}]).pendingCents,16000);
  assert.equal(payments.ownDue(invoice),50000);
});
test('full clearance automatically receives every pending fee', () => {
  const invoice = row(1,500,260);
  const plan = fees.plan(invoice,[invoice],[],500,0);
  assert.equal(plan.accountsFeeUSD,260);
  apply([invoice],plan);
  assert.equal(fees.context(invoice,[invoice],[{paymentAllocations:plan.allocations}]).pendingCents,0);
  assert.equal(payments.ownDue(invoice),0);
});
test('non-fee payments preserve fee debt and can allocate revenue to newer sources', () => {
  const first=row(1,260,260), next=row(2,500,0,0,[{invoiceId:1,amountUSD:260}]);
  const plan=fees.plan(next,[first,next],[],500,0);
  assert.deepEqual(plan.allocations,[{invoiceId:2,amountUSD:500,accountsFeeUSD:0,accountsFeeAllocations:[]}]);
  apply([first,next],plan);
  assert.equal(fees.context(next,[first,next],[{paymentAllocations:plan.allocations}]).pendingCents,26000);
});
test('carry forward through multiple generations counts original fees once', async () => {
  const first=row(1,500,260), second=row(2,200,40,0,[{invoiceId:1,amountUSD:500}]);
  const rows=[first,second];const paid=fees.plan(second,rows,[],200,100);apply(rows,paid);
  const previous=await payments.outstanding({invoice:{findMany:async()=>rows}},1,1);
  const third=row(3,100,10,0,previous.items);rows.push(third);
  const ledger=[{paymentAllocations:paid.allocations}];
  assert.equal(fees.context(third,rows,ledger).pendingCents,21000);
  const final=fees.plan(third,rows,ledger,600);
  assert.equal(final.accountsFeeUSD,210);
  apply(rows,final);ledger.push({paymentAllocations:final.allocations});
  assert.equal(fees.context(third,rows,ledger).pendingCents,0);
  assert.equal((await payments.outstanding({invoice:{findMany:async()=>rows}},1,1)).totalUSD,0);
});
test('legacy transferred fees remain tied to original invoices and reversal restores them', () => {
  const old={...row(1,0,260),balanceTransferredToInvoiceId:2,carryForward:null};
  const current={...row(2,600,40),carryForward:null};
  const rows=[old,current];
  assert.equal(fees.context(current,rows,[]).pendingCents,30000);
  const plan=fees.plan(current,rows,[],200,100);apply(rows,plan);
  assert.equal(fees.context(current,rows,[{paymentAllocations:plan.allocations}]).pendingCents,20000);
  for(const a of plan.allocations)rows.find(r=>r.id===a.invoiceId).paidAmountUSD-=a.amountUSD;
  assert.equal(fees.context(current,rows,[]).pendingCents,30000);
});
test('invalid fees and payments exceeding non-fee revenue are rejected', () => {
  const invoice=row(1,500,260);
  for(const value of [undefined,null,'',-1,201,NaN,Infinity,0.001])assert.throws(()=>fees.plan(invoice,[invoice],[],200,value));
  assert.throws(()=>fees.plan(invoice,[invoice],[],300,0),/non-accounts/);
  assert.throws(()=>fees.plan(invoice,[invoice],[],400,261));
  assert.equal(fees.plan(invoice,[invoice],[],200,0).accountsFeeUSD,0);
});
test('inconsistent legacy balances require reconciliation instead of inventing receipts', () => {
  const invoice=row(1,500,260,400);
  assert.equal(fees.context(invoice,[invoice],[]).pendingCents,26000);
  assert.throws(()=>fees.plan(invoice,[invoice],[],100),/Reconcile/);
});
test('fee metadata is only added to admin invoice responses', async () => {
  const invoice=row(1,500,260);
  let reads=0;
  const db={invoice:{findMany:async()=>[invoice]},invoiceSettlement:{findMany:async()=>{reads++;return []}}};
  assert.equal((await payments.decorate(db,[invoice]))[0].accountsFeePendingUSD,undefined);
  assert.equal(reads,0);
  assert.equal((await payments.decorate(db,[invoice],true))[0].accountsFeePendingUSD,260);
});
test('fees from another branch or company cannot enter a receipt', () => {
  const invoice=row(2,500,10);
  const unrelated={...row(1,500,260),companyId:99,balanceTransferredToInvoiceId:2};
  assert.equal(fees.context(invoice,[invoice,unrelated],[]).pendingCents,1000);
});

test('accounts fees can be split across recipients without changing other partners',()=>{
 const splits=[{partnerId:1,amountPKR:1000},{partnerId:2,amountPKR:2000},{partnerId:3,amountPKR:3000}];
 const result=fees.distributeToPartners(splits,[{partnerId:1,amountUSD:100},{partnerId:2,amountUSD:160}],260,280);
 assert.equal(result[0].normalSharePKR,1000);assert.equal(result[0].accountsFeeReceivedPKR,28000);assert.equal(result[0].amountPKR,29000);
 assert.equal(result[1].amountPKR,46800);assert.deepEqual(result[2],splits[2]);assert.equal(splits[0].amountPKR,1000);
});
test('fee recipient validation rejects unknown, duplicate, negative and excessive allocations',()=>{
 const splits=[{partnerId:1,amountPKR:1000}];
 for(const requested of [[{partnerId:9,amountUSD:1}],[{partnerId:1,amountUSD:1},{partnerId:1,amountUSD:1}],[{partnerId:1,amountUSD:-1}],[{partnerId:1,amountUSD:0.001}],[{partnerId:1,amountUSD:101}],null])
   assert.throws(()=>fees.distributeToPartners(splits,requested,100,280));
 assert.throws(()=>fees.distributeToPartners(splits,[{partnerId:1,amountUSD:1}],0,280));
 assert.deepEqual(fees.distributeToPartners(splits,[],100,280),splits);
});
test('recipient currency conversion preserves aggregate rounding',()=>{
 const result=fees.distributeToPartners([{partnerId:1,amountPKR:0},{partnerId:2,amountPKR:0}],[{partnerId:1,amountUSD:0.01},{partnerId:2,amountUSD:0.01}],0.02,280.5);
 assert.equal(Math.round(result.reduce((n,p)=>n+p.accountsFeeReceivedPKR,0)*100),561);
});
