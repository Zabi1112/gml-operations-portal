const {randomUUID}=require('node:crypto');
const {decrypt}=require('./secrets');
const {decodeSnapshot}=require('./provider');
const running={in:['QUEUED','RUNNING']};
// A single database statement avoids interactive-transaction failures in serverless execution.
async function finish(db,job,owner,result){
 const [row]=await db.$queryRawUnsafe('SELECT public.ewl_sales_finish($1::integer,$2::integer,$3::text,$4::jsonb) AS saved',job.id,job.nextMc,owner,JSON.stringify(result));
 return row.saved;
}
function retryDelay(header,now=Date.now()){if(!header)return 0;const seconds=Number(header);const ms=Number.isFinite(seconds)?seconds*1000:Date.parse(header)-now;return Number.isFinite(ms)?Math.max(2000,Math.min(ms,86400000)):0;}
function retryPlan(error,stage,previousRetries,now=Date.now()){
 const retries=Math.min(1000000,previousRetries+1);
 const transient=!!error.delay||error.retryable||(['requesting provider','reading provider response'].includes(stage)&&['TimeoutError','AbortError','TypeError'].includes(error.name))||['P2028','P2024','P1001','P1002'].includes(error.code);
 const delay=error.delay||Math.min(900000,2000*2**Math.min(retries,10));
 return {retries,delay,availableAt:new Date(now+delay),quarantine:!!error.quarantine&&retries>=3,blocked:!transient&&!error.quarantine&&retries>=5};
}
function failedSnapshot(mc){return {outcome:'REVIEW',reason:'Provider could not parse snapshot after repeated attempts',details:{mc,usdot:'',name:'MC-'+mc+' - snapshot unavailable',dba:'',address:'',mailingAddress:'',phone:'',email:'',powerUnits:null,drivers:null,operatingStatus:'Unverified',cargo:[],classifications:[],carrierOperation:[],safetyRating:'',sourceUrl:'',sourceUpdatedAt:'',equipment:'Unknown - snapshot unavailable',lookupError:{status:400,category:'SNAPSHOT_PARSE_ERROR'}}};}
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
  const saved=await finish(db,job,owner,result);return {state:saved?'processed':'unchanged'};
 }catch(error){
  const diagnostic=[error.code,error.cause?.code,error.name].filter(v=>typeof v==='string'&&/^[A-Za-z0-9_]{1,60}$/.test(v)).join('/');
  console.error('Sales worker failure',JSON.stringify({jobId:job?.id,mc:job?.nextMc,stage,diagnostic}));
  if(job){
   const plan=retryPlan(error,stage,job.retryCount);
   if(plan.quarantine){
    // Preserve this MC in review rather than treating an unreadable snapshot as a non-carrier.
    // The atomic completion fences the owner and updates review counts/checkpoint together.
    const saved=await finish(db,job,owner,failedSnapshot(job.nextMc));
    return {state:saved?'review':'unchanged'};
   }
   const message=error.delay?'Provider rate limit; waiting before retrying.':error.publicMessage||(error.name==='TimeoutError'||error.name==='AbortError'?'Provider request timed out; retrying the same MC.':'Failed while '+stage+' ('+diagnostic+'); retrying the same MC.');
   const status=plan.blocked?'BLOCKED':'RUNNING';
   const lastError=plan.blocked?'Blocked after five attempts. '+message+' Resume to try again.':message+' Automatic retry at '+plan.availableAt.toISOString()+'.';
   await db.salesJob.updateMany({where:{id:job.id,status:running,nextMc:job.nextMc},data:{retryCount:plan.retries,status,availableAt:plan.availableAt,lastError}});
  }
  return {state:'retry'};
 }finally{await db.salesWorker.updateMany({where:{id:'main',owner},data:{owner:null,leaseUntil:null,heartbeatAt:new Date()}});}
}
module.exports={tick,finish,retryDelay,retryPlan,failedSnapshot};
