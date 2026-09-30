// Synthetic integration test. Every inserted record is rolled back.
const path=require('node:path'),assert=require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
const {createSalesService}=require('../src/sales/service'),{tick}=require('../src/sales/worker');
const marker=new Error('ROLLBACK_SYNTHETIC_SALES_TEST');
async function main(){
 if(await db.salesJob.count({where:{status:{in:['QUEUED','RUNNING']}}}))throw new Error('Pause real jobs before running this integration test.');
 try{await db.$transaction(async tx=>{
 const adapter=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(adapter):target[key]});
 const service=createSalesService(adapter),branch=await tx.branch.create({data:{branchName:'Synthetic Sales integration',isActive:true}}),user={id:999999,name:'Synthetic Tester',role:'ADMIN'};
 const job=await service.create({branchId:branch.id,startMc:100,endMc:102,apiKey:'synthetic-api-key'},user);
 assert.equal(job.encryptedKey,undefined);assert.equal(job.hasKey,true);
 const fixture=mc=>({entity_type:'CARRIER',legal_name:'Synthetic Freight',physical_address:'1 Test St Dallas, TX 75001',operating_status:'AUTHORIZED FOR Property',mc_mx_ff_numbers:'MC-'+mc,usdot:'999999',power_units:2,cargo_carried:['General Freight']});
 const run=async fn=>{await tx.salesWorker.update({where:{id:'main'},data:{nextRequestAt:null,leaseUntil:null,owner:null}});return tick(adapter,fn);};
 await run(async url=>new Response(JSON.stringify(fixture(Number(url.split('/').pop())))));
 let saved=await tx.salesJob.findUnique({where:{id:job.id}});assert.equal(saved.nextMc,101);assert.equal(saved.accepted,1);
 await service.control(job.id,branch.id,'pause');let called=false;await run(async()=>{called=true;});assert.equal(called,false);
 await service.control(job.id,branch.id,'resume');await run(async()=>new Response('',{status:429,headers:{'retry-after':'30'}}));saved=await tx.salesJob.findUnique({where:{id:job.id}});assert.equal(saved.nextMc,101);assert.equal(saved.retryCount,1);
 await tx.salesJob.update({where:{id:job.id},data:{availableAt:new Date(0)}});await run(async()=>new Response('',{status:401}));assert.equal((await tx.salesJob.findUnique({where:{id:job.id}})).status,'BLOCKED');
 await service.control(job.id,branch.id,'resume');await run(async()=>new Response('',{status:404}));
 await run(async()=>new Response(JSON.stringify({...fixture(102),cargo_carried:['General Freight','Garbage/Refuse']})));
 saved=await tx.salesJob.findUnique({where:{id:job.id}});assert.equal(saved.status,'COMPLETED');assert.equal(saved.encryptedKey,null);assert.equal(saved.missing,1);assert.equal(saved.excluded,1);
 const lead=await tx.salesLead.findFirst({where:{branchId:branch.id}}),requestId=require('node:crypto').randomUUID();
 await service.contact(lead.id,branch.id,user,requestId);await service.contact(lead.id,branch.id,user,requestId);assert.equal((await service.detail(lead.id,branch.id)).contactCount,1);
 await service.contact(lead.id,branch.id,user,requestId,true);await service.contact(lead.id,branch.id,user,requestId,true);assert.equal((await service.detail(lead.id,branch.id)).contactCount,0);
 await assert.rejects(()=>service.detail(lead.id,branch.id+1000),e=>e.status===404);
 const current=await service.detail(lead.id,branch.id);await service.update(lead.id,branch.id,{status:'INTERESTED',notes:'Synthetic note',revision:current.revision});await assert.rejects(()=>service.update(lead.id,branch.id,{status:'NEW',notes:'stale',revision:current.revision}),e=>e.status===409);
 const second=await service.create({branchId:branch.id,startMc:100,endMc:100,apiKey:'synthetic-api-key'},user);await run(async()=>new Response(JSON.stringify(fixture(100))));assert.equal((await tx.salesJob.findUnique({where:{id:second.id}})).duplicates,1);
 const boundary=await service.create({branchId:branch.id,startMc:1000,endMc:2000,apiKey:'synthetic-api-key'},user);
 const list=await tx.salesList.create({data:{jobId:boundary.id,ordinal:1,startMc:1000,endMc:1998,count:999}});
 const d=require('../src/sales/carriers').classifyCarrier(fixture(1000),1000).details;
 await tx.salesLead.createMany({data:Array.from({length:999},(_,i)=>({branchId:branch.id,listId:list.id,mc:1000+i,usdot:d.usdot,name:d.name,address:d.address,details:{...d,mc:1000+i}}))});
 await tx.salesJob.update({where:{id:boundary.id},data:{accepted:999,processed:999,nextMc:1999}});
 await run(async()=>new Response(JSON.stringify(fixture(1999))));await run(async()=>new Response(JSON.stringify(fixture(2000))));
 const lists=await tx.salesList.findMany({where:{jobId:boundary.id},orderBy:{ordinal:'asc'}});assert.deepEqual(lists.map(l=>l.count),[1000,1]);assert.equal(lists[0].endMc,1999);assert.equal(lists[1].startMc,2000);
 assert.equal((await service.export(list.id,branch.id)).csv.split('\r\n').length,1001);
 await tx.branch.update({where:{id:branch.id},data:{isActive:false}});await assert.rejects(()=>service.create({branchId:branch.id,startMc:1,endMc:2,apiKey:'synthetic-api-key'},user),e=>e.status===409);
 console.log('PASS: fetch checkpoint, pause/resume, rate limit, invalid key, missing/excluded records, completion/key removal, duplicate MC, contact idempotency/undo, branch isolation, revision conflicts, 1000-row rollover, CSV and archive guard.');
 throw marker;
 },{timeout:180000});}catch(e){if(e!==marker)throw e;}
 console.log('Synthetic test data rolled back.');
}
main().catch(e=>{console.error('Sales integration failed:',e.code||e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
