const test=require('node:test'),assert=require('node:assert/strict');
const {receiptAmounts,distribution}=require('../src/utils/settlementAmounts');
const {fullCorrection}=require('../src/utils/fullSettlementCorrection');
const base={id:1,branchId:1,invoiceId:2,companyName:'Company',invoiceAmountUSD:995,usdRate:280,platformFeeUSD:0,totalAmountPKR:278600,accountsType:'PERCENTAGE',accountsValue:0,accountsAmountPKR:28000,accountsPartnerId:null,dispatcherType:'PERCENTAGE',dispatcherValue:0,dispatcherSplits:[],paymentAllocations:[{invoiceId:2,amountUSD:995,accountsFeeUSD:100,accountsFeeAllocations:[{invoiceId:2,amountUSD:100}],accountantsSplits:[{name:'Accountant',amountPKR:28000}]}],partnerSplits:[{partnerId:1,name:'A',percent:70},{partnerId:2,name:'B',percent:30}],updatedAt:new Date('2026-11-24T00:00:00Z')};
const body={companyName:'Company corrected',invoiceAmountUSD:995,usdRate:300,platformFeeUSD:5,accountsFeeReceivedUSD:100,dispatcherType:'PERCENTAGE',dispatcherValue:10,dispatcherSplits:[{dispatcherId:3,amount:26700}],accountsType:'ABSOLUTE',accountsValue:0,accountsPartnerId:null,accountantsSplits:[{name:'Accountant',amountPKR:28000}],partners:[{id:1,percent:70},{id:2,percent:30}],paymentMethod:'Remitly',settlementDate:'2026-11-24',expectedUpdatedAt:base.updatedAt.toISOString(),reason:'Correct rate and platform fee',notes:'Updated'};
function fixture({missingAudit=false,conflict=false,later=false,manual=false}={}){
 let settlement=structuredClone(base),invoices=[{id:2,branchId:1,companyId:1,createdAt:'2026-11-01',carryForward:[],currentChargesUSD:1200,netPayable:1200,paidAmountUSD:995,accountsFeeTotal:100,isCleared:false}],archives=[];
 if(manual){settlement.invoiceId=null;settlement.paymentAllocations=null;settlement.accountsAmountPKR=0;}
 if(later)invoices.push({...invoices[0],id:3,createdAt:'2026-11-02',paidAmountUSD:0,accountsFeeTotal:0});
 const tx={invoiceSettlement:{findUnique:async()=>structuredClone(settlement),findMany:async()=>[],updateMany:async({data})=>{if(conflict)return {count:0};Object.assign(settlement,structuredClone(data));return {count:1};}},invoice:{findUnique:async({where})=>structuredClone(invoices.find(r=>r.id===where.id)),findMany:async()=>structuredClone(invoices),update:async({where,data})=>{const row=invoices.find(r=>r.id===where.id);if(data.paidAmountUSD?.decrement!==undefined)row.paidAmountUSD-=data.paidAmountUSD.decrement;else if(data.paidAmountUSD?.increment!==undefined)row.paidAmountUSD+=data.paidAmountUSD.increment;else Object.assign(row,data);}},branch:{findUnique:async()=>({isActive:true,partners:[{id:1,name:'A',percent:50},{id:2,name:'B',percent:50}],dispatchers:[{id:3,name:'D'}]})},$executeRawUnsafe:async(sql,...args)=>{if(sql.startsWith('INSERT')){if(missingAudit)throw Error('Audit unavailable');archives.push(JSON.parse(args[5]));}}};
 return {db:{$transaction:async fn=>{const old=structuredClone({settlement,invoices,archives});try{return await fn(tx);}catch(e){settlement=old.settlement;invoices=old.invoices;archives=old.archives;throw e;}}},state:()=>({settlement,invoices,archives})};
}
test('platform fee reduces cash, accountant fee remains separate, percentages use net revenue',()=>{
 const amounts=receiptAmounts(995,300,5,100);assert.equal(amounts.totalAmountPKR,297000);assert.equal(amounts.accountantPKR,30000);assert.equal(amounts.revenuePKR,267000);
 const result=distribution(body,amounts,[{id:1,name:'A',percent:70},{id:2,name:'B',percent:30}],[{id:3,name:'D'}]);assert.equal(result.data.dispatcherAmountPKR,26700);assert.equal(result.data.partnerProfitPKR,240300);
 assert.throws(()=>receiptAmounts(995,300,900,100),/exceed/);assert.throws(()=>receiptAmounts(995,0,5,100));assert.throws(()=>receiptAmounts(995,300,-1,100));assert.throws(()=>receiptAmounts(995,300,0.001,100));
});
test('full edit changes rate, fees, notes and payouts but keeps 995 invoice credit',async()=>{
 const f=fixture();await fullCorrection(f.db,1,body,7);const s=f.state();assert.equal(s.invoices[0].paidAmountUSD,995);assert.equal(s.settlement.invoiceAmountUSD,995);assert.equal(s.settlement.totalAmountPKR,297000);assert.equal(s.settlement.accountsAmountPKR,30000);assert.equal(s.settlement.partnerSplits[0].percent,70);assert.equal(s.settlement.notes,'Updated');assert.equal(s.archives[0].usdRate,280);assert.equal(s.settlement.paymentAllocations[0].accountsFeeAllocations[0].amountUSD,100);
});
test('amount correction replaces invoice allocations once without duplicate receipt',async()=>{
 const f=fixture();await fullCorrection(f.db,1,{...body,invoiceAmountUSD:900,dispatcherSplits:[]},7);assert.equal(f.state().invoices[0].paidAmountUSD,900);assert.equal(f.state().settlement.paymentAllocations[0].amountUSD,900);assert.equal(f.state().settlement.id,1);
});
test('overpayment, stale edit, invalid splits and audit failure roll back balances and receipt',async()=>{
 for(const [options,change] of [[{}, {invoiceAmountUSD:1300}],[{}, {expectedUpdatedAt:'old'}],[{}, {dispatcherSplits:[{dispatcherId:99,amount:1}]}],[{missingAudit:true},{invoiceAmountUSD:900,dispatcherSplits:[]}],[{conflict:true},{invoiceAmountUSD:900,dispatcherSplits:[]}],[{}, {partners:[{id:1,percent:20}]}]]){
 const f=fixture(options);await assert.rejects(()=>fullCorrection(f.db,1,{...body,...change},7));assert.equal(f.state().invoices[0].paidAmountUSD,995);assert.equal(f.state().settlement.usdRate,280);assert.equal(f.state().archives.length,0);
 }
});
test('older invoices support rate/share corrections but block ledger changes after carry forward',async()=>{
 const f=fixture({later:true});await fullCorrection(f.db,1,body,7);assert.equal(f.state().settlement.usdRate,300);
 const other=fixture({later:true});await assert.rejects(()=>fullCorrection(other.db,1,{...body,invoiceAmountUSD:900},7),/latest/);assert.equal(other.state().invoices[0].paidAmountUSD,995);
});
test('accountant allocations must fit the newly converted accountant balance',async()=>{
 const f=fixture();await assert.rejects(()=>fullCorrection(f.db,1,{...body,usdRate:200,dispatcherSplits:[]},7),/Accountants/);assert.equal(f.state().settlement.usdRate,280);
});

test('manual PKR settlements remain editable without inventing USD receipts',async()=>{
 const f=fixture({manual:true});await fullCorrection(f.db,1,{...body,receiptCurrency:'PKR',invoiceAmountUSD:0,usdRate:0,platformFeeUSD:0,accountsFeeReceivedUSD:0,accountantsSplits:[],totalAmountPKR:100000,dispatcherSplits:[],dispatcherValue:20},7);
 const result=f.state().settlement;assert.equal(result.totalAmountPKR,100000);assert.equal(result.invoiceAmountUSD,0);assert.equal(result.dispatcherAmountPKR,20000);assert.equal(result.partnerProfitPKR,80000);assert.equal(result.paymentAllocations,null);
});
test('manual USD settlements apply platform fees once and permit rate corrections',async()=>{
 const f=fixture({manual:true});await fullCorrection(f.db,1,{...body,accountsFeeReceivedUSD:0,accountantsSplits:[],dispatcherSplits:[]},7);
 assert.equal(f.state().settlement.totalAmountPKR,297000);assert.equal(f.state().settlement.dispatcherAmountPKR,29700);assert.equal(f.state().settlement.paymentAllocations,null);
});
