const {randomUUID}=require('node:crypto');
const {decrypt}=require('./secrets');
const {decodeSnapshot}=require('./provider');
const running={in:['QUEUED','RUNNING']};
async function finish(db,job,owner,result){return db.$transaction(async tx=>{
 await tx.$queryRawUnsafe('SELECT "id" FROM "SalesWorker" WHERE "id"=$1 FOR UPDATE','main');
 const worker=await tx.salesWorker.findUnique({where:{id:'main'}});if(worker.owner!==owner||worker.leaseUntil<new Date())return false;
 await tx.$queryRawUnsafe('SELECT "id" FROM "SalesJob" WHERE "id"=$1 FOR UPDATE',job.id);
 const current=await tx.salesJob.findUnique({where:{id:job.id},include:{branch:{select:{isActive:true}}}});
 if(!current||!['QUEUED','RUNNING'].includes(current.status)||current.nextMc!==job.nextMc)return false;
 if(!current.branch.isActive){await tx.salesJob.update({where:{id:job.id},data:{status:'PAUSED',lastError:'Branch is archived.'}});return false;}
 let outcome=result.outcome;
 if(outcome==='ACCEPTED'){
  const duplicate=await tx.salesLead.findUnique({where:{branchId_mc:{branchId:job.branchId,mc:job.nextMc}}});
  if(duplicate)outcome='DUPLICATE';
  else{
   const ordinal=Math.floor(current.accepted/1000)+1;
   const list=await tx.salesList.upsert({where:{jobId_ordinal:{jobId:job.id,ordinal}},create:{jobId:job.id,ordinal,startMc:job.nextMc,endMc:job.nextMc},update:{}});
   const d=result.details;
   await tx.salesLead.create({data:{branchId:job.branchId,listId:list.id,mc:job.nextMc,usdot:d.usdot,name:d.name,phone:d.phone||null,email:d.email||null,address:d.address,details:d}});
   await tx.salesList.update({where:{id:list.id},data:{count:{increment:1},endMc:job.nextMc}});
  }
 }else if(outcome==='REVIEW')await tx.salesReview.create({data:{jobId:job.id,mc:job.nextMc,reason:result.reason,details:result.details}});
 const field={ACCEPTED:'accepted',DUPLICATE:'duplicates',REVIEW:'needsReview',EXCLUDED:'excluded',MISSING:'missing'}[outcome];
 if(!field)throw new Error('Unknown carrier outcome');
 const reasons={...current.reasons};if(result.reason)reasons[result.reason]=(reasons[result.reason]||0)+1;
 const complete=job.nextMc===job.endMc;
 await tx.salesJob.update({where:{id:job.id},data:{[field]:{increment:1},processed:{increment:1},nextMc:job.nextMc+1,status:complete?'COMPLETED':'RUNNING',...(complete?{encryptedKey:null}:{}),retryCount:0,lastError:null,reasons,availableAt:new Date()}});
 return true;
},{timeout:15000});}
function retryDelay(header,now=Date.now()){if(!header)return 0;const seconds=Number(header);const ms=Number.isFinite(seconds)?seconds*1000:Date.parse(header)-now;return Number.isFinite(ms)?Math.max(2000,Math.min(ms,86400000)):0;}
async function tick(db,fetcher=fetch){
 const now=new Date(),owner=randomUUID();
 const claimed=await db.salesWorker.updateMany({where:{id:'main',AND:[{OR:[{leaseUntil:null},{leaseUntil:{lt:now}}]},{OR:[{nextRequestAt:null},{nextRequestAt:{lte:now}}]}]},data:{owner,leaseUntil:new Date(+now+90000),heartbeatAt:now,nextRequestAt:new Date(+now+2000)}});
 if(!claimed.count)return {state:'busy'};
 let job;let stage="loading job";
 try{
  job=await db.salesJob.findFirst({where:{status:running,availableAt:{lte:now}},orderBy:[{availableAt:'asc'},{id:'asc'}],include:{branch:{select:{isActive:true}}}});
  if(!job)return {state:'idle'};
  if(!job.branch.isActive){await db.salesJob.updateMany({where:{id:job.id,status:running},data:{status:'PAUSED',lastError:'Branch is archived.'}});return {state:'paused'};}
  const started=await db.salesJob.updateMany({where:{id:job.id,status:running,nextMc:job.nextMc},data:{status:'RUNNING',requests:{increment:1}}});if(!started.count)return {state:'paused'};
  let key;try{key=decrypt(job.encryptedKey);}catch{await db.salesJob.updateMany({where:{id:job.id,status:running},data:{status:'BLOCKED',lastError:'Please replace the API key and resume.'}});return {state:'blocked'};}
  stage='requesting provider';
  const response=await fetcher('https://saferwebapi.com/v2/mcmx/snapshot/'+job.nextMc,{headers:{'x-api-key':key,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(20000)});
  if(response.status===401||response.status===403){await db.salesJob.updateMany({where:{id:job.id,status:running},data:{status:'BLOCKED',lastError:'API key rejected. Replace your key, check your subscription, then resume.'}});return {state:'blocked'};}
  if(response.status===429){const delay=retryDelay(response.headers.get('retry-after'))||60000;await db.salesWorker.updateMany({where:{id:'main',owner},data:{nextRequestAt:new Date(Date.now()+delay)}});const error=new Error('Provider rate limit. Retrying after the required delay.');error.delay=delay;throw error;}
  stage="reading provider response";
  const result=await decodeSnapshot(response,job.nextMc);
  stage="saving carrier";
  await finish(db,job,owner,result);return {state:'processed'};
 }catch(error){
  const diagnostic=[error.code,error.cause?.code,error.name].filter(v=>typeof v==='string'&&/^[A-Za-z0-9_]{1,60}$/.test(v)).join('/');
  console.error('Sales worker failure',JSON.stringify({jobId:job?.id,mc:job?.nextMc,stage,diagnostic}));
  if(job){const message=error.delay?'Provider rate limit; waiting before retrying.':error.publicMessage||(error.name==='TimeoutError'?'Provider request timed out; retrying the same MC.':'Failed while '+stage+' ('+diagnostic+'); retrying the same MC.');const retries=job.retryCount+1;const delay=error.delay||Math.min(60000,2000*2**Math.min(retries,5));await db.salesJob.updateMany({where:{id:job.id,status:running,nextMc:job.nextMc},data:{retryCount:retries,status:retries>=5?'BLOCKED':'RUNNING',availableAt:new Date(Date.now()+delay),lastError:retries>=5?'Blocked after five attempts. '+message+' Resume to try again.':message}});}
  return {state:'retry'};
 }finally{await db.salesWorker.updateMany({where:{id:'main',owner},data:{owner:null,leaseUntil:null,heartbeatAt:new Date()}});}
}
module.exports={tick,finish,retryDelay};
