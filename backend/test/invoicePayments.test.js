const test=require('node:test'),assert=require('node:assert/strict');const p=require('../src/utils/invoicePayments');
const row=(id,amount,paid=0,carry=[])=>({id,currentChargesUSD:amount,paidAmountUSD:paid,netPayable:amount+carry.reduce((s,i)=>s+i.amountUSD,0),carryForward:carry});
test('partial receipts carry only remaining original charges across several invoices',async()=>{const first=row(1,1000,400),second=row(2,200,0,[{invoiceId:1,amountUSD:600}]);let rows=[first,second];assert.deepEqual(p.paymentPlan(second,rows,300),[{invoiceId:1,amountUSD:300}]);first.paidAmountUSD+=300;const db={invoice:{findMany:async()=>rows}};assert.equal((await p.outstanding(db,1,1)).totalUSD,500);const third=row(3,100,0,(await p.outstanding(db,1,1)).items);rows.push(third);assert.equal(third.netPayable,600);assert.deepEqual(p.paymentPlan(third,rows,600),[{invoiceId:1,amountUSD:300},{invoiceId:2,amountUSD:200},{invoiceId:3,amountUSD:100}]);first.paidAmountUSD=1000;assert.equal((await p.decorate(db,[second]))[0].outstandingAmountUSD,200);});
test('reject overpayment, invalid values and fractional cents',()=>{const i=row(1,100);for(const v of [0,-1,101,NaN,Infinity,0.001,1.234])assert.throws(()=>p.paymentPlan(i,[i],v));assert.deepEqual(p.paymentPlan(i,[i],99.99),[{invoiceId:1,amountUSD:99.99}]);});
test('payment method and clearance date are required and validated',()=>{
 const details=p.validatePaymentDetails('Remitly','', '2026-10-30');
 assert.equal(details.paymentMethod,'Remitly');
 assert.equal(details.settlementDate.toISOString(),'2026-10-30T00:00:00.000Z');
 assert.equal(p.validatePaymentDetails('Other','Cash deposit','2026-10-30').paymentMethod,'Other: Cash deposit');
 for(const [method,other,date] of [['', '', '2026-10-30'],['Unknown','','2026-10-30'],['Other',' ','2026-10-30'],['Other','x'.repeat(101),'2026-10-30'],['PayPal','','2026-02-30']])assert.throws(()=>p.validatePaymentDetails(method,other,date));
});
test('invoice decoration exposes paid and remaining amounts for re-downloaded partial invoices',async()=>{const i=row(1,100,35);const [result]=await p.decorate({invoice:{findMany:async()=>[]}},[i]);assert.equal(result.paymentStatus,'PARTIAL');assert.equal(result.receivedAmountUSD,35);assert.equal(result.outstandingAmountUSD,65);});
test('reconciled old invoice is transferred, never presented as a cash receipt',async()=>{const i={...row(1,0),netPayable:500,balanceTransferredToInvoiceId:2};const [result]=await p.decorate({},[i]);assert.equal(result.paymentStatus,'CARRIED_FORWARD');assert.equal(result.receivedAmountUSD,0);assert.equal(result.outstandingAmountUSD,0);});
test('unpaid invoices with pending balances remain editable',async()=>{
 const invoice={...row(2,200,0,[{invoiceId:1,amountUSD:50}]),companyId:9,branchId:3};
 const db={invoice:{findMany:async()=>[invoice]},invoiceSettlement:{count:async()=>0}};
 await assert.doesNotReject(()=>p.assertEditable(db,invoice));
});
test('paid invoices and balances carried into later invoices cannot be edited',async()=>{
 const paid={...row(1,100,20),companyId:9,branchId:3};
 const carried={...row(1,100),companyId:9,branchId:3};
 const later={...row(2,50,0,[{invoiceId:1,amountUSD:100}]),companyId:9,branchId:3};
 const db={invoice:{findMany:async()=>[carried,later]},invoiceSettlement:{count:async()=>0}};
 await assert.rejects(()=>p.assertEditable(db,paid),/cannot be edited/);
 await assert.rejects(()=>p.assertEditable(db,carried),/cannot be edited/);
});
test('invoice settlements also prevent editing even when payment totals are inconsistent',async()=>{
 const invoice={...row(1,100),companyId:9,branchId:3};
 const db={invoice:{findMany:async()=>[invoice]},invoiceSettlement:{count:async()=>1}};
 await assert.rejects(()=>p.assertEditable(db,invoice),/cannot be edited/);
});
test('legacy invoice without carry-forward allocations does not treat included previous balance as paid',async()=>{
 const invoice={
  ...row(1,1073.5),
  netPayable:2136,
  currentChargesUSD:1073.5,
  previousInvoiceAmount:1062.5,
  includePreviousInvoiceInNet:true,
  carryForward:null,
  companyId:9,
  branchId:2
 };
 assert.equal(p.ownDue(invoice),213600);
 assert.deepEqual(p.paymentPlan(invoice,[invoice],2136),[{invoiceId:1,amountUSD:2136}]);
 const [decorated]=await p.decorate({invoice:{findMany:async()=>[]}},[invoice]);
 assert.equal(decorated.paymentStatus,'PENDING');
 assert.equal(decorated.receivedAmountUSD,0);
 assert.equal(decorated.outstandingAmountUSD,2136);
 const db={invoice:{findMany:async()=>[invoice]},invoiceSettlement:{count:async()=>0}};
 await assert.doesNotReject(()=>p.assertEditable(db,invoice));
});

