import {jsPDF} from 'jspdf';
import {accountsTeamSummary} from './invoiceAccountsFees.js';
export function createAccountsTeamPdf(settlement) {
  const doc=new jsPDF({unit:'pt',format:'a4'});
  const summary=accountsTeamSummary(settlement);
  let y=48;
  function header(){doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('EASTWEST Logistics',42,y);y+=27;doc.setFontSize(14);doc.text('Accounts Team Settlement',42,y);y+=32;doc.setFont('helvetica','normal');doc.setFontSize(10);}
  function row(label,value){
    const lines=doc.splitTextToSize(String(label),280);
    for(let i=0;i<lines.length;i++){
      if(y>760){doc.addPage();y=48;header();}
      doc.text(lines[i],42,y);if(i===0)doc.text(String(value),553,y,{align:'right'});y+=16;
    }
    y+=10;
  }
  const money=value=>Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' PKR';
  header();
  row('Invoice / reference',settlement.invoiceNumber||'Manual settlement');
  row('Clearance date',String(settlement.settlementDate||settlement.clearedAt||'').slice(0,10)||'-');
  row('Total received by Accounts Team',money(summary.totalPKR));
  for(const split of summary.splits)row(split.name,money(split.amountPKR));
  if(summary.unassignedPKR>0)row('Accounts Team - unassigned',money(summary.unassignedPKR));
  return doc;
}
