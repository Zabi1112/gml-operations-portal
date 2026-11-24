const test=require('node:test'),assert=require('node:assert/strict');
const {carryCorrections,prepareRevision}=require('../src/utils/invoiceEditRevision');
const {decorate}=require('../src/utils/invoicePayments');
const invoice={id:1,branchId:1,companyId:1,createdAt:'2026-11-01',updatedAt:new Date('2026-11-24'),invoiceNumber:'INV-1',carryForward:[],currentChargesUSD:1000,netPayable:1000,paidAmountUSD:600,accountsFeeTotal:0,loads:[]};
const next={...invoice,id:2,createdAt:'2026-11-02',currentChargesUSD:500,paidAmountUSD:0,netPayable:900,previousInvoiceAmount:400,includePreviousInvoiceInNet:true,carryForward:[{invoiceId:1,amountUSD:400}]};
test('discount correction updates each later carry-forward once without changing receipts',()=>{
 const third={...next,id:3,createdAt:'2026-11-03',carryForward:[{invoiceId:1,amountUSD:400},{invoiceId:2,amountUSD:500}],netPayable:1400,previousInvoiceAmount:900};
 const changes=carryCorrections(invoice,[invoice,next,third],90000);
 assert.equal(changes.length,2);assert.equal(changes[0].data.previousInvoiceAmount,300);assert.equal(changes[0].data.netPayable,800);assert.equal(changes[1].data.previousInvoiceAmount,800);assert.equal(changes[1].data.netPayable,1300);
 assert.ok(changes.every(c=>!Object.hasOwn(c.data,'paidAmountUSD')));
});
test('increased charge on previously paid invoice becomes due on later modern invoices',()=>{
 const paid={...invoice,paidAmountUSD:1000};const later={...next,netPayable:500,previousInvoiceAmount:0,includePreviousInvoiceInNet:false,carryForward:[]};
 const changes=carryCorrections(paid,[paid,later],110000);assert.deepEqual(changes[0].data.carryForward,[{invoiceId:1,amountUSD:100}]);assert.equal(changes[0].data.netPayable,600);
});
test('paid invoice correction archives original and retains actual paid total',async()=>{
 const original={...invoice,paidAmountUSD:1000};let archived;
 const tx={invoice:{findMany:async()=>[original]},invoiceSettlement:{findMany:async()=>[{invoiceAmountUSD:1000}]},$executeRawUnsafe:async(sql,...args)=>{archived=JSON.parse(args[5]);}};
 const result=await prepareRevision(tx,original,{netPayable:900,accountsFeeTotal:0},{expectedUpdatedAt:original.updatedAt.toISOString(),reason:'Missed discount'},7);
 assert.equal(result.paidAmountUSD,1000);assert.equal(result.currentChargesUSD,900);assert.equal(archived.invoice.netPayable,1000);assert.equal(archived.settlements[0].invoiceAmountUSD,1000);
 const corrected={...original,...result,netPayable:900};const [view]=await decorate({invoice:{findMany:async()=>[corrected]}},[corrected]);assert.equal(view.overpaymentCreditUSD,100);assert.equal(view.receivedAmountUSD,1000);assert.equal(view.outstandingAmountUSD,0);
});
test('stale invoice and missing reason are rejected before changes; paid accountant fees cannot be removed',async()=>{
 let writes=0;const tx={invoice:{findMany:async()=>[invoice]},invoiceSettlement:{findMany:async()=>[{paymentAllocations:[{accountsFeeAllocations:[{invoiceId:1,amountUSD:50}]}]}]},$executeRawUnsafe:async()=>{writes++;}};
 await assert.rejects(()=>prepareRevision(tx,invoice,{netPayable:900,accountsFeeTotal:100},{expectedUpdatedAt:'old',reason:'Reason'},7),/changed/);
 await assert.rejects(()=>prepareRevision(tx,invoice,{netPayable:900,accountsFeeTotal:0},{expectedUpdatedAt:invoice.updatedAt.toISOString(),reason:'Reason'},7),/already received/);
 await assert.rejects(()=>prepareRevision(tx,invoice,{netPayable:900,accountsFeeTotal:100},{expectedUpdatedAt:invoice.updatedAt.toISOString(),reason:''},7),/reason/);assert.equal(writes,0);
});
test('legacy consolidated monetary corrections remain explicit while unchanged charges permit metadata edits',()=>{
 const legacy={...invoice,balanceTransferredToInvoiceId:2};assert.deepEqual(carryCorrections(legacy,[legacy,next],100000),[]);assert.throws(()=>carryCorrections(legacy,[legacy,next],90000),/replacement invoice/);
});
