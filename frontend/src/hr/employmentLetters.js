export const employmentLetterTypes = [
 ['APPOINTMENT','Appointment letter'],['OFFER','Offer letter'],
 ['APPRECIATION','Appreciation letter'],['WARNING','Warning letter'],
 ['TERMINATION','Termination letter'],['EXPERIENCE','Experience letter'],
 ['CONFIRMATION','Employment confirmation letter']
];
export const isHiringLetter = type => ['APPOINTMENT','OFFER'].includes(type);
export function buildEmploymentLetter(f,formatDate){
 const text=key=>String(f[key]||'').trim();
 const requireText=(key,label)=>{if(!text(key))throw new Error('Enter '+label+'.');return text(key);};
 const requireDate=(key,label)=>{const date=formatDate(f[key]);if(!date)throw new Error('Enter a valid '+label+'.');return date;};
 const fields=[['Date',formatDate(f.issueDate)],['Name',f.name],['Position',f.position]];
 let paragraphs=[],acceptance=`I, ${f.name}, acknowledge receipt of this letter.`;
 switch(f.documentType){
 case 'APPRECIATION':
  paragraphs=[`We are pleased to recognize your contribution as ${f.position} at East West Logistics LLC.`,requireText('details','the achievement or contribution being recognized'),'Thank you for your dedication and the positive contribution you make to our team. We look forward to your continued growth and success.'];break;
 case 'WARNING':{
  const level=text('warningLevel')||'Written warning';fields.push(['Warning level',level]);
  if(f.incidentDate)fields.push(['Incident date',requireDate('incidentDate','incident date')]);
  paragraphs=[`This ${level.toLowerCase()} concerns your work as ${f.position} at East West Logistics LLC.`,requireText('details','the specific concern or incident'),`Required improvement: ${requireText('requiredAction','the required improvement or corrective action')}`];
  if(f.reviewDate){fields.push(['Review date',requireDate('reviewDate','review date')]);paragraphs.push(`We will review progress on ${formatDate(f.reviewDate)}. Please contact Human Resources to discuss these concerns or provide your response.`);}
  else paragraphs.push('Please contact Human Resources to discuss these concerns or provide your response.');
  acceptance=`I, ${f.name}, acknowledge receipt of this letter. My signature confirms receipt, not necessarily agreement with its contents.`;break;
 }
 case 'TERMINATION':{
  const date=requireDate('effectiveDate','effective date');fields.push(['Effective date',date]);
  paragraphs=[`This letter confirms that your employment as ${f.position} with East West Logistics LLC will end effective ${date}.`,requireText('details','the termination details'),text('requiredAction')||'Please coordinate with Human Resources regarding handover, return of company property, and any outstanding administrative matters.'];
  if(text('finalPayDetails'))paragraphs.push('Final pay and benefits: '+text('finalPayDetails'));
  acceptance=`I, ${f.name}, acknowledge receipt of this letter. This acknowledgment does not waive any rights.`;break;
 }
 case 'EXPERIENCE':{
  const start=requireDate('joiningDate','service start date'),end=requireDate('endDate','service end date');
  if(f.endDate<f.joiningDate)throw new Error('Service end date cannot precede the start date.');
  fields.push(['Service start',start],['Service end',end]);
  paragraphs=[`This is to confirm that ${f.name} served as ${f.position} at East West Logistics LLC from ${start} to ${end}.`,requireText('details','the duties and experience to certify'),'We thank you for your service and wish you success in your future endeavors.'];break;
 }
 case 'CONFIRMATION':{
  const date=requireDate('effectiveDate','confirmation date');fields.push(['Effective date',date]);
  paragraphs=[`We are pleased to confirm your employment as ${f.position} at East West Logistics LLC, effective ${date}.`];
  if(text('details'))paragraphs.push(text('details'));
  paragraphs.push('We appreciate your contribution and look forward to continuing to work together.');break;
 }
 default:throw new Error('Choose a valid letter type.');
 }
 if(text('extraTerms'))paragraphs.push(...text('extraTerms').split(/\n\s*\n/));
 if(text('customBody'))paragraphs=text('customBody').split(/\n\s*\n/);
 if(paragraphs.join('\n').length>12000)throw new Error('Keep the letter body within 12,000 characters.');
 return {title:employmentLetterTypes.find(([type])=>type===f.documentType)[1].toUpperCase(),fields,paragraphs,name:f.name,signatoryName:text('signatoryName'),signatoryTitle:text('signatoryTitle')||'Human Resources Department',acceptance,filename:`${f.documentType.toLowerCase()}-${f.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'letter'}.pdf`};
}
