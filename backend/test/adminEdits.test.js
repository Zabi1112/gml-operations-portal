const test=require('node:test'),assert=require('node:assert/strict');
const {fleetUpdate}=require('../src/utils/fleetUpdates');
const {salaryData,reportData,editDocument}=require('../src/utils/documentEdits');
const {reopenInvoice}=require('../src/utils/invoiceCorrection');
test('driver can clear truck assignment; cross-company trucks and cross-branch moves are rejected',async()=>{
 const db={company:{findFirst:async({where})=>where.id===2?{id:2}:null},truck:{findFirst:async({where})=>where.id===3&&where.companyId===2?{id:3}:null}};
 const current={id:1,branchId:1,companyId:2,truckId:3,name:'Old'};
 assert.equal((await fleetUpdate(db,'driver',current,{name:'Updated',truckId:null})).truckId,null);
 assert.equal((await fleetUpdate(db,'driver',current,{name:'Updated'})).truckId,3);
 await assert.rejects(()=>fleetUpdate(db,'driver',current,{truckId:99}),/Truck must/);
 await assert.rejects(()=>fleetUpdate(db,'driver',current,{branchId:2}),/between branches/);
});
test('moving a truck requires unlinking its existing drivers',async()=>{
 const db={company:{findFirst:async()=>({id:2})},driver:{count:async()=>1}};
 await assert.rejects(()=>fleetUpdate(db,'truck',{id:1,companyId:1,branchId:1,truckNumber:'T1'},{companyId:2}),/Unassign/);
});
test('saved report correction recomputes totals and counts distinct reason dates',()=>{
 const data=reportData({title:'Corrected',from:'2026-11-01',to:'2026-11-07',loads:[{pickupDate:'2026-11-02',pickup:'A',dropoff:'B',miles:100,grossAmount:500}],reasons:[{reasonDate:'2026-11-03',reasonType:'No dispatch'},{reasonDate:'2026-11-03',reasonType:'Repair'}],totalGross:9999},{branchId:1,companyId:2,truckId:3,reportData:{}});
 assert.equal(data.totalGross,500);assert.equal(data.avgRatePerMile,5);assert.equal(data.reasonDays,1);
 assert.throws(()=>reportData({from:'2026-02-30',to:'2026-11-07',title:'Bad',loads:[],reasons:[]},{reportData:{}}),/date/);
});
function correctionFixture(failArchive=false){
 let rows=[{id:1,branchId:1,companyId:1,createdAt:'2026-11-01',currentChargesUSD:500,netPayable:500,paidAmountUSD:500,carryForward:[],isCleared:true},{id:2,branchId:1,companyId:1,createdAt:'2026-11-02',currentChargesUSD:100,netPayable:600,paidAmountUSD:100,carryForward:[{invoiceId:1,amountUSD:500}],isCleared:true,loads:[]}];
 let receipts=[{id:3,invoiceId:2,invoiceAmountUSD:600,paymentAllocations:[{invoiceId:1,amountUSD:500},{invoiceId:2,amountUSD:100}]}],archives=[];
 const tx={invoice:{findUnique:async({where})=>structuredClone(rows.find(r=>r.id===where.id)),findMany:async()=>structuredClone(rows),update:async({where,data})=>{const row=rows.find(r=>r.id===where.id);if(data.paidAmountUSD?.decrement!==undefined)row.paidAmountUSD-=data.paidAmountUSD.decrement;else Object.assign(row,data);return row;}},invoiceSettlement:{findMany:async({where})=>structuredClone(receipts.filter(r=>r.invoiceId===where.invoiceId)),delete:async({where})=>{receipts=receipts.filter(r=>r.id!==where.id);}},$executeRawUnsafe:async(sql,...args)=>{if(sql.startsWith('INSERT')){if(failArchive)throw Error('missing migration');archives.push(JSON.parse(args[5]));}}};
 const db={$transaction:async fn=>{const old=structuredClone({rows,receipts,archives});try{return await fn(tx);}catch(e){rows=old.rows;receipts=old.receipts;archives=old.archives;throw e;}}};
 return {db,state:()=>({rows,receipts,archives})};
}
test('paid invoice correction archives exact receipts and reverses all source allocations atomically',async()=>{
 const f=correctionFixture();await reopenInvoice(f.db,2,'Wrong amounts',7);const {rows,receipts,archives}=f.state();
 assert.equal(receipts.length,0);assert.equal(archives[0].settlements[0].invoiceAmountUSD,600);assert.equal(archives[0].invoice.paidAmountUSD,100);
 assert.ok(rows.every(r=>r.paidAmountUSD===0&&!r.isCleared));
});
test('correction does not alter balances when archival fails or invoice is not latest',async()=>{
 const f=correctionFixture(true);await assert.rejects(()=>reopenInvoice(f.db,2,'Reason',7));assert.equal(f.state().receipts.length,1);assert.equal(f.state().rows[0].paidAmountUSD,500);
 const other=correctionFixture();await assert.rejects(()=>reopenInvoice(other.db,1,'Reason',7),/latest/);assert.equal(other.state().archives.length,0);
});
test('invalid correction reason leaves receipts intact',async()=>{const f=correctionFixture();await assert.rejects(()=>reopenInvoice(f.db,2,'',7),/reason/);assert.equal(f.state().receipts.length,1);});

test('document correction rejects stale edits before archiving and recalculates saved values',async()=>{
 const original={id:1,branchId:1,updatedAt:new Date('2026-11-15T00:00:00Z'),totalGross:10};
 let archiveCount=0, updates=0;
 const model={findUnique:async()=>original,updateMany:async({data})=>{updates++;assert.equal(data.totalGross,20);return {count:1};}};
 const tx={loadReport:model,$executeRawUnsafe:async()=>{archiveCount++;}};
 const handler=editDocument({$transaction:async fn=>fn(tx)},'loadReport','LoadReport',()=>({totalGross:20}));
 const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
 let res=response();await handler({params:{id:1},body:{expectedUpdatedAt:'old',reason:'Correction'},user:{id:7}},res);
 assert.equal(res.code,409);assert.equal(archiveCount,0);assert.equal(updates,0);
 res=response();await handler({params:{id:1},body:{expectedUpdatedAt:original.updatedAt.toISOString(),reason:'Correction'},user:{id:7}},res);
 assert.equal(res.code,200);assert.equal(archiveCount,1);assert.equal(updates,1);
});
test('salary correction ignores supplied totals and rejects invalid percentages and boolean amounts',()=>{
 const body={employeeId:1,employeeName:'A',salaryType:'FIXED',periodStart:'2026-11-01',periodEnd:'2026-11-07',fixedSalaryPKR:100,netSalaryPKR:999};
 const calculate=data=>({netSalaryPKR:data.fixedSalaryPKR});
 assert.equal(salaryData(body,calculate).netSalaryPKR,100);
 assert.throws(()=>salaryData({...body,commissionPercent:101},calculate),/100/);
 assert.throws(()=>salaryData({...body,fixedSalaryPKR:true},calculate),/Invalid/);
});
