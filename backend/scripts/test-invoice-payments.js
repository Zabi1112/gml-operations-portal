// Explicit opt-in integration test. Fixtures are always rolled back; no real receipts are recorded.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');require('dotenv').config({path:require('node:path').join(__dirname,'../.env'),quiet:true});const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();const rollback=new Error('TEST_ROLLBACK');
async function main(){if(!process.argv.includes('--run'))throw new Error('Use --run to test against configured database in a rolled-back transaction.');await db.$transaction(async tx=>{
 const proxy=new Proxy(tx,{get:(target,key)=>key==='$transaction'?async fn=>fn(proxy):target[key]});
 const prismaPath=require.resolve('../src/utils/prisma');require.cache[prismaPath]={id:prismaPath,filename:prismaPath,loaded:true,exports:proxy};
 const finance=require('../src/controllers/finance.controller'),invoices=require('../src/controllers/invoice.controller'),p=require('../src/utils/invoicePayments');
 const b=await tx.branch.create({data:{id:-200000001,branchName:'PAYMENT TEST ROLLBACK',partners:{create:{name:'Test Partner',percent:100}}}});
 const c=await tx.company.create({data:{id:-200000001,branchId:b.id,companyName:'PAYMENT TEST ROLLBACK'}});
 const common={branchId:b.id,companyId:c.id,invoiceStart:new Date(),invoiceEnd:new Date(),carryForward:[],companyName:'TEST'};
 const first=await tx.invoice.create({data:{...common,id:-200000001,invoiceNumber:'TEST-A',netPayable:1000,currentChargesUSD:1000}});
 const call=async(method,req)=>{let status=200,body;await (invoices[method]||finance[method])(req,{status(n){status=n;return this;},json(v){body=v;return this;}});return {status,body};};
 const body={amountReceivedUSD:400,usdRate:280,dispatcherValue:25,accountsValue:0,paymentRequestId:randomUUID(),paymentMethod:'Remitly',settlementDate:'2026-10-30'};
 let response=await call('clearInvoice',{params:{invoiceId:first.id},body,user:{name:'Test'}});assert.equal(response.status,201,JSON.stringify(response.body));assert.equal(response.body.settlement.totalAmountPKR,112000);assert.equal(response.body.settlement.dispatcherAmountPKR,28000);assert.equal(response.body.settlement.paymentMethod,'Remitly');assert.equal(response.body.settlement.settlementDate.toISOString().slice(0,10),'2026-10-30');const sid=response.body.settlement.id;
 response=await call('clearInvoice',{params:{invoiceId:first.id},body});assert.equal(response.body.settlement.id,sid,'Retry must return same receipt');assert.equal((await tx.invoice.findUnique({where:{id:first.id}})).paidAmountUSD,400);
 const balance=await p.outstanding(tx,b.id,c.id);assert.equal(balance.totalUSD,600);
 response=await call('createInvoice',{body:{branchId:b.id,companyId:c.id,companyName:'TEST',invoiceNumber:'TEST-B',invoiceStart:'2026-10-29',invoiceEnd:'2026-10-29',billingType:'FIXED',fixedMonthlyRate:200,selectedTruckCount:1,previousInvoiceAmount:600,loads:[]}});
 assert.equal(response.status,201,JSON.stringify(response.body));const second=response.body.invoice;assert.equal(second.netPayable,800);assert.equal(second.currentChargesUSD,200);assert.deepEqual(second.carryForward,balance.items);
 response=await call('clearInvoice',{params:{invoiceId:second.id},body:{...body,amountReceivedUSD:700,paymentRequestId:randomUUID()}});assert.equal(response.status,201,JSON.stringify(response.body));assert.deepEqual(response.body.settlement.paymentAllocations,[{invoiceId:first.id,amountUSD:600},{invoiceId:second.id,amountUSD:100}]);const sid2=response.body.settlement.id;assert.equal((await p.outstanding(tx,b.id,c.id)).totalUSD,100);assert.equal((await tx.invoice.findUnique({where:{id:first.id}})).isCleared,true);
 response=await call('deleteSettlement',{params:{id:sid2}});assert.equal(response.status,200,JSON.stringify(response.body));assert.equal((await p.outstanding(tx,b.id,c.id)).totalUSD,800);assert.equal((await tx.invoice.findUnique({where:{id:first.id}})).isCleared,false);
 console.log('PASS: database partial receipts, idempotent retry, carry allocation, settlement on actual cash, and reversal.');throw rollback;
 },{timeout:120000});}
main().catch(e=>{if(e!==rollback){console.error('Payment integration failed:',e.message);process.exitCode=1;}else console.log('All integration fixtures rolled back.');}).finally(()=>db.$disconnect());
