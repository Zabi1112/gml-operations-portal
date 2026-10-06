const {randomUUID}=require('node:crypto');
const {decrypt}=require('./secrets');
const {safeProviderError,phone}=require('./common');
function classifySend(response,body){
 if(response.ok&&typeof body?.data?.id==='string'&&body.data.id.length<200)return {status:'ACCEPTED',providerId:body.data.id,providerStatus:typeof body.data.status==='string'?body.data.status.slice(0,50):'accepted',reason:null};
 if(response.status===429)return {status:'READY',rateLimited:true,reason:'Quo rate limit; waiting before retrying.'};
 if([401,402,403].includes(response.status)||body?.code==='0206400')return {status:'READY',pause:true,reason:safeProviderError(response.status,body)};
 if(response.status>=400&&response.status<500&&response.status!==408)return {status:'FAILED',reason:safeProviderError(response.status,body)};
 return {status:'UNKNOWN',pause:true,reason:'Submission outcome is uncertain. Check Quo before sending to this recipient again; it will not be automatically resent.'};
}
function retryAfter(value,now=Date.now()){if(value===null||value===undefined||value==='')return 60000;const n=Number(value),delay=Number.isFinite(n)?n*1000:Date.parse(value)-now;return Number.isFinite(delay)?Math.max(10000,Math.min(delay,86400000)):60000;}
async function tickQuo(db,fetcher=fetch){
 const owner=randomUUID();const claimed=await db.$queryRawUnsafe('UPDATE "QuoWorker" SET owner=$1,"leaseUntil"=now()+interval \'90 seconds\',"nextRequestAt"=now()+interval \'10 seconds\',"heartbeatAt"=now() WHERE id=\'main\' AND ("leaseUntil" IS NULL OR "leaseUntil"<now()) AND ("nextRequestAt" IS NULL OR "nextRequestAt"<=now()) RETURNING id',owner);if(!claimed.length)return {state:'busy'};
 let recipient;
 try{
  // A crashed request may have reached Quo. Never blindly retry its recipient.
  await db.$executeRawUnsafe(`WITH stale AS (UPDATE "QuoRecipient" SET status='UNKNOWN',reason='Previous send was interrupted. Verify in Quo; this recipient will not be automatically resent.',"updatedAt"=now() WHERE status='SENDING' AND "startedAt"<now()-interval '90 seconds' RETURNING "campaignId") UPDATE "QuoCampaign" SET status='PAUSED',"lastError"='An interrupted send needs review in Quo.',"updatedAt"=now() WHERE id IN (SELECT "campaignId" FROM stale) AND status='RUNNING'`);
  await db.$executeRawUnsafe(`UPDATE "QuoCampaign" c SET status='PAUSED',"lastError"='Branch is archived.',"updatedAt"=now() WHERE status='RUNNING' AND NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b.id=c."branchId" AND b."isActive")`);
  await db.$executeRawUnsafe(`UPDATE "QuoCampaign" c SET status='COMPLETED',"updatedAt"=now() WHERE status='RUNNING' AND NOT EXISTS (SELECT 1 FROM "QuoRecipient" r WHERE r."campaignId"=c.id AND r.status IN ('READY','SENDING'))`);
  const rows=await db.$queryRawUnsafe(`WITH candidate AS (SELECT r.id FROM "QuoRecipient" r JOIN "QuoCampaign" c ON c.id=r."campaignId" JOIN "Branch" b ON b.id=c."branchId" WHERE r.status='READY' AND c.status='RUNNING' AND b."isActive" ORDER BY c."updatedAt",r.id LIMIT 1 FOR UPDATE OF r,c SKIP LOCKED), claimed AS (UPDATE "QuoRecipient" r SET status='SENDING',owner=$1,"startedAt"=now(),"updatedAt"=now() FROM candidate x WHERE r.id=x.id RETURNING r.*) SELECT r.*,c.sender,c."phoneNumberId",c."encryptedKey",c."branchId" FROM claimed r JOIN "QuoCampaign" c ON c.id=r."campaignId"`,owner);
  recipient=rows[0];if(!recipient)return {state:'idle'};
  const save=async result=>{const applied=await db.$queryRawUnsafe(`WITH saved AS (UPDATE "QuoRecipient" SET status=$3,reason=$4,"providerId"=$5,"providerStatus"=$6,"updatedAt"=now() WHERE id=$1 AND owner=$2 AND status='SENDING' RETURNING "campaignId") UPDATE "QuoCampaign" c SET status=CASE WHEN $7::boolean AND c.status='RUNNING' THEN 'PAUSED' ELSE c.status END,"lastError"=CASE WHEN $7::boolean THEN $4 ELSE c."lastError" END,"updatedAt"=now() FROM saved WHERE c.id=saved."campaignId" RETURNING c.id`,recipient.id,owner,result.status,result.reason||null,result.providerId||null,result.providerStatus||null,!!result.pause);return applied.length;};
  // Recheck current opt-out/phone state after the frozen review and immediately before submission.
  const lead=await db.salesLead.findFirst({where:{id:recipient.leadId,branchId:recipient.branchId},select:{phone:true,status:true}});
  const blocked=await db.salesLead.findMany({where:{branchId:recipient.branchId,status:'NOT_INTERESTED'},select:{phone:true}});
  if(!lead||lead.status==='NOT_INTERESTED'||phone(lead.phone)!==recipient.phone||blocked.some(l=>phone(l.phone)===recipient.phone)){await save({status:'SKIPPED',reason:'Lead removed, marked Not interested, or phone changed after review.'});return {state:'skipped'};}
  let key;try{key=decrypt(recipient.encryptedKey);}catch{await save({status:'READY',pause:true,reason:'Unable to read the Quo key. Save the connection again and resume.'});return {state:'paused'};}
  let result;
  try{
   const r=await fetcher('https://api.quo.com/v1/messages',{method:'POST',headers:{Authorization:key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({content:recipient.content,from:recipient.sender,to:[recipient.phone]}),redirect:'error',signal:AbortSignal.timeout(20000)});
   let body;try{body=await r.json();}catch{body=null;}result=classifySend(r,body);
   if(result.rateLimited)await db.$executeRawUnsafe('UPDATE "QuoWorker" SET "nextRequestAt"=now()+($2::integer*interval \'1 millisecond\') WHERE id=\'main\' AND owner=$1',owner,retryAfter(r.headers.get('retry-after')));
  }catch{result={status:'UNKNOWN',pause:true,reason:'Network interruption: Quo may have received this SMS. Check Quo; this recipient will not be automatically resent.'};}
  await save(result);return {state:result.status.toLowerCase()};
 }finally{await db.$executeRawUnsafe('UPDATE "QuoWorker" SET owner=NULL,"leaseUntil"=NULL,"heartbeatAt"=now() WHERE id=\'main\' AND owner=$1',owner);}
}
module.exports={tickQuo,classifySend,retryAfter};
