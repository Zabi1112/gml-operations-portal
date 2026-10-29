import {jsPDF} from 'jspdf';
// Build only these fields. No other partner names, notes, or split tables enter this PDF.
export function createPartnerStatementPdf(settlement,partner,assets={}){
 const doc=new jsPDF({unit:'pt',format:'a4'}),margin=42,width=doc.internal.pageSize.getWidth(),bottom=780;let y=50;
 const font=(size=11,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(25,46,63);};
 const header=()=>{doc.setFillColor(12,51,80);doc.rect(0,0,width,12,'F');font(18,true);doc.text('Partner Settlement Statement',margin,50);font(10);doc.text('EAST WEST LOGISTICS LLC',margin,70);y=105;};
 const ensure=h=>{if(y+h>bottom){doc.addPage();header();}};
 const row=(label,value)=>{
   font(); const lines=doc.splitTextToSize(String(value),width-margin*2-190);
   let continued=false;
   while(lines.length){
     ensure(30);
     const count=Math.max(1,Math.floor((bottom-y-12)/15));
     const chunk=lines.splice(0,count),h=Math.max(30,chunk.length*15+12);
     font(10,true);doc.text(continued?label+' (continued)':label,margin,y);
     font();doc.text(chunk,margin+190,y);y+=h;
     doc.setDrawColor(225);doc.line(margin,y-10,width-margin,y-10);
     continued=true;
   }
 };
 header();row('Invoice / reference',settlement.invoiceNumber||'Manual settlement');row('Company',settlement.companyName||'-');row('Partner',partner.name||'Partner');row('Settlement date',settlement.settlementDate?String(settlement.settlementDate).slice(0,10):'-');
 const money=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' PKR';
 row('Company amount received',money(settlement.totalAmountPKR));row('Given to dispatch',money(settlement.dispatcherAmountPKR));row('Your partner share',money(partner.amountPKR));
 if(Number(partner.accountsDeductionPKR)>0)row('Accounts fee from your share',money(partner.accountsDeductionPKR));
 ensure(125);if(assets.signature){const p=doc.getImageProperties(assets.signature),scale=Math.min(200/p.width,80/p.height);doc.addImage(assets.signature,p.fileType,width-margin-210,y,scale*p.width,scale*p.height);y+=85;}font(10,true);doc.text('Accounts Office Signature',width-margin-210,y+15);
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);font(9);doc.text('Private partner statement',margin,815);doc.text(String(page)+' / '+doc.getNumberOfPages(),width-margin,815,{align:'right'});}
 return doc;
}
export async function loadAccountsSignature(){const res=await fetch('/accounts-office-signature.png');if(!res.ok)throw new Error('Accounts signature could not load. Please retry.');return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;res.blob().then(blob=>reader.readAsDataURL(blob),reject);});}
