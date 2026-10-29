import {jsPDF} from 'jspdf';
// Explicit field selection keeps other partners, staff names, and internal notes private.
export function createPartnerStatementPdf(settlement,partner,assets={}) {
 const doc=new jsPDF({unit:'pt',format:'a4',compress:true});
 const W=595.28,H=841.89,M=42,bottom=767,usable=W-2*M;
 const navy=[10,49,83],orange=[232,91,23],ink=[28,47,65];let y=0;
 const font=(size=10,bold=false,color=ink)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);};
 const image=(data,x,top,w,h)=>{if(!data)return;const p=doc.getImageProperties(data),scale=Math.min(w/p.width,h/p.height);doc.addImage(data,p.fileType,x+(w-p.width*scale)/2,top,p.width*scale,p.height*scale);};
 function header(first=false){
  doc.setFillColor(...navy);doc.rect(0,0,W,10,'F');doc.setFillColor(...orange);doc.triangle(0,10,75,10,0,77,'F');
  if(first){
   if(assets.logo)image(assets.logo,M,29,76,76);
   const x=assets.logo?M+86:M;
   font(20,true,navy);doc.text('EAST WEST',x,54);font(14,true,orange);doc.text('LOGISTICS LLC',x,74);font(7,true,navy);doc.text('TRUCK DISPATCHING & SOLUTIONS',x,91);
   font(8,false,navy);doc.text(['(409) 248-2002','info@eastandwestlogistics.com','www.eastandwestlogistics.com','Accounts Office'],W-M,42,{align:'right',lineHeightFactor:1.7});
   doc.setFillColor(...navy);doc.rect(0,122,W,39,'F');font(17,true,[255,255,255]);doc.text('PARTNER SETTLEMENT STATEMENT',M,147);doc.setFillColor(...orange);doc.rect(0,161,W,4,'F');y=189;
  }else{font(11,true,navy);doc.text('EAST WEST LOGISTICS LLC',M,39);font(9);doc.text('Partner Settlement Statement - continued',M,56);y=83;}
 }
 const ensure=h=>{if(y+h>bottom){doc.addPage();header();}};
 function section(title){ensure(58);doc.setFillColor(237,242,247);doc.roundedRect(M,y-13,usable,25,3,3,'F');doc.setFillColor(...orange);doc.rect(M,y-13,3,25,'F');font(10,true,navy);doc.text(title,M+12,y+3);y+=33;}
 function row(label,value){
  font();const lines=doc.splitTextToSize(String(value),usable-207);let continued=false;
  while(lines.length){ensure(29);const chunk=lines.splice(0,Math.max(1,Math.floor((bottom-y-12)/14))),height=Math.max(29,chunk.length*14+12);
   font(9,true);doc.text(label+(continued?' (continued)':''),M+10,y);font(10);doc.text(chunk,M+207,y);y+=height;doc.setDrawColor(225,231,237);doc.line(M+10,y-12,W-M-10,y-12);continued=true;
  }
 }
 const money=(v,currency='PKR')=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+currency;
 header(true);section('STATEMENT DETAILS');
 row('Invoice / reference',settlement.invoiceNumber||'Manual settlement');
 row('Client company',settlement.companyName||'-');row('Prepared for',partner.name||'Partner');
 row('Settlement date',String(settlement.settlementDate||settlement.clearedAt||'').slice(0,10)||'-');
 section('RECEIPTS & DISPATCH');
 if(Number(settlement.invoiceAmountUSD)>0)row('Amount received (USD)',money(settlement.invoiceAmountUSD,'USD'));
 if(Number(settlement.usdRate)>0)row('Exchange rate', '1 USD = '+money(settlement.usdRate));
 row('Company amount received',money(settlement.totalAmountPKR));
 row('Given to dispatch',money(settlement.dispatcherAmountPKR));
 section('YOUR PARTNER SETTLEMENT');
 if(Number.isFinite(Number(partner.percent))&&partner.percent!=null)row('Your partnership share',Number(partner.percent)+'%');
 if(Number(partner.accountsDeductionPKR)>0){row('Your share before accounts fee',money(partner.grossAmountPKR??(Number(partner.amountPKR)+Number(partner.accountsDeductionPKR))));row('Accounts fee from your share',money(partner.accountsDeductionPKR));}
 ensure(65);doc.setFillColor(...navy);doc.roundedRect(M,y-6,usable,52,5,5,'F');doc.setFillColor(...orange);doc.roundedRect(M,y-6,5,52,2,2,'F');font(11,true,[255,255,255]);doc.text('YOUR NET SETTLEMENT',M+16,y+24);font(19,true,[255,255,255]);doc.text(money(partner.amountPKR),W-M-16,y+25,{align:'right'});y+=65;
 ensure(110);if(assets.signature)image(assets.signature,W-M-205,y,195,65);doc.setDrawColor(...navy);doc.line(W-M-210,y+73,W-M,y+73);font(10,true,navy);doc.text('Accounts Office Signature',W-M-210,y+90);y+=110;
 const pages=doc.getNumberOfPages();for(let n=1;n<=pages;n++){doc.setPage(n);doc.setFillColor(...orange);doc.rect(0,H-43,W,3,'F');doc.setFillColor(...navy);doc.rect(0,H-40,W,40,'F');font(8,true,[255,255,255]);doc.text('FREIGHT WITH STRATEGY',M,H-26);font(7,false,[255,255,255]);doc.text('Private partner statement',M,H-16);doc.text('ACCOUNTS OFFICE  |  '+n+' / '+pages,W-M,H-20,{align:'right'});}
 return doc;
}
export async function loadAccountsSignature(){const res=await fetch('/accounts-office-signature.png');if(!res.ok)throw new Error('Accounts signature could not load. Please retry.');return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;res.blob().then(blob=>reader.readAsDataURL(blob),reject);});}
