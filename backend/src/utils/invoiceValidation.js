const {fail}=require('./invoicePayments');
function validDate(value){
 if(!value||!Number.isFinite(new Date(value).getTime()))return false;
 if(typeof value==='string'){const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(value);if(!match)return false;const [year,month,day]=match.slice(1).map(Number);const date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;}
 return value instanceof Date;
}
function validateInvoice(data){
 if(!['FIXED','PERCENTAGE'].includes(data.billingType||'PERCENTAGE'))fail(400,'Choose a valid billing type.');
 const number=(value,label,max=100000000)=>{const n=Number(value??0);if(!Number.isFinite(n)||n<0||n>max)fail(400,label+' must be a valid non-negative number.');};
 for(const key of ['fixedMonthlyRate','accountsFeeWeeks','accountsFeeRate','discountAmount','referralBonus','fineAmount','previousInvoiceAmount'])number(data[key],key);
 number(data.dispatchPercent,'Dispatch percentage',100);
 if(data.selectedTruckCount!==undefined){number(data.selectedTruckCount,'Truck count',10000);if(!Number.isInteger(Number(data.selectedTruckCount)))fail(400,'Truck count must be a whole number.');}
 for(const key of ['invoiceStart','invoiceEnd'])if(!validDate(data[key]))fail(400,'Enter valid invoice dates.');
 if(new Date(data.invoiceEnd)<new Date(data.invoiceStart))fail(400,'Invoice end date cannot be before the start date.');
 if(data.dueDate&&!validDate(data.dueDate))fail(400,'Enter a valid due date.');
 if(!Array.isArray(data.loads||[]))fail(400,'Loads must be a list.');
 for(const load of data.loads||[]){number(load.loadAmount,'Load amount');if(!validDate(load.date))fail(400,'Enter valid load dates.');if(typeof load.pickup!=='string'||!load.pickup.trim()||typeof load.dropoff!=='string'||!load.dropoff.trim())fail(400,'Each load needs pickup and drop-off locations.');}
 if(data.truckRateBreakdown!=null&&!Array.isArray(data.truckRateBreakdown))fail(400,'Truck rates must be a list.');
 for(const truck of data.truckRateBreakdown||[])number(truck.rate,'Truck rate');
 if(data.invoiceNumber!=null&&(typeof data.invoiceNumber!=='string'||data.invoiceNumber.length>100))fail(400,'Invoice number must be at most 100 characters.');
}
async function validateLoadOwners(db,data){
 for(const [key,model] of [['driverId','driver'],['truckId','truck']]){
  const ids=[...new Set((data.loads||[]).map(load=>load[key]).filter(value=>value!=null&&value!==''))].map(Number);
  if(ids.some(id=>!Number.isSafeInteger(id)||id<=0))fail(400,'Invalid load '+key+'.');
  if(!ids.length)continue;
  const rows=await db[model].findMany({where:{id:{in:ids},branchId:Number(data.branchId),...(data.companyId?{companyId:Number(data.companyId)}:{})},select:{id:true}});
  if(rows.length!==ids.length)fail(400,'Load drivers and trucks must belong to the selected company and branch.');
 }
}
module.exports={validateInvoice,validateLoadOwners};
