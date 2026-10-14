import {jsPDF} from 'jspdf';
export function createLetterPdf(letter,logo) {
 const doc=new jsPDF({unit:'pt',format:'a4'}),W=595.28,H=841.89,M=44,usable=W-2*M;
 const navy=[10,49,83],orange=[239,95,22];let y=0;
 const font=(size=10.5,bold=false,color=[25,34,48])=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);};
 function frame(first=false){
  doc.setFillColor(...navy);doc.rect(0,0,W,12,'F');doc.setFillColor(...orange);doc.triangle(0,12,86,12,0,84,'F');
  if(first){
   let hasLogo=false;if(logo)try{const p=doc.getImageProperties(logo),scale=Math.min(100/p.width,85/p.height);doc.addImage(logo,p.fileType,M,30,p.width*scale,p.height*scale);hasLogo=true;}catch{/* Keep the text letterhead if logo loading fails. */}
   const x=hasLogo?M+110:M;font(22,true,navy);doc.text('EAST WEST',x,57);font(16,true,orange);doc.text('LOGISTICS LLC',x,78);font(8,true,navy);doc.text('TRUCK DISPATCHING & SOLUTIONS',x,96);
   font(8.5,false,navy);doc.text(['(409) 248-2002','info@eastandwestlogistics.com','www.eastandwestlogistics.com','Human Resources Department'],W-M,43,{align:'right',lineHeightFactor:1.55});
   doc.setFillColor(...navy);doc.rect(0,128,W,36,'F');font(16,true,[255,255,255]);doc.text(letter.title,M,151);doc.setFillColor(...orange);doc.rect(0,164,W,4,'F');y=192;
  }else{font(10,true,navy);doc.text('EAST WEST LOGISTICS LLC | HUMAN RESOURCES',M,40);font(9);doc.text(letter.title+' - continued',M,57);y=80;}
 }
 const ensure=height=>{if(y+height>H-74){doc.addPage();frame();}};
 function paragraph(text){font();for(const line of doc.splitTextToSize(text,usable)){ensure(14);font();doc.text(line,M,y);y+=14;}y+=8;}
 frame(true);
 for(const [label,value] of letter.fields){font();const lines=doc.splitTextToSize(value,usable-130);ensure(Math.max(17,lines.length*13+4));font(10,true,navy);doc.text(label,M,y);font(10);doc.text(lines,M+130,y);y+=Math.max(17,lines.length*13+4);}
 y+=12;paragraph('Dear '+letter.name+',');for(const p of letter.paragraphs)paragraph(p);
 font();const acceptanceLines=doc.splitTextToSize(letter.acceptance,usable/2-22);
 font(9);const signerLines=[letter.signatoryName,letter.signatoryTitle,'East West Logistics LLC'].filter(Boolean).flatMap(text=>doc.splitTextToSize(text,205));
 const signatureHeight=22+Math.max(45,acceptanceLines.length*14+12)+Math.max(48,29+signerLines.length*12);ensure(signatureHeight);
 paragraph('Best regards,');const top=y;const right=M+usable/2+18;
 font();doc.text(acceptanceLines,right,top);doc.setDrawColor(80,96,112);doc.setLineWidth(.6);
 const baseline=top+Math.max(45,acceptanceLines.length*14+12);doc.line(M,baseline,M+205,baseline);doc.line(right,baseline,W-M,baseline);
 font(10,true,navy);doc.text('Authorized HR Signature',M,baseline+15);doc.text('Recipient Signature',right,baseline+15);
 font(9);let leftY=baseline+29;for(const line of signerLines){doc.text(line,M,leftY);leftY+=12;}
 doc.text('Date: ____________________',right,baseline+34);
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFillColor(...navy);doc.rect(0,H-38,W,38,'F');doc.setFillColor(...orange);doc.rect(0,H-42,W,4,'F');font(9,true,[255,255,255]);doc.text('FREIGHT WITH STRATEGY',M,H-16);font(8,false,[255,255,255]);doc.text('HUMAN RESOURCES  |  '+i+' / '+pages,W-M,H-16,{align:'right'});}
 return doc;
}
export async function loadLetterLogo(){try{const response=await fetch('/east-west-logo.png');if(!response.ok)return null;const blob=await response.blob();return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>resolve(null);reader.readAsDataURL(blob);});}catch{return null;}}
