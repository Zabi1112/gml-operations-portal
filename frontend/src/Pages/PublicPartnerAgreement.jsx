import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../api';
import PartnerDocument from '../contracts/PartnerDocument';
import '../contracts/contracts.css';
import '../contracts/partners.css';
export default function PublicPartnerAgreement(){
 const {token}=useParams();const [record,setRecord]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[declining,setDeclining]=useState(false);
 const [form,setForm]=useState({signedName:'',passportNumber:'',passportCountry:'',consent:false,identityConsent:false});const [file,setFile]=useState(null);
 const errorText=e=>e.response?.data?.message||'Unable to connect. Please try again.';
 useEffect(()=>{const controller=new AbortController();setRecord(null);setForm({signedName:'',passportNumber:'',passportCountry:'',consent:false,identityConsent:false});setFile(null);setError('');setNotice('');setDeclining(false);
 const meta=document.createElement('meta');meta.name='referrer';meta.content='no-referrer';document.head.appendChild(meta);
 axios.get(`${API}/partner-agreements/public/${token}`,{signal:controller.signal}).then(({data})=>setRecord(data)).catch(e=>{if(!axios.isCancel(e))setError(errorText(e));});return()=>{controller.abort();meta.remove();};},[token]);
 const change=e=>setForm(p=>({...p,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
 const pick=e=>{setError('');const selected=e.target.files?.[0];setFile(null);if(!selected)return;if(selected.size>2*1024*1024||!['image/png','image/jpeg','application/pdf'].includes(selected.type)){setError('Choose a PNG, JPEG, or PDF no larger than 2 MB.');e.target.value='';return;}setFile(selected);};
 async function respond(action){setBusy(true);setError('');try{
 let passportFile;
 if(action==='sign'){if(!file)throw new Error('missing-file');const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});passportFile={mime:file.type,base64};}
 const {data}=await axios.post(`${API}/partner-agreements/public/${token}/respond`,{...form,action,documentHash:record.documentHash,passportFile});setRecord(data);setFile(null);setForm({signedName:'',passportNumber:'',passportCountry:'',consent:false,identityConsent:false});setDeclining(false);setNotice(action==='sign'?'Your signature was saved. Download your copy below.':'You declined this agreement. It can no longer be signed.');
 }catch(e){setError(e.message==='missing-file'?'Please upload your passport scan.':errorText(e));}finally{setBusy(false);}}
 async function refresh(){setBusy(true);try{const {data}=await axios.get(`${API}/partner-agreements/public/${token}`);setRecord(data);setError('');}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 return <main className="partner-public contracts-page"><header className="contract-card"><p className="partner-eyebrow">EAST WEST LOGISTICS LLC</p><h1>Partner agreement</h1><p>Private review and electronic signing</p></header>{error&&<p role="alert" className="contract-error">{error}</p>}{notice&&<p role="status" className="contract-notice">{notice}</p>}
 {!record&&!error&&<p>Loading agreement...</p>}{record&&<><section className="contract-card"><h2>{record.settings[record.role+'Name']}</h2><p>You are reviewing as the <strong>{record.role==='manager'?'85% managing member':'15% silent member'}</strong>.</p><p>{record.status==='SIGNED'?'Both partners have signed this agreement.':record.signatures[record.role]?'Your signature is saved. The agreement is incomplete until the other partner signs.':record.canSign?'Read the complete terms below before signing.':'Signing is closed for this agreement.'}</p><button disabled={busy} onClick={refresh}>Refresh signing status</button></section>
 <PartnerDocument record={record}/>
 {record.canSign&&<section className="contract-card"><h2>Your signature</h2><p>Use your own passport details and signature. Full passport numbers and scans are private to portal administrators and are not included in the shared PDF. Uploading a scan is not independent identity verification.</p>
 <form onSubmit={e=>{e.preventDefault();respond('sign');}}><fieldset disabled={busy} className="partner-fieldset"><div className="contract-grid">
 <label>Type your full legal name<input name="signedName" value={form.signedName} onChange={change} autoComplete="name" required maxLength={200}/></label>
 <label>Passport number<input name="passportNumber" value={form.passportNumber} onChange={change} autoComplete="off" required minLength={6} maxLength={30}/></label>
 <label>Passport issuing country<input name="passportCountry" value={form.passportCountry} onChange={change} autoComplete="off" required maxLength={80}/></label>
 <label>Private passport scan · PNG, JPEG or PDF · Up to 2 MB<input type="file" accept="image/png,image/jpeg,application/pdf" onChange={pick} required/></label>
 </div><label className="partner-check"><input type="checkbox" name="identityConsent" checked={form.identityConsent} onChange={change} required/>I am the named partner, these are my passport details, and I consent to restricted storage of my identity documents for this agreement.</label>
 <label className="partner-check"><input type="checkbox" name="consent" checked={form.consent} onChange={change} required/>I have read and agree to this document. I consent to electronic records and adopt my typed name as my electronic signature. I can download and retain a copy.</label>
 <button type="submit">{busy?'Saving...':'Sign this agreement'}</button> <button type="button" onClick={()=>setDeclining(true)}>Decline agreement</button>
 {declining&&<div role="alert"><p>Declining closes signing for both partners. Type your name above to confirm.</p><button type="button" onClick={()=>respond('reject')}>Confirm decline</button> <button type="button" onClick={()=>setDeclining(false)}>Go back</button></div>}
 </fieldset></form></section>}</>}
 </main>;
}
