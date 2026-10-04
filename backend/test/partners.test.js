const test=require('node:test');
const assert=require('node:assert/strict');
const {preview}=require('../src/partners/template');
const {encrypt,decrypt,passport,hash}=require('../src/partners/security');
const {createPartnerRouter}=require('../src/routes/partnerAgreement.routes');
const express=require('express');
const input={companyName:'EASTWESTLOGISTICSLLC',managerName:'Synthetic Manager',silentName:'Synthetic Member',managerEmail:'manager@example.test',silentEmail:'silent@example.test',address:'Synthetic Address, Pennsylvania',effectiveDate:'2026-10-02',formationStatus:'PLANNED',formationDate:'2026-11-01',payoutDays:7,filingCosts:'MANAGER',contributions:'Manager: office funding. Silent member: formation and filing services.'};
const scan={mime:'application/pdf',base64:Buffer.from('%PDF-1.4\nSynthetic passport fixture, not an identity document.\n%%EOF').toString('base64')};
test('partner terms preserve the confirmed paid-invoice formula and dispatch-only membership',()=>{
 const p=preview(input);assert.equal(p.documentHash,hash(p.termsText));assert.match(p.termsText,/\$112\.50/);assert.match(p.termsText,/actual LLC members/);assert.match(p.termsText,/manager-managed/);assert.match(p.termsText,/does not create separate legal entities/);assert.match(p.termsText,/Office|office/);assert.match(p.termsText,/15 Pa.C.S. section 8850/);assert.notEqual(preview({...input,payoutDays:8}).documentHash,p.documentHash);
});
test('preview rejects ambiguous parties and incomplete commercial terms',()=>{
 for(const patch of [{silentName:input.managerName},{silentEmail:input.managerEmail},{payoutDays:0},{payoutDays:91},{filingCosts:''},{formationDate:'2026-02-30'},{contributions:''},{formationStatus:'FORMED',entityNumber:''}])assert.throws(()=>preview({...input,...patch}),e=>e.status===400);
});
test('encrypted identity data is authenticated and bound to the agreement and signer',()=>{
 process.env.PARTNER_AGREEMENT_KEY='synthetic-test-key-32-characters-only';
 const a=encrypt('private passport data','agreement:1:manager');assert.notEqual(a,encrypt('private passport data','agreement:1:manager'));assert.equal(decrypt(a,'agreement:1:manager').toString(),'private passport data');assert.throws(()=>decrypt(a,'agreement:1:silent'));const bytes=Buffer.from(a,'base64');bytes[29]^=1;assert.throws(()=>decrypt(bytes.toString('base64'),'agreement:1:manager'));
});
test('passport handling rejects disguised files, oversized uploads and malformed encodings',()=>{
 const body={passportNumber:'TEST123456',passportCountry:'Test Country',passportFile:scan};assert.equal(passport(body).number,'TEST123456');
 for(const patch of [{passportNumber:''},{passportCountry:''},{passportFile:{...scan,mime:'image/png'}},{passportFile:{mime:'image/svg+xml',base64:Buffer.from('<svg>unsafe</svg>').toString('base64')}},{passportFile:{...scan,base64:'!invalid'}},{passportFile:{...scan,base64:'A'.repeat(2800000)}}])assert.throws(()=>passport({...body,...patch}),e=>e.status===400);
});
test('private passport and staff routes require ADMIN; public API is no-store',async()=>{
 let privateCalls=0;const service={publicGet:async()=>({status:'PENDING'}),identity:async()=>{privateCalls++;return {number:'TEST123456',country:'Test Country',mime:scan.mime,base64:scan.base64};},list:async()=>[]};
 const app=express();app.use(createPartnerRouter(service,(req,res,next)=>{const role=req.headers.authorization;if(!role)return res.sendStatus(401);req.user={role,id:1};next();}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
 const pub=await fetch(base+'/public/'+'a'.repeat(64));assert.equal(pub.status,200);assert.equal(pub.headers.get('cache-control'),'no-store');assert.equal(pub.headers.get('referrer-policy'),'no-referrer');
 for(const role of [null,'MANAGER','EDITOR','VIEWER']){const r=await fetch(base+'/1/passport/manager?branchId=1',{headers:role?{Authorization:role}:{}});assert.equal(r.status,role?403:401);}assert.equal(privateCalls,0);
 const own=await fetch(base+'/1/passport/manager?branchId=1',{headers:{Authorization:'ADMIN'}});assert.equal(own.status,200);assert.match(own.headers.get('content-disposition'),/attachment/);assert.equal(own.headers.get('x-content-type-options'),'nosniff');assert.equal(await own.text(),Buffer.from(scan.base64,'base64').toString());
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
module.exports={input,scan};

test('identity uploads support driving licences and default older submissions to passport',()=>{
 const body={passportNumber:'DL12345678',passportCountry:'USA / Pennsylvania',passportFile:scan};
 assert.equal(passport(body).documentType,'PASSPORT');assert.equal(passport({...body,documentType:'DRIVING_LICENSE'}).documentType,'DRIVING_LICENSE');
 assert.throws(()=>passport({...body,documentType:'OTHER'}),e=>e.status===400);
 assert.match(preview(input).termsText,/either a passport or driving licence/);
});
test('old issued passport-only terms cannot silently accept a driving licence',async()=>{
 const {createPartnerService}=require('../src/partners/service');
 const service=createPartnerService({$queryRawUnsafe:async()=>[{id:1,termsText:'Template pa-dispatch-members-v1',settings:{managerName:'Synthetic Manager'},documentHash:'old-hash',status:'PENDING',signatures:{},role:'manager',isActive:true}]});
 const token='a'.repeat(64);assert.deepEqual((await service.publicGet(token)).allowedDocumentTypes,['PASSPORT']);
 await assert.rejects(service.respond(token,{documentType:'DRIVING_LICENSE',action:'sign',signedName:'Synthetic Manager',documentHash:'old-hash',consent:true,identityConsent:true,passportNumber:'DL12345678',passportCountry:'USA / Pennsylvania',passportFile:scan}),e=>e.status===400&&/requires a passport/.test(e.message));
});
