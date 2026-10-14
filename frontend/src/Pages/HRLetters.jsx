import LetterPdfPreview from "../hr/LetterPdfPreview";
﻿import {useContext,useEffect,useRef,useState} from 'react';
import Layout from '../components/Layout';
import {BranchContext} from '../context/BranchContext';
import {initialLetter,buildLetter} from '../hr/letterModel';
import {createLetterPdf,loadLetterLogo} from '../hr/letterPdf';
import '../hr/hrLetters.css';

export default function HRLetters(){
 const {selectedBranch}=useContext(BranchContext);
 const [form,setForm]=useState(initialLetter),[error,setError]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(null),[dirty,setDirty]=useState(false);
 const previewUrl=useRef(null),branchId=useRef(selectedBranch?.id);
 const internship=form.kind==='INTERNSHIP',paid=!internship||form.paid,editable=!!selectedBranch?.isActive;
 useEffect(()=>()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);},[]);
 useEffect(()=>{if(branchId.current!==selectedBranch?.id){branchId.current=selectedBranch?.id;setForm(initialLetter());setPreview(null);setDirty(false);setError('');if(previewUrl.current){URL.revokeObjectURL(previewUrl.current);previewUrl.current=null;}}},[selectedBranch?.id]);
 function update(key,value){setForm(f=>({...f,[key]:value}));setDirty(true);setError('');}
 const input=(key,label,type='text',required=false,maxLength=160)=><label>{label}<input name={key} type={type} value={form[key]} required={required} maxLength={maxLength} onChange={e=>update(key,e.target.value)} /></label>;
 async function generate(e){e.preventDefault();if(!editable||busy)return;setError('');setBusy(true);try{
  const letter=buildLetter(form),doc=createLetterPdf(letter,await loadLetterLogo());
  const url=URL.createObjectURL(doc.output('blob'));if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=url;setPreview({url,filename:letter.filename,pages:doc.getNumberOfPages()});setDirty(false);
  if(e.nativeEvent.submitter?.value==='download')doc.save(letter.filename);
 }catch(err){setError(err.message||'Could not generate the letter.');}finally{setBusy(false);}}
 let bodyPreview='';try{bodyPreview=buildLetter({...form,customBody:''}).paragraphs.join('\n\n');}catch{/* Show sample wording once the required fields are ready. */}
 return <Layout title="HR Letters"><div className="hr-letters">
  <header className="hr-hero"><div><span>HUMAN RESOURCES</span><h1>A professional welcome, ready to send.</h1><p>Create job and internship offers or appointment letters on East West Logistics letterhead.</p></div><b>OFFER & APPOINTMENT LETTERS</b></header>
  {!editable&&<p role="status" className="hr-alert">Select an active branch to prepare a letter.</p>}
  {error&&<p className="hr-alert" role="alert">{error}</p>}
  <div className="hr-workspace"><form className="hr-card" onSubmit={generate}><fieldset disabled={!editable||busy}>
   <h2>1. Choose your letter</h2><div className="hr-fields"><label>Engagement<select value={form.kind} onChange={e=>{update('kind',e.target.value);update('position',e.target.value==='INTERNSHIP'?'Sales & Dispatch Intern':'');}}><option value="INTERNSHIP">Internship</option><option value="JOB">Job / Employment</option></select></label><label>Letter type<select value={form.documentType} onChange={e=>update('documentType',e.target.value)}><option value="APPOINTMENT">Appointment letter</option><option value="OFFER">Offer letter</option></select></label></div>
   <h2>2. Recipient & dates</h2><div className="hr-fields">{input('name','Recipient full name','text',true,120)}{input('position','Position / job title','text',true,120)}{input('issueDate','Letter date','date',true)}{input('joiningDate','Joining date','date',true)}{input('location','Work location (optional)')}{input('hours','Working hours (optional)')}</div>
   <h2>3. Compensation & duration</h2>
   {internship&&<><div className="hr-fields"><label>Duration<input type="number" min="1" max="60" step="1" value={form.duration} required onChange={e=>update('duration',e.target.value)}/></label><label>Duration unit<select value={form.durationUnit} onChange={e=>update('durationUnit',e.target.value)}><option value="months">Months</option><option value="weeks">Weeks</option></select></label></div><label>Internship compensation<select value={form.paid?'paid':'unpaid'} onChange={e=>update('paid',e.target.value==='paid')}><option value="unpaid">Unpaid internship</option><option value="paid">Paid internship</option></select></label></>}
   {paid&&<div className="hr-fields"><label>{internship?'Stipend':'Salary'} amount<input name="amount" type="number" min="0.01" max="100000000" step="0.01" required value={form.amount} onChange={e=>update('amount',e.target.value)}/></label><label>Currency<select value={form.currency} onChange={e=>update('currency',e.target.value)}><option>PKR</option><option>USD</option></select></label><label>Paid per<select value={form.payFrequency} onChange={e=>update('payFrequency',e.target.value)}><option value="month">Month</option><option value="week">Week</option><option value="hour">Hour</option></select></label></div>}
   <h2>4. Letter wording</h2>
   {internship&&<>{input('training','Training areas')}<label className="hr-check"><input type="checkbox" checked={form.assessment} onChange={e=>update('assessment',e.target.checked)}/> Include internship-to-employment assessment terms from the sample</label></>}
   <label>Additional terms (optional)<textarea rows={3} maxLength={4000} value={form.extraTerms} onChange={e=>update('extraTerms',e.target.value)} placeholder="Reporting manager, responsibilities, benefits, or other agreed details"/></label>
   <details><summary>Review or customize the full letter body</summary>{bodyPreview&&<div className="hr-wording">{bodyPreview}</div>}<label>Custom body (optional; replaces all generated paragraphs)<textarea rows={9} maxLength={12000} value={form.customBody} onChange={e=>update('customBody',e.target.value)} placeholder="Leave empty to use the automatic wording above."/></label><button type="button" disabled={!bodyPreview} onClick={()=>update('customBody',bodyPreview)}>Copy generated wording to editor</button><p className="hr-help">Custom wording stays exactly as you enter it. Review names, compensation, and dates after changing the form.</p></details>
   <h2>5. HR authorization</h2><div className="hr-fields">{input('signatoryName','HR representative name (optional)','text',false,100)}{input('signatoryTitle','HR representative title','text',false,100)}</div><p className="hr-help">The PDF includes signature spaces for HR and the recipient, plus an acceptance date.</p>
   <div className="hr-actions"><button type="submit" value="preview">{busy?'Preparing...':'Preview letter'}</button><button type="submit" value="download" className="hr-primary">Download PDF</button></div><p className="hr-help">Letters are generated from this form. Download your copy before leaving; the portal does not store these letters.</p>
  </fieldset></form>
  <section className="hr-card hr-preview"><div className="hr-preview-title"><h2>Letter preview</h2><span>A4 &middot; {preview?preview.pages+' page'+(preview.pages===1?'':'s'):'PDF'}</span></div>{dirty&&preview&&<p className="hr-alert">Your form has changed. Preview again to see the latest version. Download always uses the current form.</p>}{preview?<><LetterPdfPreview url={preview.url}/><a href={preview.url} target="_blank" rel="noreferrer">Open {dirty?'previous':'current'} preview in a new tab</a></>:<div className="hr-empty"><img src="/east-west-logo.png" alt="East West Logistics LLC"/><h3>Your next chapter starts here.</h3><p>Enter the recipient's details, then choose Preview letter to review the exact PDF.</p><span>NAVY & ORANGE LETTERHEAD<br/>PERSONALIZED TERMS<br/>HR & RECIPIENT SIGNATURES</span></div>}</section></div>
 </div></Layout>;
}
