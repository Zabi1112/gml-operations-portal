const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
async function fleetUpdate(db,kind,current,body){
 if(!current)fail(404,'Record not found');
 const branchId=body.branchId===undefined?current.branchId:Number(body.branchId);
 if(branchId!==current.branchId)fail(400,'Records cannot be moved between branches.');
 const companyId=body.companyId===undefined?current.companyId:Number(body.companyId);
 if(!Number.isSafeInteger(companyId)||companyId<=0||!await db.company.findFirst({where:{id:companyId,branchId}}))fail(400,'Company must belong to this branch.');
 const field=kind==='truck'?'truckNumber':'name';
 const name=body[field]===undefined?current[field]:typeof body[field]==='string'?body[field].trim():'';
 if(!name||name.length>200)fail(400,'Enter a name/number of up to 200 characters.');
 const data={companyId,[field]:name};
 for(const key of kind==='truck'?['trailerNumber','notes']:['phone','email'])if(body[key]!==undefined){if(body[key]!==null&&typeof body[key]!=='string')fail(400,'Invalid '+key);data[key]=body[key]?.trim()||null;}
 if(kind==='truck'){
  if(companyId!==current.companyId&&await db.driver.count({where:{truckId:current.id}}))fail(409,'Unassign this truck from its drivers before moving it to another company.');
 }else{
  const truckId=body.truckId===undefined?current.truckId:body.truckId===null||body.truckId===''?null:Number(body.truckId);
  if(truckId!==null&&(!Number.isSafeInteger(truckId)||truckId<=0||!await db.truck.findFirst({where:{id:truckId,companyId,branchId}})))fail(400,'Truck must belong to the selected company and branch.');
  data.truckId=truckId;
  if(body.isActive!==undefined){if(typeof body.isActive!=='boolean')fail(400,'Invalid active status');data.isActive=body.isActive;}
 }
 return data;
}
module.exports={fleetUpdate};
