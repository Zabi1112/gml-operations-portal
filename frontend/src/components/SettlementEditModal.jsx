import {useState} from 'react';
import axios from 'axios';
import {API} from '../api';
import DispatcherSplitEditor from './DispatcherSplitEditor';
import {allocatePartnerAmounts} from '../finance/settlementAllocation';
import {receivedInvoiceFeeUSD,accountantsSummary} from '../finance/invoiceAccountsFees';
const round=n=>Math.round(Number(n||0)*100)/100;
const currency=n=>Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2})+' PKR';
export default function SettlementEditModal({settlement,dispatchers=[],partners=[],auth,onClose,onSaved}){
 const knownMethods=['Remitly','Wire Transfer','PayPal'];
 const savedMethod=settlement.paymentMethod||'';
 const [form,setForm]=useState({
  companyName:settlement.companyName||'',invoiceAmountUSD:settlement.invoiceAmountUSD||0,usdRate:settlement.usdRate||0,
  receiptCurrency:!settlement.invoiceId&&!settlement.invoiceAmountUSD?'PKR':'USD',totalAmountPKR:settlement.totalAmountPKR||0,
  platformFeeUSD:settlement.platformFeeUSD||0,accountsFeeReceivedUSD:receivedInvoiceFeeUSD(settlement),
  dispatcherType:settlement.dispatcherType||'PERCENTAGE',dispatcherValue:settlement.dispatcherValue||0,
  dispatcherSplits:(settlement.dispatcherSplits||[]).map(r=>({dispatcherId:String(r.dispatcherId),amount:r.amountPKR})),
  accountsType:settlement.accountsType||'PERCENTAGE',accountsValue:settlement.accountsValue||0,accountsPartnerId:settlement.accountsPartnerId??'',
  accountantsSplits:accountantsSummary(settlement).splits,
  partners:(settlement.partnerSplits||[]).map(r=>({id:r.partnerId,name:r.name,percent:r.percent})),
  paymentMethod:knownMethods.includes(savedMethod)?savedMethod:savedMethod?'Other':'',otherPaymentMethod:savedMethod.startsWith('Other: ')?savedMethod.slice(7):knownMethods.includes(savedMethod)?'':savedMethod,
  settlementDate:String(settlement.settlementDate||settlement.createdAt||'').slice(0,10),notes:settlement.notes||'',reason:''
 });
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState(null);
 const set=(key,value)=>setForm(previous=>({...previous,[key]:value}));
 const options=[...new Map([...partners,...(settlement.partnerSplits||[]).map(r=>({id:r.partnerId,name:r.name}))].map(r=>[r.id,r])).values()];
 const dispatcherOptions=[...new Map([...dispatchers,...(settlement.dispatcherSplits||[]).map(r=>({id:r.dispatcherId,name:r.name}))].map(r=>[r.id,r])).values()];
 const total=form.receiptCurrency==='PKR'?round(form.totalAmountPKR):round((Number(form.invoiceAmountUSD)-Number(form.platformFeeUSD))*Number(form.usdRate));
 const accountantTotal=round(Number(form.accountsFeeReceivedUSD)*Number(form.usdRate));
 const revenue=round(total-accountantTotal);
 const dispatcher=round(form.dispatcherType==='ABSOLUTE'?form.dispatcherValue:revenue*Number(form.dispatcherValue)/100);
 const accounts=round(form.accountsType==='ABSOLUTE'?form.accountsValue:revenue*Number(form.accountsValue)/100);
 let preview={partnerSplits:[],partnerProfitPKR:0},previewError='';
 try{
  preview=allocatePartnerAmounts(revenue,dispatcher,accounts,form.partners,form.accountsPartnerId||null);
  if(Math.abs(form.partners.reduce((s,r)=>s+Number(r.percent),0)-100)>0.000001)previewError='Partner percentages must total 100%.';
 }catch(e){previewError=e.message;}
 const field=(key,label,type='text')=><label className="form-group" key={key}>{label}<input type={type} value={form[key]} required={!['notes','otherPaymentMethod'].includes(key)} min={type==='number'?0:undefined} step={type==='number'?'any':undefined} onChange={e=>set(key,e.target.value)}/></label>;
 async function save(e){e.preventDefault();setError('');if(previewError)return setError(previewError);setSaving(true);try{
  const {data}=await axios.patch(API+'/finance/settlements/'+settlement.id,{...form,fullCorrection:true,expectedUpdatedAt:settlement.updatedAt},auth);
  await onSaved(data.settlement);
 }catch(e){setError(e.response?.data?.message||'Unable to save settlement');}finally{setSaving(false);}}
 return <div className="settlement-modal"><div className="settlement-box wide-box"><h2>Edit Settlement</h2>
 <p>Changes recalculate the settlement and retain the original in correction history.</p>
 <form onSubmit={save}><fieldset disabled={saving}>
 {field('companyName','Company / settlement name')}
 {!settlement.invoiceId&&<label>Currency<select value={form.receiptCurrency} onChange={e=>setForm({...form,receiptCurrency:e.target.value,platformFeeUSD:0})}><option>USD</option><option>PKR</option></select></label>}
 {form.receiptCurrency==='USD'?<>{field('invoiceAmountUSD','Customer payment before platform fee (USD)','number')}{field('usdRate','USD to PKR rate','number')}{field('platformFeeUSD','Platform fee deducted (USD)','number')}<p>The invoice receives credit for the customer payment. Platform fees reduce settlement revenue.</p></>:field('totalAmountPKR','Received amount (PKR)','number')}
 {settlement.invoiceId&&<>{field('accountsFeeReceivedUSD','Accountant fee included in this payment (USD)','number')}<p>Changing payment or accountant-fee USD reallocates invoice balances. Older carried-forward payments require invoice correction first; their rate, platform fee and shares remain editable.</p></>}
 <label>Payment method<select required value={form.paymentMethod} onChange={e=>set('paymentMethod',e.target.value)}><option value="">Select method</option>{knownMethods.map(m=><option key={m}>{m}</option>)}<option>Other</option></select></label>
 {form.paymentMethod==='Other'&&field('otherPaymentMethod','Other payment method')}{field('settlementDate','Payment date','date')}
 <h3>Dispatcher share</h3><DispatcherSplitEditor dispatchers={dispatcherOptions} dispatcherType={form.dispatcherType} dispatcherValue={form.dispatcherValue} onDispatcherTypeChange={v=>set('dispatcherType',v)} onDispatcherValueChange={v=>set('dispatcherValue',v)} dispatcherAmount={dispatcher} splits={form.dispatcherSplits} onSplitsChange={v=>set('dispatcherSplits',v)} formatCurrency={currency}/>
 <h3>Accounts Team deduction</h3><label>Type<select value={form.accountsType} onChange={e=>set('accountsType',e.target.value)}><option value="PERCENTAGE">Percentage</option><option value="ABSOLUTE">Amount in PKR</option></select></label>
 {field('accountsValue',form.accountsType==='PERCENTAGE'?'Accounts Team (%)':'Accounts Team (PKR)','number')}
 <label>Deduct from<select value={form.accountsPartnerId} onChange={e=>set('accountsPartnerId',e.target.value)}><option value="">Shared deduction before partner distribution</option>{form.partners.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
 <h3>Partners</h3><p>These percentages apply to this settlement only.</p>
 {form.partners.map((r,i)=><div className="form-group" key={i}><select aria-label="Partner" value={r.id} onChange={e=>{const p=options.find(p=>p.id===Number(e.target.value));set('partners',form.partners.map((row,j)=>i===j?{...row,id:p.id,name:p.name}:row));}}>{options.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><input aria-label="Partner percentage" type="number" min="0" max="100" step="any" required value={r.percent} onChange={e=>set('partners',form.partners.map((row,j)=>i===j?{...row,percent:e.target.value}:row))}/><button type="button" onClick={()=>set('partners',form.partners.filter((_,j)=>i!==j))}>Remove partner</button></div>)}
 <button type="button" onClick={()=>{const p=options.find(p=>!form.partners.some(r=>r.id===p.id));if(p)set('partners',[...form.partners,{id:p.id,name:p.name,percent:0}]);}}>Add partner</button>
 {settlement.invoiceId&&<><h3>Accountants ? {currency(accountantTotal)}</h3><p>Separate from Accounts Team and partner shares.</p>{form.accountantsSplits.map((r,i)=><div key={i}><input aria-label="Accountant name" required value={r.name} onChange={e=>set('accountantsSplits',form.accountantsSplits.map((row,j)=>i===j?{...row,name:e.target.value}:row))}/><input aria-label="Accountant amount PKR" type="number" min="0.01" step="0.01" required value={r.amountPKR} onChange={e=>set('accountantsSplits',form.accountantsSplits.map((row,j)=>i===j?{...row,amountPKR:e.target.value}:row))}/><button type="button" onClick={()=>set('accountantsSplits',form.accountantsSplits.filter((_,j)=>i!==j))}>Remove</button></div>)}<button type="button" onClick={()=>set('accountantsSplits',[...form.accountantsSplits,{name:'',amountPKR:''}])}>Add accountant</button></>}
 <section className="calculation-summary"><h3>Recalculated settlement</h3><p>Net received after platform fee: {currency(total)}</p><p>Accountants: {currency(accountantTotal)}</p><p>Revenue for settlement: {currency(revenue)}</p><p>Dispatcher: {currency(dispatcher)}</p><p>Accounts Team: {currency(accounts)}</p><p>Partner total: {currency(preview.partnerProfitPKR)}</p>{preview.partnerSplits.map(r=><p key={r.partnerId}>{r.name}: {currency(r.amountPKR)}</p>)}{previewError&&<p role="alert">{previewError}</p>}</section>
 <label>Notes<textarea value={form.notes} maxLength={5000} onChange={e=>set('notes',e.target.value)}/></label><label>Correction reason<textarea required maxLength={1000} value={form.reason} onChange={e=>set('reason',e.target.value)}/></label>
 {error&&<p role="alert">{error}</p>}<button type="submit">{saving?'Saving?':'Save settlement'}</button><button type="button" onClick={onClose}>Cancel</button><button type="button" onClick={async()=>{try{const {data}=await axios.get(API+'/finance/settlements/'+settlement.id+'/revisions',auth);setHistory(data);}catch{setError('Unable to load correction history');}}}>Correction history</button>
 </fieldset></form>{history&&<section>{history.length?history.map(r=><p key={r.id}>{new Date(r.createdAt).toLocaleString()} ? {r.reason} <button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='settlement-revision-'+r.id+'.json';a.click();URL.revokeObjectURL(url);}}>Download original</button></p>):<p>No corrections recorded.</p>}</section>}
 </div></div>;
}