test('reconciled balances never add the previous invoice twice or revive transferred debt',async()=>{
 const historical={...row(10,0),netPayable:2530,carryForward:null,includePreviousInvoiceInNet:true,previousInvoiceAmount:1800,balanceTransferredToInvoiceId:11};
 const current={...row(11,4106.5,2000),carryForward:null,includePreviousInvoiceInNet:true,previousInvoiceAmount:2530};
 assert.equal(p.ownDue(historical),0);assert.equal(p.ownDue(current),210650);
 const result=await p.outstanding({invoice:{findMany:async()=>[historical,current]}},2,8);
 assert.equal(result.totalUSD,2106.5);assert.deepEqual(result.items,[{invoiceId:11,invoiceNumber:undefined,amountUSD:2106.5}]);
});
test('latest invoice is the only payment target, even when history is filtered',async()=>{
 const old={...row(1,4106.5,2000),companyId:8,branchId:2,invoiceNumber:'005',createdAt:'2026-10-25'};
 const next={...row(2,200,0,[{invoiceId:1,amountUSD:2106.5}]),companyId:8,branchId:2,invoiceNumber:'006',createdAt:'2026-11-07'};
 assert.throws(()=>p.paymentPlan(old,[old,next],100),e=>e.status===409&&e.message.includes('006'));
 assert.deepEqual(p.paymentPlan(next,[old,next],100),[{invoiceId:1,amountUSD:100}]);
 const [display]=await p.decorate({invoice:{findMany:async()=>[old,next]}},[old]);
 assert.equal(display.canRecordPayment,false);assert.equal(display.paymentStatus,'CARRIED_FORWARD');assert.equal(display.outstandingAmountUSD,0);assert.equal(display.carriedForwardAmountUSD,2106.5);assert.equal(display.receivedAmountUSD,2000);assert.equal(display.paymentTargetInvoiceId,2);
});
test('several invoice generations preserve exactly one copy of each original remaining charge',async()=>{
 const first={...row(1,4106.5,2000),companyId:8,branchId:2,carryForward:null,previousInvoiceAmount:2530,includePreviousInvoiceInNet:true};let rows=[first];const db={invoice:{findMany:async()=>rows}};
 const next={...row(2,500,0,(await p.outstanding(db,2,8)).items),companyId:8,branchId:2};rows.push(next);
 for(const item of p.paymentPlan(next,rows,1000))rows.find(i=>i.id===item.invoiceId).paidAmountUSD+=item.amountUSD;
 const third={...row(3,300,0,(await p.outstanding(db,2,8)).items),companyId:8,branchId:2};rows.push(third);
 assert.equal(third.netPayable,1906.5);assert.equal((await p.outstanding(db,2,8)).totalUSD,1906.5);
 assert.throws(()=>p.paymentPlan(next,rows,1),e=>e.status===409);
 for(const item of p.paymentPlan(third,rows,1906.5))rows.find(i=>i.id===item.invoiceId).paidAmountUSD+=item.amountUSD;
 assert.equal((await p.outstanding(db,2,8)).totalUSD,0);
});
