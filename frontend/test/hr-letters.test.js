import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLetter,buildLetter,formatLetterDate} from '../src/hr/letterModel.js';
import {createLetterPdf} from '../src/hr/letterPdf.js';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const fixture=()=>({...initialLetter(),name:'Maryam Naeem',issueDate:'2026-10-09',joiningDate:'2026-10-12'});
async function inspect(doc){const task=getDocument({data:new Uint8Array(doc.output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;const pages=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);pages.push((await page.getTextContent()).items);}await task.destroy();return pages;}
test('internship template matches sample and supports paid/unpaid duration changes',()=>{const base=buildLetter(fixture());assert.equal(base.title,'INTERNSHIP APPOINTMENT LETTER');assert.match(base.paragraphs.join(' '),/be unpaid/);assert.match(base.paragraphs.join(' '),/retake the assessment after one month/);const paid=buildLetter({...fixture(),paid:true,amount:'25000',duration:'6',durationUnit:'weeks'});assert.match(paid.paragraphs.join(' '),/PKR 25,000.00 per month/);assert.match(paid.paragraphs.join(' '),/6 weeks/);assert.doesNotMatch(paid.paragraphs.join(' '),/be unpaid|three.month/);});
test('job offer requires salary and has no internship assessment language',()=>{assert.throws(()=>buildLetter({...fixture(),kind:'JOB'}),/salary/);const letter=buildLetter({...fixture(),kind:'JOB',documentType:'OFFER',position:'Dispatcher',amount:'80000'});assert.equal(letter.title,'EMPLOYMENT OFFER LETTER');assert.match(letter.paragraphs.join(' '),/80,000.00/);assert.doesNotMatch(letter.paragraphs.join(' '),/internship|Assessment/);});
test('required dates and amounts are validated; custom body explicitly replaces generated wording',()=>{assert.equal(formatLetterDate('2026-02-30'),'');assert.throws(()=>buildLetter({...fixture(),name:''}),/recipient/);assert.throws(()=>buildLetter({...fixture(),paid:true,amount:'-4'}),/positive/);assert.throws(()=>buildLetter({...fixture(),paid:true,amount:'1.234'}),/positive/);assert.deepEqual(buildLetter({...fixture(),customBody:'Custom paragraph one.\n\nCustom paragraph two.'}).paragraphs,['Custom paragraph one.','Custom paragraph two.']);});
test('default PDF is A4 with sample wording, signatures, and a readable one-page layout',async()=>{const doc=createLetterPdf(buildLetter(fixture()));const pages=await inspect(doc);assert.equal(pages.length,1);const text=pages.flat().map(x=>x.str).join(' ');for(const term of ['Maryam Naeem','INTERNSHIP APPOINTMENT LETTER','Authorized HR Signature','Recipient Signature','October 12, 2026','Unpaid'])assert.ok(text.includes(term),term);assert.equal(Math.round(doc.internal.pageSize.getWidth()),595);});
test('long letters paginate with all text above the footer and signatures together',async()=>{const f={...fixture(),name:'A Very Long Recipient Name With Several Family Names For The Preview Test',signatoryName:'HR Representative With A Long Name',signatoryTitle:'Human Resources and Recruitment Department',customBody:Array.from({length:35},(_,i)=>`Paragraph ${i+1}. `+'Training and communication responsibilities will be discussed with your reporting manager. '.repeat(3)).join('\n\n')};const doc=createLetterPdf(buildLetter(f));const pages=await inspect(doc);assert.ok(pages.length>1);assert.ok(pages.at(-1).some(x=>x.str==='Recipient Signature'));assert.ok(pages.at(-1).some(x=>x.str==='Authorized HR Signature'));assert.ok(pages.flat().some(x=>x.str.includes('Paragraph 35.')));for(const page of pages)for(const item of page){if(item.str.trim()&&!item.str.includes('FREIGHT WITH STRATEGY')&&!/^HUMAN RESOURCES\s+\|/.test(item.str))assert.ok(item.transform[5]>60,`Text overlaps footer: ${item.str}`);}});

test('additional HR letters require only their own details and use appropriate acknowledgment',()=>{
 for(const documentType of ['APPRECIATION','WARNING','TERMINATION','EXPERIENCE','CONFIRMATION']){
  const letter=buildLetter({...fixture(),documentType,kind:'JOB',amount:'',joiningDate:documentType==='EXPERIENCE'?'2026-01-01':'',endDate:'2026-10-29',effectiveDate:'2026-10-30',details:'Specific employee contribution or circumstances.',requiredAction:'Discuss the improvement plan with the manager.'});
  assert.ok(letter.title.includes(documentType==='CONFIRMATION'?'CONFIRMATION':documentType));
  assert.doesNotMatch(letter.paragraphs.join(' '),/stipend|be unpaid|Assessment/);
  assert.match(letter.acceptance,/acknowledge receipt/);
 }
 assert.throws(()=>buildLetter({...fixture(),documentType:'WARNING',details:'Incident'}),/corrective action/);
 assert.throws(()=>buildLetter({...fixture(),documentType:'TERMINATION',details:'Details'}),/effective date/);
 assert.throws(()=>buildLetter({...fixture(),documentType:'EXPERIENCE',endDate:'2020-01-01',details:'Duties'}),/precede/);
});
test('all additional HR letter PDFs include correct titles and no offer acceptance language',async()=>{
 for(const documentType of ['APPRECIATION','WARNING','TERMINATION','EXPERIENCE','CONFIRMATION']){
  const letter=buildLetter({...fixture(),documentType,details:'Specific facts entered by HR.',requiredAction:'Attend the scheduled review.',effectiveDate:'2026-10-30',endDate:'2026-10-29'});
  const pages=await inspect(createLetterPdf(letter));const text=pages.flat().map(x=>x.str).join(' ');
  assert.ok(text.includes(letter.title));assert.match(text,/acknowledge receipt/);assert.doesNotMatch(text,/accept this/);
 }
});
