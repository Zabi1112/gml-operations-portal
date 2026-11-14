import test from 'node:test';import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createAccountsTeamPdf} from '../src/finance/accountsTeamPdf.js';
import {accountsTeamSummary} from '../src/finance/invoiceAccountsFees.js';
test('Accounts Team PDF includes team names, received total and unassigned balance only',async()=>{
 const settlement={invoiceNumber:'INV-123',accountsAmountPKR:93520,paymentAllocations:[{accountsTeamSplits:[{name:'Ali',amountPKR:60000},{name:'Sara',amountPKR:20000}]}],partnerSplits:[{name:'SECRET PARTNER',amountPKR:134680}],notes:'PRIVATE NOTE'};
 assert.equal(accountsTeamSummary(settlement).unassignedPKR,13520);
 const task=getDocument({data:new Uint8Array(createAccountsTeamPdf(settlement).output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;let text='';
 for(let n=1;n<=pdf.numPages;n++)for(const item of (await (await pdf.getPage(n)).getTextContent()).items)text+=item.str+' ';
 for(const expected of ['Accounts Team Settlement','Ali','Sara','93,520.00 PKR','13,520.00 PKR'])assert.ok(text.includes(expected));
 assert.doesNotMatch(text,/SECRET PARTNER|PRIVATE NOTE|134,680/);await task.destroy();
});
test('Accounts Team PDF paginates a long list without clipping',async()=>{
 const splits=Array.from({length:100},(_,i)=>({name:'Accounts member '+i,amountPKR:10}));
 const task=getDocument({data:new Uint8Array(createAccountsTeamPdf({accountsAmountPKR:1000,paymentAllocations:[{accountsTeamSplits:splits}]}).output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;
 assert.ok(pdf.numPages>1);for(let n=1;n<=pdf.numPages;n++)for(const item of (await (await pdf.getPage(n)).getTextContent()).items)assert.ok(item.transform[5]>40&&item.transform[5]<810);
 await task.destroy();
});
test('older settlements without team detail still report their Accounts total',()=>{
 assert.deepEqual(accountsTeamSummary({accountsAmountPKR:100}),{splits:[],totalPKR:100,unassignedPKR:100});
});
