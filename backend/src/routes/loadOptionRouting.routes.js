const express=require('express');
function createRoutingRouter({key=()=>process.env.ORS_API_KEY,fetcher=fetch}={}){
 const router=express.Router(),limits=new Map(),cache=new Map();let active=0;
 router.get('/status',(req,res)=>res.json({configured:!!key()}));
 router.post('/:action',async(req,res)=>{
  const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
  try{
   if(!key())fail(503,'Truck routing is not configured. Enter miles manually.');
   const action=req.params.action;let path,body;
   if(action==='locations'){
    const text=req.body?.text;if(typeof text!=='string'||text.trim().length<3||text.length>250)fail(400,'Enter a location between 3 and 250 characters.');
    path='/pelias/v1/search?'+new URLSearchParams({text:text.trim(),'boundary.country':'USA',size:'5'});
   }else if(action==='truck-route'){
    const {coordinates,restrictions}=req.body||{};
    if(!Array.isArray(coordinates)||coordinates.length!==3||coordinates.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90))fail(400,'Confirm three valid routing locations.');
    const bounds={height:6,width:4,length:40,weight:100};const clean={};
    for(const [k,max] of Object.entries(bounds)){const n=restrictions?.[k];if(!Number.isFinite(n)||n<=0||n>max)fail(400,'Check the truck dimensions and gross weight.');clean[k]=n;}
    path='/openrouteservice/v2/directions/driving-hgv/json';body={coordinates,preference:'recommended',units:'mi',instructions:true,geometry:false,options:{profile_params:{restrictions:clean}}};
   }else fail(404,'Unknown routing action.');
   const id=path+JSON.stringify(body||null),now=Date.now(),hit=cache.get(id);
   if(hit&&hit.expires>now)return res.json(hit.data);
   const ip=req.ip||'unknown';let limit=limits.get(ip);if(!limit||limit.until<now){limit={count:0,until:now+60000};limits.set(ip,limit);}if(++limit.count>20||active>=4)fail(429,'Too many routing requests. Please wait a minute.');
   if(limits.size>5000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);
   active++;
   let response;try{response=await fetcher('https://api.heigit.org'+path,{method:body?'POST':'GET',headers:{Authorization:key(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});}finally{active--;}
   if(!response.ok)fail(response.status===429?429:502,response.status===429?'Routing quota reached. Use manual miles or retry later.':'Routing provider rejected the request. Use manual miles or retry later.');
   const payload=await response.json();let data;
   if(action==='locations')data={features:(payload.features||[]).slice(0,5).map(f=>({geometry:{coordinates:f.geometry?.coordinates},properties:{label:f.properties?.label}}))};
   else data={routes:(payload.routes||[]).slice(0,1).map(r=>({segments:r.segments?.map(s=>({distance:s.distance})),warnings:r.warnings||[]}))};
   if(cache.size>=500)cache.delete(cache.keys().next().value);cache.set(id,{data,expires:now+900000});res.json(data);
  }catch(e){res.status(e.status||502).json({message:e.status?e.message:'Routing request failed or timed out. Enter miles manually or retry.'});}
 });return router;
}
module.exports={createRoutingRouter};
