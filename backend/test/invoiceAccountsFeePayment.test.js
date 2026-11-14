const test=require('node:test');const assert=require('node:assert/strict');
const invoice={id:1,branchId:1,companyId:1,currentChargesUSD:1000,netPayable:1000,accountsFeeTotal:260,paidAmountUSD:0,carryForward:[],isCleared:false};
let saved=null;
const tx={
 $executeRawUnsafe:async()=>{},
 invoice:{findUnique:async()=>({...invoice}),findMany:async()=>[{...invoice}],update:async({data})=>{if(data.paidAmountUSD)invoice.paidAmountUSD+=(data.paidAmountUSD.increment||0)-(data.paidAmountUSD.decrement||0);else Object.assign(invoice,data);return {...invoice}}},
 branch:{findUnique:async()=>({id:1,partners:[{id:1,name:'Partner',percent:100}],dispatchers:[]})},
 invoiceSettlement:{findMany:async()=>saved?[saved]:[],findUnique:async()=>saved,create:async({data})=>(saved={...data,id:10}),delete:async()=>{saved=null}}
};
const prismaPath=require.resolve('../src/utils/prisma');require.cache[prismaPath]={id:prismaPath,filename:prismaPath,loaded:true,exports:{...tx,$transaction:async fn=>fn(tx)}};
const controller=require('../src/controllers/finance.controller');
const res=()=>({code:200,status(n){this.code=n;return this},json(data){this.body=data;return this}});
test('payment endpoint excludes invoice fee before allocations, is idempotent, and reverses both balances',async()=>{
 const req={params:{invoiceId:1},user:{name:'Admin'},body:{paymentRequestId:'11111111-1111-1111-1111-111111111111',amountReceivedUSD:500,accountsFeeReceivedUSD:100,usdRate:280,dispatcherType:'PERCENTAGE',dispatcherValue:25,accountsType:'PERCENTAGE',accountsValue:10,accountsPartnerId:1,paymentMethod:'Wire Transfer',settlementDate:'2026-11-14'}};
 const response=res();await controller.clearInvoice(req,response);assert.equal(response.code,201);
 assert.equal(saved.totalAmountPKR,140000);assert.equal(saved.dispatcherAmountPKR,28000);
 assert.equal(saved.accountsAmountPKR,39200);assert.equal(saved.partnerProfitPKR,72800);
 assert.equal(saved.partnerSplits[0].accountsDeductionPKR,11200);
 assert.equal(saved.partnerSplits[0].amountPKR,72800);assert.equal(invoice.paidAmountUSD,500);
 await controller.clearInvoice(req,res());assert.equal(invoice.paidAmountUSD,500);
 const reversed=res();await controller.deleteSettlement({params:{id:10}},reversed);
 assert.equal(reversed.code,200);assert.equal(invoice.paidAmountUSD,0);assert.equal(saved,null);
 req.body.amountReceivedUSD=1000;req.body.accountsFeeReceivedUSD=0;
 req.body.accountantsSplits=[{name:'Ali',amountPKR:60000},{name:'Sara',amountPKR:12800}];
 const full=res();await controller.clearInvoice(req,full);assert.equal(full.code,201);
 assert.equal(saved.paymentAllocations[0].accountsFeeUSD,260);assert.equal(invoice.isCleared,true);
 assert.equal(saved.accountsAmountPKR,93520);assert.equal(saved.partnerProfitPKR,134680);
 assert.equal(saved.partnerSplits[0].amountPKR,134680);
 assert.equal(saved.partnerSplits[0].accountsFeeReceivedPKR,undefined);
 assert.deepEqual(saved.paymentAllocations[0].accountantsSplits,req.body.accountantsSplits);
 const undone=res();await controller.deleteSettlement({params:{id:10}},undone);
 assert.equal(undone.code,200);assert.equal(invoice.paidAmountUSD,0);assert.equal(saved,null);
});
