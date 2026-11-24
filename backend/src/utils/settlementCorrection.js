const {allocatePartnerAmounts}=require('./settlementAllocation');
const {archiveRevision,fail}=require('./adminRevisions');
const payments=require('./invoicePayments');
const cents=value=>Math.round(Number(value||0)*100);
function dispatcherCorrection(existing,body,dispatchers){
 const type=body.dispatcherType,value=Number(body.dispatcherValue);
 if(!['PERCENTAGE','ABSOLUTE'].includes(type)||!Number.isFinite(value)||value<0||(type==='PERCENTAGE'&&value>100))fail(400,'Enter a valid dispatcher percentage or PKR amount.');
 const feeUSD=(existing.paymentAllocations||[]).reduce((sum,row)=>sum+cents(row.accountsFeeUSD),0)/100;
 const feePKR=cents(feeUSD*Number(existing.usdRate||0));
 const revenue=(cents(existing.totalAmountPKR)-feePKR)/100;
 const accounts=(cents(existing.accountsAmountPKR)-feePKR)/100;
 const amount=cents(type==='ABSOLUTE'?value:revenue*value/100)/100;
 const partners=(existing.partnerSplits||[]).map(row=>({id:row.partnerId,name:row.name,percent:row.percent}));
 if(!partners.length)fail(409,'This settlement has no saved partner distribution. Review it before correcting shares.');
 let allocation;try{allocation=allocatePartnerAmounts(revenue,amount,accounts,partners,existing.accountsPartnerId);}catch(error){fail(400,error.message);}
 if(!Array.isArray(body.dispatcherSplits))fail(400,'Invalid dispatcher splits.');
 const seen=new Set();
 const splits=body.dispatcherSplits.map(row=>{
  const id=Number(row.dispatcherId),raw=Number(row.amount),dispatcher=dispatchers.find(d=>d.id===id);
  if(!dispatcher||seen.has(id)||!Number.isFinite(raw)||raw<=0)fail(400,'Choose each dispatcher once and enter a positive amount.');
  seen.add(id);return {dispatcherId:id,name:dispatcher.name,amountPKR:cents(raw)/100};
 });
 if(splits.reduce((sum,row)=>sum+cents(row.amountPKR),0)>cents(amount))fail(400,'Dispatcher splits exceed the dispatcher total.');
 return {dispatcherType:type,dispatcherValue:value,dispatcherAmountPKR:amount,dispatcherSplits:splits,partnerProfitPKR:allocation.partnerProfitPKR,partnerSplits:allocation.partnerSplits};
}
async function correctSettlement(db,id,body,userId){
 return db.$transaction(async tx=>{
  const existing=await tx.invoiceSettlement.findUnique({where:{id}});
  if(!existing)fail(404,'Settlement not found');
  if(!existing.invoiceId)fail(400,'Use the manual settlement editor for this record.');
  if(String(body.expectedUpdatedAt)!==existing.updatedAt.toISOString())fail(409,'Settlement changed. Reload history before editing.');
  const dispatchers=await tx.branchDispatcher.findMany({where:{branchId:existing.branchId}});
  const data=dispatcherCorrection(existing,body,dispatchers);
  Object.assign(data,payments.validatePaymentDetails(body.paymentMethod,body.otherPaymentMethod,body.settlementDate));
  await archiveRevision(tx,{branchId:existing.branchId,entityType:'InvoiceSettlement',entityId:id,reason:body.reason,snapshot:existing,userId});
  const updated=await tx.invoiceSettlement.updateMany({where:{id,updatedAt:existing.updatedAt},data});
  if(updated.count!==1)fail(409,'Settlement changed. Reload history before editing.');
  return tx.invoiceSettlement.findUnique({where:{id}});
 });
}
module.exports={dispatcherCorrection,correctSettlement};
