import { useContext, useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { BranchContext } from "../context/BranchContext";
import { API } from "../api";
import PayStatementView from "../paychecks/PayStatementView";
import { defaultDeductions, emptyLoad, emptyStatement, money, readCompanyLogo } from "../paychecks/payDefaults";
import "../paychecks/paychecks.css";
const auth = () => ({ headers: { Authorization: "Bearer " + localStorage.getItem("token") } });
const errorMessage = e => e.response?.data?.message || e.message || "Unable to connect. Please try again.";
function Field({ label, name, form, change, type = "text", required = false, maxLength = 200 }) {
  return <label>{label}<input name={name} type={type} value={form[name]} onChange={change} required={required} maxLength={maxLength} {...(type === "number" ? { min: 0, step: "0.01" } : {})} /></label>;
}
function Charges({ title, rows, change, add, remove }) {
  return <section><h3>{title}</h3>{rows.map((row, i) => <div className="pay-charge-row" key={i}>
    <label>Description<input value={row.description} maxLength={160} required onChange={e => change(i, "description", e.target.value)} /></label>
    <label>Amount / rate ($)<input type="number" min="0" max="1000000" step="0.01" required value={row.rate} onChange={e => change(i, "rate", e.target.value)} /></label>
    <label>Frequency<select value={row.frequency} onChange={e => change(i, "frequency", e.target.value)}><option value="ONCE">Per statement</option><option value="WEEKLY">Per week</option></select></label>
    <button type="button" className="pay-secondary" aria-label={"Remove " + title + " row " + (i + 1)} onClick={() => remove(i)}>Remove</button>
  </div>)}<button type="button" className="pay-secondary" disabled={rows.length >= 30} onClick={add}>Add {title.toLowerCase()}</button></section>;
}
function BranchPaychecks({ branch }) {
  const [form, setForm] = useState(emptyStatement);
  const [companies, setCompanies] = useState([]);
  const [listing, setListing] = useState({ items: [], total: 0, page: 1 });
  const [record, setRecord] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const company = companies.find(c => String(c.id) === String(form.companyId));
  const patch = values => { setForm(previous => ({ ...previous, ...values })); setSnapshot(null); setDirty(true); setNotice(""); };
  const change = e => patch({ [e.target.name]: e.target.value });
  async function refresh(page = 1) {
    const { data } = await axios.get(API + "/pay-statements", { ...auth(), params: { branchId: branch.id, page } }); setListing(data);
  }
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([axios.get(API + "/companies", { ...auth(), params: { branchId: branch.id }, signal: controller.signal }), axios.get(API + "/pay-statements", { ...auth(), params: { branchId: branch.id }, signal: controller.signal })])
      .then(([carriers, saved]) => { setCompanies(carriers.data); setListing(saved.data); })
      .catch(e => { if (!axios.isCancel(e)) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [branch.id]);
  function chooseCompany(e) {
    const selected = companies.find(c => String(c.id) === e.target.value);
    patch({ companyId: selected?.id || "", companyName: selected?.companyName || "", mcNumber: selected?.mcNumber || "", dotNumber: selected?.dotNumber || "", companyAddress: selected?.address || "", companyPhone: selected?.contactNumber || "", companyLogo: "", driverId: "", truckId: "", recipientName: "", recipientPhone: "", truckNumber: "", trailerNumber: "", loads: [emptyLoad()] });
  }
  function chooseDriver(e) {
    const selected = company?.drivers?.find(d => String(d.id) === e.target.value);
    patch({ driverId: selected?.id || "", recipientName: selected?.name || "", recipientPhone: selected?.phone || "", truckId: selected?.truck?.id || "", truckNumber: selected?.truck?.truckNumber || "", trailerNumber: selected?.truck?.trailerNumber || "", loads: [emptyLoad()] });
  }
  function chooseTruck(e) {
    const selected = company?.trucks?.find(t => String(t.id) === e.target.value);
    patch({ truckId: selected?.id || "", truckNumber: selected?.truckNumber || "", trailerNumber: selected?.trailerNumber || "" });
  }
  function changeType(e) {
    const type = e.target.value;
    patch({ recipientType: type, percent: type === "DRIVER" ? 30 : 10, deductions: defaultDeductions(type) });
    setNotice("Default percentage and deductions loaded for this pay type. Every amount can be changed.");
  }
  function changeRow(group, index, key, value) { patch({ [group]: form[group].map((row, i) => i === index ? { ...row, [key]: value } : row) }); }
  async function uploadLogo(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setError("");
    try { patch({ companyLogo: await readCompanyLogo(file) }); } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); e.target.value = ""; }
  }
  async function importLoads() {
    setBusy(true); setError("");
    try {
      const { data } = await axios.get(API + "/loads", { ...auth(), params: { branchId: branch.id, companyId: form.companyId, ...(form.driverId ? { driverId: form.driverId } : {}), ...(form.truckId ? { truckId: form.truckId } : {}), from: form.periodStart, to: form.periodEnd } });
      const current = form.loads.filter(l => l.origin || l.destination || Number(l.gross));
      const seen = new Set(current.map(l => l.sourceLoadId).filter(Boolean));
      const imported = data.map(l => ({ sourceLoadId: l.id, pickupDate: (l.pickupDate || l.loadDate).slice(0, 10), deliveryDate: (l.dropoffDate || l.pickupDate || l.loadDate).slice(0, 10), origin: l.pickup, destination: l.dropoff, reference: l.loadNumber || "", miles: l.miles || 0, gross: l.grossAmount || l.loadAmount || 0 })).filter(l => { const key = l.sourceLoadId; if (seen.has(key)) return false; seen.add(key); return true; });
      if (current.length + imported.length > 100) throw new Error("Import would exceed 100 loads. Use a shorter period.");
      patch({ loads: [...current, ...imported].length ? [...current, ...imported] : [emptyLoad()] });
      setNotice(imported.length + " loads imported using the load date and selected recipient/truck. Review dates and amounts before saving.");
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault(); const save = event.nativeEvent.submitter?.value === "save";
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form, branchId: branch.id, revision: record?.revision };
      if (save) {
        const { data } = record?.id ? await axios.patch(API + "/pay-statements/" + record.id, payload, auth()) : await axios.post(API + "/pay-statements", payload, auth());
        setRecord(data); setForm(data.snapshot.form); setSnapshot(data.snapshot); setDirty(false);
        setNotice("Statement saved. Download the PDF below and share it with the client."); await refresh();
      } else {
        const { data } = await axios.post(API + "/pay-statements/preview", payload, auth()); setSnapshot(data);
      }
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function open(item, reuse = false) {
    if (dirty && !window.confirm("Discard unsaved statement changes?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await axios.get(API + "/pay-statements/" + item.id, { ...auth(), params: { branchId: branch.id } });
      if (reuse) {
        const dates = emptyStatement(); setForm({ ...data.snapshot.form, periodStart: dates.periodStart, periodEnd: dates.periodEnd, loads: [emptyLoad()] }); setRecord(null); setSnapshot(null); setDirty(true);
        setNotice("New statement started with the saved company branding and pay rates. Enter the new period and loads.");
      } else { setForm(data.snapshot.form); setRecord(data); setSnapshot(data.snapshot); setDirty(false); }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  function fresh() {
    if (dirty && !window.confirm("Discard unsaved statement changes?")) return;
    setForm(emptyStatement()); setRecord(null); setSnapshot(null); setDirty(false); setNotice(""); setError("");
  }
  return <div className="pay-page">
    <div className="pay-intro"><div><p>Prepare driver and owner-operator pay statements under your client's company name.</p><p className="pay-muted">Paperwork only. Your client handles payment; these statements do not affect portal balances.</p></div>{branch.isActive && <button disabled={busy} onClick={fresh}>New statement</button>}</div>
    {error && <p className="pay-error" role="alert">{error}</p>}{notice && <p className="pay-notice" role="status">{notice}</p>}
    {branch.isActive && <form onSubmit={submit} className="pay-card"><fieldset disabled={busy || loading}>
      <h3>{record ? "Edit statement PS-" + record.id : "New pay statement"}</h3>
      <div className="pay-grid">
        <label>Existing company<select value={form.companyId || ""} onChange={chooseCompany}><option value="">Enter company manually</option>{companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></label>
        <Field label="Company name on PDF" name="companyName" form={form} change={change} required />
        <Field label="MC number" name="mcNumber" form={form} change={change} maxLength={50} /><Field label="USDOT number" name="dotNumber" form={form} change={change} maxLength={50} />
        <Field label="Company address" name="companyAddress" form={form} change={change} maxLength={400} /><Field label="Company phone" name="companyPhone" form={form} change={change} maxLength={80} />
        <label>Client company logo (optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} />{form.companyLogo && <span className="pay-logo-control"><img src={form.companyLogo} alt="Selected company logo" /><button type="button" className="pay-secondary" onClick={() => patch({ companyLogo: "" })}>Remove logo</button></span>}</label>
        <label>Pay type<select value={form.recipientType} onChange={changeType}><option value="DRIVER">Driver</option><option value="OWNER_OPERATOR">Owner-operator</option></select></label>
        <label>Existing driver / recipient<select value={form.driverId || ""} onChange={chooseDriver} disabled={!company}><option value="">Enter recipient manually</option>{company?.drivers?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <Field label="Recipient name" name="recipientName" form={form} change={change} required maxLength={150} /><Field label="Recipient phone" name="recipientPhone" form={form} change={change} maxLength={80} />
        <label>Existing truck<select value={form.truckId || ""} onChange={chooseTruck} disabled={!company}><option value="">Enter truck manually</option>{company?.trucks?.map(t => <option key={t.id} value={t.id}>{t.truckNumber}</option>)}</select></label>
        <Field label="Truck number" name="truckNumber" form={form} change={change} maxLength={80} /><Field label="Trailer number" name="trailerNumber" form={form} change={change} maxLength={80} />
        <Field label="Period start" name="periodStart" type="date" form={form} change={change} required /><Field label="Period end" name="periodEnd" type="date" form={form} change={change} required />
        <Field label={form.recipientType === "DRIVER" ? "Driver share of gross (%)" : "Carrier deduction from gross (%)"} name="percent" type="number" form={form} change={change} required />
        <Field label="Chargeable weeks (editable)" name="weeks" type="number" form={form} change={change} required />
      </div>
      <p className="pay-muted">Weekly charges use the weeks entered above. The date range does not change this value automatically. All amounts are USD.</p>
      <section><div className="pay-actions"><h3>Load earnings</h3><button type="button" className="pay-secondary" disabled={!form.companyId || (!form.driverId && !form.truckId) || !form.periodStart || !form.periodEnd} onClick={importLoads}>Import recorded loads</button></div><p className="pay-muted">Enter loads below, or select a company and driver/truck to import their recorded loads for this period.</p>
        {form.loads.map((row, i) => <div className="pay-load" key={i}><div className="pay-actions"><strong>Load {i + 1}</strong><button type="button" className="pay-secondary" disabled={form.loads.length === 1} onClick={() => patch({ loads: form.loads.filter((_, index) => index !== i) })}>Remove load</button></div><div className="pay-grid pay-load-grid">
          {[['Pickup date','pickupDate','date'],['Delivery date','deliveryDate','date'],['Origin','origin','text'],['Destination','destination','text'],['Load reference','reference','text'],['Miles','miles','number'],['Load gross ($)','gross','number']].map(([label, key, type]) => <label key={key}>{label}<input type={type} value={row[key]} required={key !== "reference"} maxLength={key === "reference" ? 80 : 200} {...(type === "number" ? { min: 0, max: 1000000, step: "0.01" } : {})} onChange={e => changeRow("loads", i, key, e.target.value)} /></label>)}
        </div></div>)}
        <button type="button" className="pay-secondary" disabled={form.loads.length >= 100} onClick={() => patch({ loads: [...form.loads, emptyLoad()] })}>Add load</button>
      </section>
      {[['Deductions','deductions'],['Additional earnings','additions']].map(([title, group]) => <Charges key={group} title={title} rows={form[group]} change={(i, key, value) => changeRow(group, i, key, value)} remove={i => patch({ [group]: form[group].filter((_, index) => index !== i) })} add={() => patch({ [group]: [...form[group], { description: "", rate: 0, frequency: "ONCE" }] })} />)}
      <label>Notes on statement<textarea name="notes" value={form.notes} onChange={change} maxLength={2000} rows={3} /></label>
      <div className="pay-actions"><button type="submit" value="preview" className="pay-secondary">Calculate & preview</button><button type="submit" value="save">{busy ? "Please wait..." : record ? "Save changes" : "Save statement"}</button></div>
    </fieldset></form>}
    {snapshot && <PayStatementView key={String(record?.id) + ":" + String(record?.revision) + ":" + dirty} snapshot={snapshot} record={dirty ? null : record} />}
    <section className="pay-card"><div className="pay-actions"><h3>Saved statements ({listing.total})</h3><button className="pay-secondary" disabled={busy} onClick={() => refresh(listing.page).catch(e => setError(errorMessage(e)))}>Refresh</button></div>
      {loading ? <p>Loading statements...</p> : !listing.items.length ? <p>No saved statements yet.</p> : <div className="pay-table-wrap"><table><thead><tr><th>Company / Recipient</th><th>Type</th><th>Period</th><th>Net payable</th><th>Actions</th></tr></thead><tbody>{listing.items.map(item => <tr key={item.id}><td><strong>{item.companyName}</strong><br />{item.recipientName}<br /><small>PS-{item.id} / Rev {item.revision}</small></td><td>{item.recipientType === "DRIVER" ? "Driver" : "Owner-operator"}</td><td>{item.periodStart}<br />{item.periodEnd}</td><td>{money(item.netCents)}</td><td><div className="pay-actions"><button disabled={busy} onClick={() => open(item)}>Open / PDF</button>{branch.isActive && <button className="pay-secondary" disabled={busy} onClick={() => open(item, true)}>Use as template</button>}</div></td></tr>)}</tbody></table></div>}
      {listing.total > 25 && <div className="pay-actions"><button disabled={busy || listing.page === 1} onClick={() => refresh(listing.page - 1).catch(e => setError(errorMessage(e)))}>Previous</button><span>Page {listing.page} of {Math.ceil(listing.total / 25)}</span><button disabled={busy || listing.page * 25 >= listing.total} onClick={() => refresh(listing.page + 1).catch(e => setError(errorMessage(e)))}>Next</button></div>}
    </section>
  </div>;
}
export default function Paychecks() {
  const { selectedBranch } = useContext(BranchContext);
  return <Layout title="Paychecks">{selectedBranch && <BranchPaychecks key={selectedBranch.id} branch={selectedBranch} />}</Layout>;
}
