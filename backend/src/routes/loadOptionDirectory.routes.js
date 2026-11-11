const express = require('express');
const {State, City} = require('country-state-city');
const {protect, allowRoles} = require('../middleware/auth.middleware');
function createDirectoryRouter(db = require('../utils/prisma')) {
 const router=express.Router();
 router.get('/states', (req,res)=>res.json(State.getStatesOfCountry('US').map(s=>({code:s.isoCode,name:s.name}))));
 router.get('/cities/:state', (req,res)=>{
  const state=req.params.state.toUpperCase();
  if(!State.getStateByCodeAndCountry(state,'US'))return res.status(400).json({message:'Choose a US state.'});
  res.json(City.getCitiesOfState('US',state).map(c=>({name:c.name,coordinates:[Number(c.longitude),Number(c.latitude)]})));
 });
 // Deliberately public, minimal directory for the guest load builder.
 router.get('/companies',async(req,res)=>{try{res.json(await db.company.findMany({where:{branch:{isActive:true},drivers:{some:{isActive:true}}},select:{id:true,companyName:true},orderBy:{companyName:'asc'}}));}catch{res.status(503).json({message:'Company directory unavailable. Enter a driver manually.'});}});
 router.get('/drivers',async(req,res)=>{
  const companyId=Number(req.query.companyId);
  if(!Number.isSafeInteger(companyId)||companyId<=0)return res.status(400).json({message:'Choose a company.'});
  try{res.json(await db.driver.findMany({where:{companyId,isActive:true,branch:{isActive:true},company:{branch:{isActive:true}}},select:{id:true,name:true},orderBy:{name:'asc'}}));}catch{res.status(503).json({message:'Driver directory unavailable. Enter a driver manually.'});}
 });
 router.get('/brokers',async(req,res)=>{try{res.json(await db.loadOptionBroker.findMany({orderBy:{name:'asc'}}));}catch{res.status(503).json({message:'Broker directory unavailable. You can enter details manually.'});}});
 router.post('/brokers',protect,allowRoles('ADMIN','MANAGER','EDITOR'),async(req,res)=>{
  const name=typeof req.body.name==='string'?req.body.name.trim():'';
  const mc=typeof req.body.mc==='string'?req.body.mc.trim().replace(/^MC[- ]?/i,''):'';
  if(!name||name.length>150||!/^\d{1,10}$/.test(mc))return res.status(400).json({message:'Enter a broker name and numeric MC number.'});
  const data={name,mc,sourceUrl:''};
  for(const k of ['phone','email','address','website']){if(req.body[k]!=null&&(typeof req.body[k]!=='string'||req.body[k].length>250))return res.status(400).json({message:'Broker details must be under 250 characters.'});data[k]=(req.body[k]||'').trim();}
  try{const existing=await db.loadOptionBroker.findFirst({where:{OR:[{mc},{name:{equals:name,mode:'insensitive'}}]}});
   if(existing)return res.json(await db.loadOptionBroker.update({where:{id:existing.id},data}));
   res.status(201).json(await db.loadOptionBroker.create({data}));
  }catch{res.status(409).json({message:'Unable to save broker. Refresh the directory and retry.'});}
 });
 return router;
}
module.exports={createDirectoryRouter};
