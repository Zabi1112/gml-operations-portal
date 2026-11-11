import {jsPDF} from 'jspdf';
import {optionMessage,validateOption} from './model.js';
export function optionPdf(form,logo,source='Manually entered miles'){
 validateOption(form);const doc=new jsPDF({unit:'pt',format:'a4',compress:true}),W=595.28,M=44;let y=158;
 const font=(size,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(13,48,76);};
 const header=()=>{doc.setFillColor(13,48,76);doc.rect(0,0,W,12,'F');if(logo){const p=doc.getImageProperties(logo),scale=Math.min(70/p.width,70/p.height);doc.addImage(logo,p.fileType,M,26,p.width*scale,p.height*scale);}font(19,true);doc.text('EAST WEST LOGISTICS LLC',128,52);font(10);doc.text('LOAD OPTION | Dispatch proposal',128,75);doc.setFillColor(232,91,23);doc.rect(M,112,W-M*2,4,'F');};
 header();for(const line of optionMessage(form).split('\n')){font(11);for(const part of doc.splitTextToSize(line,W-M*2)){if(y>747){doc.addPage();header();y=158;}doc.text(part,M,y);y+=18;}y+=3;}
 font(8);for(const line of doc.splitTextToSize(source+' | Mileage is an estimate. Verify the route, truck restrictions and broker before booking.',W-M*2)){if(y>770){doc.addPage();header();y=158;}doc.text(line,M,y);y+=12;}
 for(let n=1;n<=doc.getNumberOfPages();n++){doc.setPage(n);font(8);doc.text('Prepared load option - not a rate confirmation',M,815);doc.text(n+' / '+doc.getNumberOfPages(),W-M,815,{align:'right'});}return doc;
}
