import test from 'node:test';import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createAccountsTeamPdf,createAccountantsPdf} from '../src/finance/accountsTeamPdf.js';
import {accountsTeamSummary,accountantsSummary} from '../src/finance/invoiceAccountsFees.js';
const settlement={invoiceNumber:'INV-123',accountsAmountPKR:93520,usdRate:280,paymentAllocations:[{accountsFeeUSD:260,accountantsSplits:[{name:'Ali',amountPKR:60000},{name:'Sara',amountPKR:10000}]}],partnerSplits:[{name:'SECRET PARTNER',amountPKR:134680}],notes:'PRIVATE NOTE'};
async function pdfText(doc){const task=getDocument({data:new Uint8Array(doc.output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;let text='';for(let n=1;n<=pdf.numPages;n++)for(const item of (await (await pdf.getPage(n)).getTextContent()).items)text+=item.str+' ';await task.destroy();return text;}
test('Accountants and Accounts Team totals never mix',()=>{
 assert.equal(accountantsSummary(settlement).totalPKR,72800);assert.equal(accountantsSummary(settlement).unassignedPKR,2800);
 assert.equal(accountsTeamSummary(settlement).totalPKR,20720);assert.deepEqual(accountsTeamSummary(settlement).splits,[]);
});
test('Accountants PDF contains only invoice fee receipts and accountant names',async()=>{
 const text=await pdfText(createAccountantsPdf(settlement));
 for(const expected of ['Accountants Settlement','Ali','Sara','72,800.00 PKR','2,800.00 PKR'])assert.ok(text.includes(expected));
 assert.doesNotMatch(text,/93,520|20,720|SECRET PARTNER|PRIVATE NOTE|134,680/);
});
test('Accounts Team PDF contains only the deduction from partner shares',async()=>{
 const text=await pdfText(createAccountsTeamPdf(settlement));assert.match(text,/20,720.00 PKR/);
 assert.doesNotMatch(text,/Ali|Sara|72,800|93,520|SECRET PARTNER/);
});
test('Accountants PDF paginates long lists without clipping',async()=>{
 const splits=Array.from({length:100},(_,i)=>({name:'Accountant '+i,amountPKR:10}));
 const task=getDocument({data:new Uint8Array(createAccountantsPdf({accountsAmountPKR:1000,usdRate:100,paymentAllocations:[{accountsFeeUSD:10,accountantsSplits:splits}]}).output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;
 assert.ok(pdf.numPages>1);for(let n=1;n<=pdf.numPages;n++)for(const item of (await (await pdf.getPage(n)).getTextContent()).items)assert.ok(item.transform[5]>40&&item.transform[5]<810);await task.destroy();
});
test('manual or legacy settlements without invoice fees belong only to Accounts Team',()=>{
 assert.deepEqual(accountsTeamSummary({accountsAmountPKR:100}),{splits:[],totalPKR:100,unassignedPKR:100});
 assert.equal(accountantsSummary({accountsAmountPKR:100}).totalPKR,0);
});
