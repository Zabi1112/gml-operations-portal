const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {createDirectoryRouter}=require('../src/routes/loadOptionDirectory.routes');
test('guest directory exposes only company/name fields, filters inactive branches and denies writes',async()=>{
 let query;const db={company:{findMany:async q=>{query=q;return [{id:1,companyName:'Test Company'}];}},driver:{findMany:async q=>{query=q;return [{id:2,name:'Test Driver'}];}},loadOptionBroker:{findMany:async()=>[{id:1,name:'Test Broker',mc:'123'}]}};
 const app=express();app.use(express.json());app.use(createDirectoryRouter(db));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const root='http://127.0.0.1:'+server.address().port;
 try{let r=await fetch(root+'/companies');assert.equal(r.status,200);assert.deepEqual(query.select,{id:true,companyName:true});assert.equal(query.where.branch.isActive,true);
 r=await fetch(root+'/drivers?companyId=1');assert.deepEqual(await r.json(),[{id:2,name:'Test Driver'}]);assert.deepEqual(query.select,{id:true,name:true});assert.equal(query.where.isActive,true);assert.equal(query.where.companyId,1);
 assert.equal((await fetch(root+'/drivers?companyId=bad')).status,400);
 assert.equal((await fetch(root+'/brokers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test',mc:'123'})})).status,401);
 const states=await(await fetch(root+'/states')).json();assert.ok(states.some(s=>s.code==='MD'));
 const cities=await(await fetch(root+'/cities/MD')).json();assert.ok(cities.some(c=>c.name==='Edgemere'&&c.coordinates.every(Number.isFinite)));
 assert.equal((await fetch(root+'/cities/INVALID')).status,400);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('starter directory has 20 distinct names and MC numbers',()=>{const rows=require('../scripts/load-option-broker-seeds');assert.equal(rows.length,20);assert.equal(new Set(rows.map(b=>b.mc)).size,20);assert.ok(rows.every(b=>b.sourceUrl&&/^\d+$/.test(b.mc)));});
