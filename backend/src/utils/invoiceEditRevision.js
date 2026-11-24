const payments=require('./invoicePayments');
const {archiveRevision,fail}=require('./adminRevisions');
const cents=payments.cents;
const previous=row=>row.includePreviousInvoiceInNet?cents(row.previousInvoiceAmount):0;
const charges=row=>Array.isArray(row.carryForward)?cents(row.currentChargesUSD??(Number(row.netPayable)-previous(row)/100)):cents(row.netPayable);
function carryCorrections(existing,rows,newCharges){
 const delta=newCharges-charges(existing),result=[];
 if(!delta)return result;
 if(existing.balanceTransferredToInvoiceId)fail(409,'This legacy invoice was consolidated into another invoice. Correct its replacement invoice to change charges. Details and notes remain editable here.');
 const later=rows.filter(r=>r.id!==existing.id&&(Date.parse(r.createdAt)>Date.parse(existing.createdAt)||(Date.parse(r.createdAt)===Date.parse(existing.createdAt)&&r.id>existing.id)));
 const dueDelta=Math.max(0,newCharges-cents(existing.paidAmountUSD))-Math.max(0,charges(existing)-cents(existing.paidAmountUSD));
 for(const row of later){
  if(!Array.isArray(row.carryForward))fail(409,'A later invoice has a legacy consolidated balance. Correct that replacement invoice before changing these charges.');
  const carry=structuredClone(row.carryForward),index=carry.findIndex(r=>r.invoiceId===existing.id);
  let change=0;
  if(index>=0){const old=cents(carry[index].amountUSD),next=Math.max(0,old+delta);change=next-old;carry[index].amountUSD=next/100;}
  else if(dueDelta>0){carry.push({invoiceId:existing.id,amountUSD:dueDelta/100});change=dueDelta;}
  if(change)result.push({row,data:{carryForward:carry,previousInvoiceAmount:(previous(row)+change)/100,includePreviousInvoiceInNet:previous(row)+change>0,netPayable:(cents(row.netPayable)+change)/100}});
 }
 return result;
}
async function prepareRevision(tx,existing,calculated,body,userId){
 if(body.expectedUpdatedAt!==existing.updatedAt.toISOString())fail(409,'Invoice changed. Reload History and open Edit again.');
 const rows=await payments.companyRows(tx,existing);
 const newCharges=cents(calculated.netPayable)-(Array.isArray(existing.carryForward)?previous(existing):0);
 const ledger=await tx.invoiceSettlement.findMany({where:{invoiceId:{in:rows.map(r=>r.id)}}});
 const receivedFee=ledger.reduce((sum,s)=>sum+(s.paymentAllocations||[]).reduce((n,a)=>n+(a.accountsFeeAllocations||[]).filter(f=>f.invoiceId===existing.id).reduce((v,f)=>v+cents(f.amountUSD),0),0),0);
 if(cents(calculated.accountsFeeTotal)<receivedFee)fail(400,'Accountant fee is below the fee already received. Correct that fee in the settlement first.');
 if((newCharges!==charges(existing)||cents(calculated.accountsFeeTotal)!==cents(existing.accountsFeeTotal))&&cents(calculated.accountsFeeTotal)-receivedFee>Math.max(0,newCharges-cents(existing.paidAmountUSD)))fail(400,'This change would leave unpaid accountant fees above the remaining invoice balance. Adjust the fee or correct its received portion in the settlement.');
 const changes=carryCorrections(existing,rows,newCharges);
 await archiveRevision(tx,{branchId:existing.branchId,entityType:'Invoice',entityId:existing.id,reason:body.reason,snapshot:{invoice:existing,settlements:ledger,balances:rows},userId});
 for(const change of changes){
  const full=await tx.invoice.findUnique({where:{id:change.row.id},include:{loads:true}});
  await archiveRevision(tx,{branchId:existing.branchId,entityType:'Invoice',entityId:change.row.id,reason:'Carry-forward correction from '+(existing.invoiceNumber||existing.id)+': '+body.reason,snapshot:{invoice:full,settlements:ledger},userId});
  await tx.invoice.update({where:{id:change.row.id},data:change.data});
 }
 return {currentChargesUSD:Array.isArray(existing.carryForward)?newCharges/100:existing.currentChargesUSD,paidAmountUSD:existing.paidAmountUSD};
}
module.exports={prepareRevision,carryCorrections};
