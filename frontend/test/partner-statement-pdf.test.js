import test from 'node:test';import assert from 'node:assert/strict';import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';import {createPartnerStatementPdf} from '../src/finance/partnerStatementPdf.js';
test('individual partner PDF uses A4 and contains only intended private statement fields',async()=>{const doc=createPartnerStatementPdf({invoiceNumber:'TEST-123',companyName:'Sample Company',totalAmountPKR:10000,dispatcherAmountPKR:2500,settlementDate:'2026-10-29',notes:'SECRET NOTE',partnerSplits:[{name:'OTHER PRIVATE PARTNER'}]},{name:'Selected Partner',amountPKR:1125});const task=getDocument({data:new Uint8Array(doc.output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;let text='';for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);assert.ok(Math.abs(page.view[3]-841.89)<1);for(const item of (await page.getTextContent()).items){text+=item.str+' ';assert.ok(item.transform[5]>=15&&item.transform[5]<=835,'Text remains inside A4 page');}}assert.match(text,/Selected Partner/);assert.match(text,/1,125.00 PKR/);assert.match(text,/EASTWEST/);assert.match(text,/LOGISTICS/);assert.match(text,/\+92 344 6060933/);assert.match(text,/Accounts Office Signature/);assert.doesNotMatch(text,/SECRET|OTHER PRIVATE|LOGISTICS LLC/);await task.destroy();});

test('long partner statement text continues on new pages without clipping',async()=>{const doc=createPartnerStatementPdf({companyName:'Long company name '.repeat(500)},{name:'Partner',amountPKR:1});const task=getDocument({data:new Uint8Array(doc.output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;assert.ok(pdf.numPages>1);for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);for(const item of (await page.getTextContent()).items)assert.ok(item.transform[5]>15&&item.transform[5]<835);}await task.destroy();});

test('partner PDF gross excludes received invoice fees in USD and PKR without exposing them',async()=>{
 const doc=createPartnerStatementPdf({invoiceAmountUSD:2500,totalAmountPKR:700000,usdRate:280,dispatcherAmountPKR:156800,paymentAllocations:[{amountUSD:2500,accountsFeeUSD:260}]},{name:'Partner',amountPKR:100000});
 const task=getDocument({data:new Uint8Array(doc.output('arraybuffer')),useSystemFonts:true});
 const pdf=await task.promise;let text='';
 for(let n=1;n<=pdf.numPages;n++)for(const item of (await (await pdf.getPage(n)).getTextContent()).items)text+=item.str+' ';
 assert.match(text,/2,240.00 USD/);assert.match(text,/627,200.00 PKR/);
 assert.doesNotMatch(text,/2,500.00|700,000.00|260.00|72,800.00|Invoice accounts fee/);
 await task.destroy();
});


test('partner PDF never includes Accountants names or payments',async()=>{
 const doc=createPartnerStatementPdf({invoiceAmountUSD:2500,totalAmountPKR:700000,usdRate:280,accountsAmountPKR:72800,paymentAllocations:[{accountsFeeUSD:260,accountantsSplits:[{name:'PRIVATE TEAM MEMBER',amountPKR:72800}]}]},{name:'Partner',amountPKR:100000});
 const task=getDocument({data:new Uint8Array(doc.output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;let text='';
 for(let n=1;n<=pdf.numPages;n++)for(const item of (await (await pdf.getPage(n)).getTextContent()).items)text+=item.str+' ';
 assert.match(text,/2,240.00 USD/);assert.match(text,/100,000.00 PKR/);
 assert.doesNotMatch(text,/PRIVATE TEAM|72,800.00|accounts fee allocation/);await task.destroy();
});
