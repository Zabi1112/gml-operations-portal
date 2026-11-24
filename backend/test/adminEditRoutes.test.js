const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const authPath=require.resolve('../src/middleware/auth.middleware');
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{protect:(req,res,next)=>{const role=req.headers['x-role'];if(!role)return res.sendStatus(401);req.user={id:1,role};next();},allowRoles:(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.sendStatus(403)}};
const guardPath=require.resolve('../src/middleware/branchWriteGuard');
require.cache[guardPath]={id:guardPath,filename:guardPath,loaded:true,exports:{branchWriteGuard:(req,res,next)=>next()}};
const targets=[['finance','finance.routes','patch','/settlements/1','updateSettlement'],['invoice','invoice.routes','post','/1/reopen','reopenForCorrection'],['invoice','invoice.routes','get','/1/revisions','getInvoiceRevisions'],['salary','salary.routes','patch','/1','updateSalarySlip'],['loadReport','loadReport.routes','patch','/1','updateLoadReport'],['finance','finance.routes','patch','/partners/1','updatePartner'],['finance','finance.routes','patch','/dispatchers/1','updateDispatcher'],['load','load.routes','patch','/reasons/1','updateLoadReason'],['user','user.route','patch','/1','updateUser']];
for(const name of new Set(targets.map(r=>r[0]))){const path=require.resolve('../src/controllers/'+name+'.controller');require.cache[path]={id:path,filename:path,loaded:true,exports:new Proxy({},{get:()=>((req,res)=>res.json({ok:true}))})};}
test('new correction and admin edit routes enforce administrator role',async t=>{
 const app=express();app.use(express.json());
 for(const route of new Set(targets.map(r=>r[1])))app.use('/'+route,require('../src/routes/'+route));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const [,route,method,path] of targets){
  for(const role of [null,'VIEWER','EDITOR','MANAGER','ADMIN']){
   const response=await fetch(base+'/'+route+path,{method:method.toUpperCase(),headers:role?{'x-role':role}:{}});
   assert.equal(response.status,role==='ADMIN'?200:role?403:401,route+' '+path+' '+role);
  }
 }
});
