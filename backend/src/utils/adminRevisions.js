const {randomUUID}=require('node:crypto');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
async function archiveRevision(db,{branchId,entityType,entityId,reason,snapshot,userId}){
 if(typeof reason!=='string'||!reason.trim()||reason.trim().length>1000)fail(400,'Enter a correction reason (up to 1000 characters).');
 const revisionId=randomUUID();
 await db.$executeRawUnsafe('INSERT INTO "AdminRevision" ("id","branchId","entityType","entityId","reason","snapshot","createdBy") VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)',revisionId,branchId,entityType,entityId,reason.trim(),JSON.stringify(snapshot),userId);
 return revisionId;
}
async function revisions(db,entityType,entityId){return db.$queryRawUnsafe('SELECT "id","reason","snapshot","createdAt","createdBy" FROM "AdminRevision" WHERE "entityType"=$1 AND "entityId"=$2 ORDER BY "createdAt" DESC',entityType,Number(entityId));}
module.exports={archiveRevision,revisions,fail};
