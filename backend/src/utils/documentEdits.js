const {archiveRevision,revisions,fail}=require('./adminRevisions');
const text=(value,label,required=false)=>{if(value===null||value===undefined)value='';if(typeof value!=='string'||value.length>2000||(required&&!value.trim()))fail(400,'Invalid '+label);return value.trim();};
const money=(value,label)=>{if(value!==null&&value!==undefined&&typeof value!=='number'&&typeof value!=='string')fail(400,'Invalid '+label);const n=Number(value||0);if(!Number.isFinite(n)||n<0||n>1e9)fail(400,'Invalid '+label);return Math.round(n*100)/100;};
const date=(value)=>{const s=String(value||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)fail(400,'Enter a valid date');return s;};
function salaryData(body,calculate){
 const data={employeeId:Number(body.employeeId),salaryType:body.salaryType};
 if(!['FIXED','COMMISSION','FIXED_COMMISSION'].includes(data.salaryType))fail(400,'Invalid salary type');
 for(const key of ['employeeName','designation','cnic','dispatchCompany','notes'])data[key]=text(body[key],key,key==='employeeName');
 for(const key of ['dispatchAmountUSD','commissionPercent','usdRate','fixedSalaryPKR','loanDeduction','advanceDeduction','otherDeduction','bonus'])data[key]=money(body[key],key);
 if(data.commissionPercent>100)fail(400,'Commission cannot exceed 100%');
 data.periodStart=new Date(date(body.periodStart));data.periodEnd=new Date(date(body.periodEnd));if(data.periodEnd<data.periodStart)fail(400,'Period end precedes start');
 return {...data,...calculate(data)};
}
function reportData(body,current){
 const report={...current.reportData,branchId:current.branchId,companyId:current.companyId,truckId:current.truckId};
 for(const key of ['title','companyName','ownerName','mcNumber','dotNumber','truckNumber','trailerNumber'])report[key]=text(body[key],key,key==='title');
 report.from=date(body.from);report.to=date(body.to);if(report.to<report.from)fail(400,'Period end precedes start');
 if(!Array.isArray(body.loads)||body.loads.length>500||!Array.isArray(body.reasons)||body.reasons.length>500)fail(400,'Invalid report rows');
 report.loads=body.loads.map(row=>{const grossAmount=money(row.grossAmount??row.loadAmount,'load gross'),miles=money(row.miles,'miles');return {pickupDate:date(row.pickupDate||row.loadDate),dropoffDate:row.dropoffDate?date(row.dropoffDate):null,pickup:text(row.pickup,'pickup',true),dropoff:text(row.dropoff,'dropoff',true),miles,grossAmount,loadAmount:grossAmount,ratePerMile:miles?grossAmount/miles:0};});
 report.reasons=body.reasons.map(row=>({reasonDate:date(row.reasonDate),reasonType:text(row.reasonType,'reason',true),reasonNote:text(row.reasonNote,'note')}));
 report.totalLoads=report.loads.length;report.totalGross=report.loads.reduce((s,r)=>s+Math.round(r.grossAmount*100),0)/100;report.totalMiles=report.loads.reduce((s,r)=>s+Math.round(r.miles*100),0)/100;report.avgRatePerMile=report.totalMiles?report.totalGross/report.totalMiles:0;report.reasonDays=new Set(report.reasons.map(r=>r.reasonDate)).size;
 return {reportData:report,reportTitle:report.title,companyName:report.companyName,ownerName:report.ownerName,mcNumber:report.mcNumber,dotNumber:report.dotNumber,truckNumber:report.truckNumber,trailerNumber:report.trailerNumber,periodStart:new Date(report.from),periodEnd:new Date(report.to),totalLoads:report.totalLoads,totalGross:report.totalGross,totalMiles:report.totalMiles,avgRatePerMile:report.avgRatePerMile,reasonDays:report.reasonDays};
}
function editDocument(db,model,entityType,build){return async(req,res)=>{try{
 const result=await db.$transaction(async tx=>{
  const current=await tx[model].findUnique({where:{id:Number(req.params.id)}});if(!current)fail(404,'Record not found');
  if(String(req.body.expectedUpdatedAt)!==current.updatedAt.toISOString())fail(409,'Record changed. Reload history before editing.');
  const data=build(req.body,current);
  if(model==='salarySlip'&&(!Number.isSafeInteger(data.employeeId)||!await tx.employee.findFirst({where:{id:data.employeeId,branchId:current.branchId}})))fail(400,'Employee must belong to this branch');
  await archiveRevision(tx,{branchId:current.branchId,entityType,entityId:current.id,reason:req.body.reason,snapshot:current,userId:req.user.id});
  const updated=await tx[model].updateMany({where:{id:current.id,updatedAt:current.updatedAt},data});if(updated.count!==1)fail(409,'Record changed. Reload before editing.');
  return tx[model].findUnique({where:{id:current.id}});
 });res.json(result);
 }catch(error){res.status(error.status||500).json({message:error.status?error.message:'Unable to save correction. Confirm the admin revision migration is installed.'});}};}
const history=(db,type)=>async(req,res)=>{try{res.json(await revisions(db,type,req.params.id));}catch{res.status(500).json({message:'Unable to load revision history'});}};
module.exports={salaryData,reportData,editDocument,history};
