
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { bank, counts, selectQuestions, rubric } = require("../src/utils/interviewBank");
const { validateSubmission, validateReview, publicView } = require("../src/utils/interviews");
const { createInterviewRouter } = require("../src/routes/interview.routes");
test("bank contains 100 English, 50 trucking and 30 distinct recorded listening passages", () => {
 assert.deepEqual(counts,{english:100,trucking:50,listening:30});
 const all=[...bank.english,...bank.trucking,...bank.listening];
 assert.equal(new Set(all.map(q=>q.id)).size,180);
 assert.equal(new Set([...bank.english,...bank.trucking].map(q=>q.prompt)).size,150);
 for(const q of [...bank.english,...bank.trucking]) assert.ok(q.referenceAnswer.length>50);
 for(const q of bank.listening){
  assert.ok(q.text.split(/\s+/).length>=40);
  const bytes=fs.readFileSync(path.join(__dirname,"../../frontend/public",q.audioUrl));
  assert.equal(bytes.subarray(0,4).toString(),"RIFF");
  assert.equal(bytes.subarray(8,12).toString(),"WAVE");
  let offset=12,samples;
  while(offset+8<=bytes.length){
   const size=bytes.readUInt32LE(offset+4);
   if(bytes.subarray(offset,offset+4).toString()==="data"){samples=bytes.subarray(offset+8,offset+8+size);break;}
   offset+=8+size+size%2;
  }
  assert.ok(samples?.length>320000);
  let peak=0;for(let i=0;i+1<samples.length;i+=2)peak=Math.max(peak,Math.abs(samples.readInt16LE(i)));
  assert.ok(peak>1000,q.id+" should not be silent");
 }
});
test("selection excludes duplicates and all questions from the previous invitation",()=>{
 let previous;const seen=new Set();
 for(let i=0;i<100;i++){
  const q=selectQuestions(previous);assert.equal(q.listening.length,2);assert.equal(q.speaking.length,3);
  assert.ok(q.speaking[0].id.startsWith("E"));assert.ok(q.speaking.slice(1).every(t=>t.id.startsWith("T")));
  const ids=[...q.listening,...q.speaking].map(t=>t.id);assert.equal(new Set(ids).size,5);
  const prior=[...(previous?.listening||[]),...(previous?.speaking||[])].map(t=>t.id);
  assert.ok(ids.every(id=>!prior.includes(id)));seen.add(ids.join(","));previous=q;
 }
 assert.ok(seen.size>90);
});
test("candidate responses never expose answer keys or private scores",()=>{
 const row={name:"Candidate",status:"PENDING",questions:selectQuestions(),result:{total:90}};
 const view=publicView(row);assert.equal(view.listening[0].text,undefined);assert.equal(view.speaking[0].referenceAnswer,undefined);assert.equal(view.result,undefined);
 assert.deepEqual(publicView({...row,status:"REVIEWED"}),{name:"Candidate",status:"SUBMITTED"});
});
test("submission enforces consent, audio limits and review rubric",()=>{
 const input={consent:true,answers:["hello",""],recordings:[{data:Buffer.from("1a45dfa30000","hex").toString("base64"),mimeType:"audio/webm;codecs=opus",duration:2},null,null]};
 assert.equal(validateSubmission(input).recordings.length,1);
 assert.throws(()=>validateSubmission({...input,consent:false}),{status:400});
 assert.throws(()=>validateSubmission({...input,answers:["a ".repeat(1001),""]}),{status:400});
 for(const patch of [{duration:61},{mimeType:"audio/mp4"},{data:"A".repeat(1048580)}])assert.throws(()=>validateSubmission({...input,recordings:[{...input.recordings[0],...patch},null,null]}),{status:400});
 const review={scores:Array.from({length:3},()=>Object.fromEntries(rubric.map(([key])=>[key,4]))),notes:["","",""]};
 assert.deepEqual(validateReview(review),review);
 assert.throws(()=>validateReview({...review,scores:[{a:5,b:5,c:5,d:5,e:5},{},{}]}),{status:400});
});
test("all staff routes reject anonymous and unauthorized roles before accessing records",async()=>{
 let calls=0;const service=new Proxy({},{get:()=>async()=>{calls++;return {ok:true}}});
 const app=express();app.use(createInterviewRouter(service,(req,res,next)=>{if(!req.headers["x-test-role"])return res.sendStatus(401);req.user={role:req.headers["x-test-role"],id:123};next();}));
 const server=app.listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));const base="http://127.0.0.1:"+server.address().port;
 try{
  for(const [method,url] of [["GET","/?branchId=2"],["POST","/"],["GET","/1?branchId=2"],["GET","/1/audio/0?branchId=2"],["POST","/1/review?branchId=2"],["DELETE","/1?branchId=2"]]){
   assert.equal((await fetch(base+url,{method})).status,401);
   assert.equal((await fetch(base+url,{method,headers:{"x-test-role":"EDITOR"}})).status,403);
  }
  assert.equal(calls,0);
  assert.equal((await fetch(base+"/?branchId=2",{headers:{"x-test-role":"MANAGER"}})).status,200);
  assert.equal((await fetch(base+"/public/"+"a".repeat(64))).status,200);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
