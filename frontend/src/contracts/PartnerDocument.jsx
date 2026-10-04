import { jsPDF } from 'jspdf';
export function downloadPartnerAgreement(record) {
 const pdf = new jsPDF();
 const clean = value => String(value).replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
 let y = 22;
 function line(text, bold = false) {
  pdf.setFont('helvetica',bold ? 'bold' : 'normal'); pdf.setFontSize(bold ? 12 : 10);
  for (const part of pdf.splitTextToSize(clean(text),174)) {
   if(y > 276) { pdf.addPage(); y = 22; }
   pdf.text(part,18,y); y += 5;
  }
  y += 3;
 }
 line(record.status === 'SIGNED' ? 'FULLY SIGNED - BOTH PARTNERS' : `${record.status.replaceAll('_',' ')} - NOT FULLY EXECUTED`,true);
 for(const paragraph of record.termsText.split('\n\n')) line(paragraph);
 line('ELECTRONIC SIGNATURE RECEIPTS',true);
 for(const role of ['manager','silent']) {
  const s = record.signatures?.[role];
  line(`${role === 'manager' ? 'Managing member (85%)' : 'Silent member (15%)'}: ${s ? s.name : 'Not signed'}`,true);
  if(s) { line(`Signed: ${s.signedAt}\n${s.documentType === 'DRIVING_LICENSE' ? 'Driving licence' : 'Passport'}: ****${s.passportLast4}; issuing country / state: ${s.passportCountry}\nConsent: ${s.consentVersion}\nDocument SHA-256: ${s.documentHash}`); }
 }
 line(`Agreement ${record.id || 'preview'} | Document SHA-256: ${record.documentHash}`);
 line('Private identity document scans and full document numbers are not included. Identity documents were submitted by signers; the portal does not independently verify identity.');
 const count = pdf.getNumberOfPages();
 for(let page=1;page<=count;page++) { pdf.setPage(page); pdf.setFontSize(8); pdf.setTextColor(110); pdf.text(`Partner agreement ${record.id || 'preview'} | ${page} / ${count}`,18,289); }
 pdf.save(`partner-agreement-${record.id || 'preview'}-${record.status.toLowerCase()}.pdf`);
}
export default function PartnerDocument({record}) {
 return <section className="contract-card"><div className="partner-heading"><h3>Agreement {record.id ? `#${record.id}` : 'preview'}</h3><span className="partner-badge">{record.status.replaceAll('_',' ')}</span></div>
 <button type="button" onClick={() => downloadPartnerAgreement(record)}>Download agreement PDF</button>
 <pre className="partner-document">{record.termsText}</pre>
 <div className="contract-grid">{['manager','silent'].map(role => { const s=record.signatures?.[role]; return <div className="partner-receipt" key={role}><strong>{role === 'manager' ? 'Managing member · 85%' : 'Silent member · 15%'}</strong><p>{s ? `${s.name} — Signed ${new Date(s.signedAt).toLocaleString()}` : 'Awaiting signature'}</p>{s && <small>{s.documentType === 'DRIVING_LICENSE' ? 'Driving licence' : 'Passport'} ****{s.passportLast4} · {s.passportCountry}</small>}</div>; })}</div>
 <p className="partner-hash">Document SHA-256: {record.documentHash}</p></section>;
}
