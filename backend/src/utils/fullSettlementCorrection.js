const {archiveRevision,fail}=require('./adminRevisions');
const payments=require('./invoicePayments');
const fees=require('./invoiceAccountsFees');
const {number,receiptAmounts,distribution}=require('./settlementAmounts');
const cents=payments.cents;
async function fullCorrection(db,id,body,userId){
 return db.$transaction(async tx=>{
  let existing=await tx.invoiceSettlement.findUnique({where:{id}});
  if(!existing)fail(404,'Settlement not found');
  let invoice=null;
  if(existing.invoiceId){
   invoice=await tx.invoice.findUnique({where:{id:existing.invoiceId}});
   if(!invoice)fail(409,'Invoice no longer exists');
   await payments.lockCompany(tx,invoice.branchId,invoice.companyId);
   existing=await tx.invoiceSettlement.findUnique({where:{id}});
   if(!existing)fail(409,'Settlement was removed. Reload history.');
   invoice=await tx.invoice.findUnique({where:{id:existing.invoiceId}});
   if(!invoice)fail(409,'Invoice no longer exists');
  }
  if(String(body.expectedUpdatedAt)!==existing.updatedAt.toISOString())fail(409,'Settlement changed. Reload history before editing.');
  const branch=await tx.branch.findUnique({where:{id:existing.branchId},include:{partners:true,dispatchers:true}});
  if(!branch?.isActive)fail(409,'Branch is archived or unavailable');
  const oldAllocations=Array.isArray(existing.paymentAllocations)?existing.paymentAllocations:[];
  const oldFee=oldAllocations.reduce((s,r)=>s+cents(r.accountsFeeUSD),0)/100;
  const requestedFee=number(body.accountsFeeReceivedUSD??oldFee,'accountant fee USD',{money:true});
  if(!invoice&&requestedFee)fail(400,'Invoice accountant fees require an invoice payment');
  const pkrOnly=!invoice&&body.receiptCurrency==='PKR';
  const amount=pkrOnly?0:number(body.invoiceAmountUSD,'payment USD',{positive:true,money:true});
  let paymentAllocations=structuredClone(oldAllocations),feeUSD=requestedFee;
  const reallocate=invoice&&(cents(amount)!==cents(existing.invoiceAmountUSD)||cents(requestedFee)!==cents(oldFee));
  if(reallocate){
   if(!oldAllocations.length)fail(409,'This legacy receipt has no allocation ledger. Its payment amount requires a reviewed invoice correction. Other settlement fields can be edited.');
   const rows=await payments.companyRows(tx,invoice);
   payments.assertPaymentTarget(invoice,rows);
   for(const allocation of oldAllocations){
    const row=rows.find(r=>r.id===allocation.invoiceId);
    if(!row||cents(row.paidAmountUSD)<cents(allocation.amountUSD))fail(409,'Receipt allocations do not match invoice balances');
    await tx.invoice.update({where:{id:row.id},data:{paidAmountUSD:{decrement:allocation.amountUSD}}});
   }
   const reversedRows=await payments.companyRows(tx,invoice);
   const ledger=await tx.invoiceSettlement.findMany({where:{invoiceId:{in:reversedRows.map(r=>r.id)},id:{not:id}}});
   invoice=reversedRows.find(row=>row.id===invoice.id);
   const plan=fees.plan(invoice,reversedRows,ledger,amount,requestedFee);
   if(cents(plan.accountsFeeUSD)!==cents(requestedFee))fail(400,'Full clearance must include all remaining accountant fees. Enter '+plan.accountsFeeUSD+' USD.');
   paymentAllocations=plan.allocations;feeUSD=plan.accountsFeeUSD;
  }
  if(pkrOnly&&Number(body.platformFeeUSD||0))fail(400,'USD platform fees require a USD settlement');
  const pkr=pkrOnly?number(body.totalAmountPKR,'received PKR',{positive:true,money:true}):0;
  const amounts=pkrOnly?{invoiceAmountUSD:0,usdRate:0,platformFeeUSD:0,totalAmountPKR:pkr,accountantPKR:0,revenuePKR:pkr}:receiptAmounts(amount,body.usdRate,body.platformFeeUSD??0,feeUSD);
  if(!Array.isArray(body.partners)||!body.partners.length||body.partners.length>100)fail(400,'Enter partner distribution');
  const known=[...(existing.partnerSplits||[]).map(r=>({id:r.partnerId,name:r.name})),...branch.partners];
  const seen=new Set();
  const partners=body.partners.map(row=>{
   const partner=known.find(p=>p.id===Number(row.id));
   if(!partner||seen.has(partner.id))fail(400,'Choose each partner once from this branch');seen.add(partner.id);
   return {...partner,percent:number(row.percent,'partner percentage')};
  });
  if(Math.abs(partners.reduce((s,r)=>s+r.percent,0)-100)>0.000001)fail(400,'Partner percentages must total 100%');
  const knownDispatchers=[...branch.dispatchers,...(existing.dispatcherSplits||[]).map(r=>({id:r.dispatcherId,name:r.name}))];
  const result=distribution(body,amounts,partners,knownDispatchers);
  if(paymentAllocations.length){paymentAllocations.forEach(r=>{delete r.accountantsSplits;});paymentAllocations[0].accountantsSplits=result.accountantsSplits;}
  const data={...result.data,invoiceAmountUSD:amounts.invoiceAmountUSD,usdRate:amounts.usdRate,platformFeeUSD:amounts.platformFeeUSD,totalAmountPKR:amounts.totalAmountPKR};
  if(paymentAllocations.length)data.paymentAllocations=paymentAllocations;
  if(typeof body.notes!=='string'||body.notes.length>5000||typeof body.companyName!=='string'||!body.companyName.trim()||body.companyName.length>200)fail(400,'Enter a company name and valid notes');
  Object.assign(data,{companyName:body.companyName.trim(),notes:body.notes},payments.validatePaymentDetails(body.paymentMethod,body.otherPaymentMethod,body.settlementDate));
  await archiveRevision(tx,{branchId:existing.branchId,entityType:'InvoiceSettlement',entityId:id,reason:body.reason,snapshot:existing,userId});
  const resultUpdate=await tx.invoiceSettlement.updateMany({where:{id,updatedAt:existing.updatedAt},data});
  if(resultUpdate.count!==1)fail(409,'Settlement changed. Reload history.');
  if(reallocate){for(const allocation of paymentAllocations)await tx.invoice.update({where:{id:allocation.invoiceId},data:{paidAmountUSD:{increment:allocation.amountUSD}}});await payments.refreshFlags(tx,invoice);}
  return tx.invoiceSettlement.findUnique({where:{id}});
 },{timeout:30000});
}
module.exports={fullCorrection};
