const p=require('./invoicePayments');
const {archiveRevision}=require('./adminRevisions');
async function reopenInvoice(db,id,reason,userId){
 return db.$transaction(async tx=>{
  const initial=await tx.invoice.findUnique({where:{id:Number(id)},include:{loads:true}});
  if(!initial)p.fail(404,'Invoice not found');
  await p.lockCompany(tx,initial.branchId,initial.companyId);
  const rows=await p.companyRows(tx,initial),invoice=rows.find(row=>row.id===initial.id);
  p.assertPaymentTarget(invoice,rows);
  if(!Array.isArray(invoice.carryForward)&&invoice.includePreviousInvoiceInNet&&Number(invoice.previousInvoiceAmount)>0)p.fail(409,'This invoice contains a reconciled opening balance. Create a reviewed balance adjustment before changing its charges.');
  const settlements=await tx.invoiceSettlement.findMany({where:{invoiceId:invoice.id}});
  if(!settlements.length&&p.cents(invoice.paidAmountUSD)===0)p.fail(409,'This invoice is already unpaid. Use Edit.');
  const snapshotInvoice=await tx.invoice.findUnique({where:{id:invoice.id},include:{loads:true}});
  const revisionId=await archiveRevision(tx,{branchId:invoice.branchId,entityType:'Invoice',entityId:invoice.id,reason,userId,snapshot:{invoice:snapshotInvoice,settlements,balances:rows}});
  for(const settlement of settlements){
   if(Array.isArray(settlement.paymentAllocations))for(const allocation of settlement.paymentAllocations)await tx.invoice.update({where:{id:allocation.invoiceId},data:{paidAmountUSD:{decrement:allocation.amountUSD}}});
   await tx.invoiceSettlement.delete({where:{id:settlement.id}});
  }
  await tx.invoice.update({where:{id:invoice.id},data:{paidAmountUSD:0,isCleared:false,clearedAt:null}});
  await p.refreshFlags(tx,invoice);
  return {revisionId,message:'Original invoice and receipts archived. Payment allocations reversed. Edit this invoice, then record the corrected receipts.'};
 },{timeout:30000});
}
module.exports={reopenInvoice};
