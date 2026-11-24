const {fail}=require('./adminRevisions');
const {allocatePartnerAmounts}=require('./settlementAllocation');
const fees=require('./invoiceAccountsFees');
const cents=n=>Math.round(Number(n||0)*100);
function number(value,label,{positive=false,money=false}={}){
 if((typeof value!=='number'&&typeof value!=='string')||value==='')fail(400,'Enter '+label);
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||n>1e9||(positive&&n<=0)||(money&&Math.abs(n*100-cents(n))>0.00001))fail(400,'Invalid '+label);
 return n;
}
function receiptAmounts(amount,rate,platform=0,accountants=0){
 const invoiceAmountUSD=number(amount,'payment USD',{positive:true,money:true});
 const usdRate=number(rate,'USD rate',{positive:true});
 const platformFeeUSD=number(platform,'platform fee USD',{money:true});
 const accountsFeeUSD=number(accountants,'accountant fee USD',{money:true});
 if(cents(platformFeeUSD)+cents(accountsFeeUSD)>cents(invoiceAmountUSD))fail(400,'Platform fee and accountant fee cannot exceed the payment.');
 const totalAmountPKR=cents((cents(invoiceAmountUSD)-cents(platformFeeUSD))/100*usdRate)/100;
 const accountantPKR=cents(accountsFeeUSD*usdRate)/100;
 return {invoiceAmountUSD,usdRate,platformFeeUSD,totalAmountPKR,accountantPKR,revenuePKR:(cents(totalAmountPKR)-cents(accountantPKR))/100};
}
function distribution(body,amounts,partners,dispatchers){
 const amountFor=(prefix)=>{
  const type=body[prefix+'Type'],value=number(body[prefix+'Value'],prefix+' value');
  if(!['PERCENTAGE','ABSOLUTE'].includes(type)||(type==='PERCENTAGE'&&value>100))fail(400,'Invalid '+prefix+' type or percentage');
  return cents(type==='ABSOLUTE'?value:amounts.revenuePKR*value/100)/100;
 };
 const dispatcherAmountPKR=amountFor('dispatcher'),teamPKR=amountFor('accounts');
 const accountsPartnerId=body.accountsPartnerId===''||body.accountsPartnerId==null?null:Number(body.accountsPartnerId);
 let allocation;try{allocation=allocatePartnerAmounts(amounts.revenuePKR,dispatcherAmountPKR,teamPKR,partners,accountsPartnerId);}catch(e){fail(400,e.message);}
 if(!Array.isArray(body.dispatcherSplits)||body.dispatcherSplits.length>100)fail(400,'Invalid dispatcher rows');
 const seen=new Set();
 const dispatcherSplits=body.dispatcherSplits.map(row=>{
  const id=Number(row.dispatcherId),d=dispatchers.find(d=>d.id===id);
  if(!d||seen.has(id))fail(400,'Choose each dispatcher once from this branch');seen.add(id);
  return {dispatcherId:id,name:d.name,amountPKR:number(row.amount??row.amountPKR,'dispatcher amount',{positive:true,money:true})};
 });
 if(dispatcherSplits.reduce((s,r)=>s+cents(r.amountPKR),0)>cents(dispatcherAmountPKR))fail(400,'Dispatcher splits exceed the dispatcher total');
 const accountantsSplits=fees.accountantsSplits(body.accountantsSplits||[],amounts.accountantPKR);
 return {data:{dispatcherType:body.dispatcherType,dispatcherValue:Number(body.dispatcherValue),dispatcherAmountPKR,dispatcherSplits,accountsType:body.accountsType,accountsValue:Number(body.accountsValue),accountsPartnerId,accountsAmountPKR:(cents(teamPKR)+cents(amounts.accountantPKR))/100,partnerProfitPKR:allocation.partnerProfitPKR,partnerSplits:allocation.partnerSplits},accountantsSplits};
}
module.exports={number,receiptAmounts,distribution};
