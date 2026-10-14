export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export const initialLetter = () => ({kind:'INTERNSHIP',documentType:'APPOINTMENT',name:'',position:'Sales & Dispatch Intern',issueDate:localDate(),joiningDate:'',duration:'3',durationUnit:'months',paid:false,amount:'',currency:'PKR',payFrequency:'month',location:'',hours:'',training:'Truck Dispatching, Sales, and Professional Communication',assessment:true,signatoryName:'',signatoryTitle:'Human Resources Department',extraTerms:'',customBody:''});
export function formatLetterDate(value) {
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');
  if(!match) return '';
  const [,year,month,day]=match.map(Number), date=new Date(year,month-1,day);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day) return '';
  return date.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
}
export function buildLetter(form) {
  const f={...form,name:String(form.name||'').trim(),position:String(form.position||'').trim()};
  if(!['INTERNSHIP','JOB'].includes(f.kind)||!['APPOINTMENT','OFFER'].includes(f.documentType)) throw new Error('Choose a valid letter type.');
  if(!f.name||!f.position) throw new Error('Enter the recipient name and position.');
  if(!formatLetterDate(f.issueDate)||!formatLetterDate(f.joiningDate)) throw new Error('Enter valid issue and joining dates.');
  const internship=f.kind==='INTERNSHIP';
  if(internship&&(!/^\d+$/.test(String(f.duration))||Number(f.duration)<1||Number(f.duration)>60||!['weeks','months'].includes(f.durationUnit))) throw new Error('Enter an internship duration of 1 to 60 weeks or months.');
  const paid=!internship||f.paid;
  if(paid&&(!/^\d+(\.\d{1,2})?$/.test(String(f.amount))||!Number.isFinite(Number(f.amount))||Number(f.amount)<=0||Number(f.amount)>100000000)) throw new Error('Enter a positive salary or stipend (up to two decimal places).');
  if(!['PKR','USD'].includes(f.currency)||!['month','week','hour'].includes(f.payFrequency)) throw new Error('Choose a valid currency and payment frequency.');
  const compensation=paid?`${f.currency} ${Number(f.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} per ${f.payFrequency}`:'Unpaid';
  const duration=`${Number(f.duration)} ${Number(f.duration)===1?f.durationUnit.slice(0,-1):f.durationUnit}`;
  const title=`${internship?'INTERNSHIP':'EMPLOYMENT'} ${f.documentType==='OFFER'?'OFFER':'APPOINTMENT'} LETTER`;
  const fields=[['Date',formatLetterDate(f.issueDate)],['Name',f.name],['Position',f.position],['Joining date',formatLetterDate(f.joiningDate)]];
  if(internship) fields.push(['Internship duration',duration]);
  fields.push([internship?'Stipend':'Salary',compensation]);
  if(f.location.trim()) fields.push(['Work location',f.location.trim()]);
  if(f.hours.trim()) fields.push(['Working hours',f.hours.trim()]);
  const opening=f.documentType==='OFFER'?'We are pleased to offer you':'We are pleased to confirm your appointment to';
  let paragraphs=internship?[
    `${f.documentType==='OFFER'?'We are pleased to offer you an internship opportunity as':'We are pleased to confirm your appointment as'} ${f.position} at East West Logistics LLC${f.assessment?' under our Internship-to-Employment Program':''}.`,
    `Your internship will be for a period of ${duration} and will ${paid?`include a stipend of ${compensation}`:'be unpaid'}.${f.training.trim()?` During this period, you will receive practical training in ${f.training.trim()}.`:''}`
  ]:[`${opening} the position of ${f.position} at East West Logistics LLC, starting on ${formatLetterDate(f.joiningDate)}.`,`Your salary will be ${compensation}.`];
  if(internship&&f.assessment) paragraphs.push('Upon completion of your internship, you will be required to pass a Dispatch and Communication Assessment to qualify for employment. If you do not pass, you may continue your internship and retake the assessment after one month.',`You may also request to take the assessment before completing the ${duration} internship. If you successfully pass and a position is available, you may be offered employment immediately without completing the remaining internship period.`,'Successful candidates will receive a separate Employment Confirmation Letter, outlining their position and compensation terms.');
  if(f.extraTerms.trim()) paragraphs.push(...f.extraTerms.trim().split(/\n\s*\n/));
  paragraphs.push('We welcome you to East West Logistics LLC and wish you success in your professional journey.');
  if(f.customBody.trim()) paragraphs=f.customBody.trim().split(/\n\s*\n/);
  if(paragraphs.join('\n').length>12000) throw new Error('Keep the letter body within 12,000 characters.');
  return {title,fields,paragraphs,name:f.name,signatoryName:f.signatoryName.trim(),signatoryTitle:f.signatoryTitle.trim()||'Human Resources Department',acceptance:`I, ${f.name}, accept this ${internship?'internship':'employment'} ${f.documentType==='OFFER'?'offer':'appointment'} and its stated terms.`,filename:`${internship?'internship':'employment'}-${f.documentType.toLowerCase()}-${f.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'letter'}.pdf`};
}
