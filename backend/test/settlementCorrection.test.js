const test=require('node:test'),assert=require('node:assert/strict');
const {dispatcherCorrection,correctSettlement}=require('../src/utils/settlementCorrection');
const receipt={id:1,branchId:1,invoiceId:2,invoiceAmountUSD:995,usdRate:280,totalAmountPKR:278600,accountsAmountPKR:28000,accountsPartnerId:null,paymentAllocations:[{invoiceId:2,amountUSD:995,accountsFeeUSD:100,accountantsSplits:[{name:'Accountant',amountPKR:28000}]}],partnerSplits:[{partnerId:1,name:'A',percent:70},{partnerId:2,name:'B',percent:30}],updatedAt:new Date('2026-11-24T00:00:00Z')};
const body={dispatcherType:'PERCENTAGE',dispatcherValue:10,dispatcherSplits:[{dispatcherId:3,amount:25060}],paymentMethod:'Remitly',settlementDate:'2026-11-24',expectedUpdatedAt:receipt.updatedAt.toISOString(),reason:'Dispatcher omitted'};
test('995 receipt correction deducts dispatcher from revenue excluding accountant fees',()=>{
 const data=dispatcherCorrection(receipt,body,[{id:3,name:'Dispatcher'}]);
 assert.equal(data.dispatcherAmountPKR,25060);assert.equal(data.partnerProfitPKR,225540);assert.equal(data.partnerSplits[0].amountPKR,157878);
 for(const key of ['invoiceAmountUSD','paymentAllocations','accountsAmountPKR','usdRate','totalAmountPKR'])assert.equal(Object.hasOwn(data,key),false);
});
test('rejects excessive, invalid or duplicate dispatcher splits',()=>{
 const dispatchers=[{id:3,name:'D'}];
 assert.throws(()=>dispatcherCorrection(receipt,{...body,dispatcherValue:101},dispatchers));
 assert.throws(()=>dispatcherCorrection(receipt,{...body,dispatcherSplits:[{dispatcherId:99,amount:1}]},dispatchers));
 assert.throws(()=>dispatcherCorrection(receipt,{...body,dispatcherSplits:[{dispatcherId:3,amount:26000}]},dispatchers));
 assert.throws(()=>dispatcherCorrection(receipt,{...body,dispatcherSplits:[{dispatcherId:3,amount:1},{dispatcherId:3,amount:1}]},dispatchers));
});
test('correction archives original receipt and rejects stale edits before writing',async()=>{
 let archives=0,updates=0;
 const tx={invoiceSettlement:{findUnique:async()=>receipt,updateMany:async({data})=>{updates++;assert.equal(data.dispatcherAmountPKR,25060);return {count:1};}},branchDispatcher:{findMany:async()=>[{id:3,name:'D'}]},$executeRawUnsafe:async(sql,...args)=>{archives++;assert.equal(JSON.parse(args[5]).invoiceAmountUSD,995);}};
 const db={$transaction:async fn=>fn(tx)};
 await assert.rejects(()=>correctSettlement(db,1,{...body,expectedUpdatedAt:'old'},1),/changed/);assert.equal(archives,0);assert.equal(updates,0);
 await correctSettlement(db,1,body,1);assert.equal(archives,1);assert.equal(updates,1);
});
