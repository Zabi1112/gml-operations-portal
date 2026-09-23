import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { BranchContext } from "../context/BranchContext";
import { API } from "../api";
import AgreementDocument from "../contracts/AgreementDocument";
import "../contracts/contracts.css";
const auth = () => ({ headers: { Authorization: "Bearer " + localStorage.getItem("token") } });
const shareUrl = token => window.location.origin + "/agreement/" + token;
const message = error => error.response?.data?.message || "Unable to connect. Please try again.";
function BranchContracts({ branch }) {
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ companyId: "", companyName: "", companyMC: "", ratePercent: "", seats: "0", effectiveDate: new Date().toLocaleDateString("en-CA") });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [created, setCreated] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const refresh = useCallback(async signal => {
    const { data } = await axios.get(API + "/contracts", { ...auth(), params: { branchId: branch.id }, signal });
    setItems(data);
  }, [branch.id]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([axios.get(API + "/contracts", { ...auth(), params: { branchId: branch.id }, signal: controller.signal }), axios.get(API + "/companies", { ...auth(), params: { branchId: branch.id }, signal: controller.signal })])
      .then(([agreements, carriers]) => { setItems(agreements.data); setCompanies(carriers.data); })
      .catch(e => { if (!axios.isCancel(e)) setError(message(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [branch.id, refresh]);
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const chooseCompany = event => {
    const company = companies.find(c => String(c.id) === event.target.value);
    setForm(previous => ({ ...previous, companyId: event.target.value, companyName: company?.companyName || "", companyMC: company?.mcNumber || "", ratePercent: company ? String(company.dispatchPercent) : "" }));
  };
  async function create(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await axios.post(API + "/contracts", { ...form, branchId: branch.id }, auth());
      setCreated(data); setDetail(data); setNotice("Agreement created. Copy the link to share with your client.");
      await refresh();
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  async function view(item) {
    setError(""); setBusy(true);
    try { const { data } = await axios.get(API + "/contracts/" + item.id, { ...auth(), params: { branchId: branch.id } }); setDetail(data); }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  async function copy(token) {
    try { await navigator.clipboard.writeText(shareUrl(token)); setNotice("Agreement link copied."); }
    catch { setNotice("Copy this link: " + shareUrl(token)); }
  }
  async function cancel() {
    setBusy(true); setError("");
    try {
      await axios.post(API + "/contracts/" + cancelId + "/cancel", { branchId: branch.id }, auth());
      setCancelId(null); setDetail(null); setCreated(null); setNotice("Agreement cancelled. The client can no longer sign it."); await refresh();
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  const visible = items.filter(item => filter === "ALL" || item.status === filter);
  return <div className="contracts-page">
    <p>Create an agreement for an existing company or a new carrier. Clients can review and sign without a portal account.</p>
    {error && <p role="alert" className="contract-error">{error}</p>}
    {notice && <p role="status" className="contract-notice">{notice}</p>}
    {branch.isActive && <section className="contract-card"><h3>New dispatch agreement</h3><p>Issued by <strong>EastWestLogisticsLLC</strong> &middot; Owner: <strong>Zeeshan Cheema</strong></p>
      <form onSubmit={create}>
        <div className="contract-grid">
          <label>Existing company (optional)<select value={form.companyId} onChange={chooseCompany}><option value="">New / enter manually</option>{companies.map(company => <option key={company.id} value={company.id}>{company.companyName}</option>)}</select></label>
          <label>Carrier company name<input name="companyName" value={form.companyName} onChange={change} required maxLength={200} /></label>
          <label>Carrier MC number<input name="companyMC" value={form.companyMC} onChange={change} maxLength={40} /></label>
          <label>Dispatch fee (%)<input name="ratePercent" type="number" min="0" max="100" step="0.01" value={form.ratePercent} onChange={change} required /></label>
          <label>DAT load board seats<input name="seats" type="number" min="0" max="10000" step="1" value={form.seats} onChange={change} required /></label>
          <label>Effective date<input name="effectiveDate" type="date" value={form.effectiveDate} onChange={change} required /></label>
        </div>
        <p className="contract-muted">The signing link has no expiry. It closes for signing after acceptance, rejection, cancellation, or branch archival. Creating an agreement does not add a company to your company list.</p>
        <button disabled={busy || loading} type="submit">{busy ? "Please wait..." : "Create agreement & link"}</button>
      </form>
    </section>}
    {created && <section className="contract-card"><h3>Share with {created.companyName}</h3><input aria-label="Shareable agreement link" readOnly value={shareUrl(created.token)} onFocus={e => e.target.select()} /><button onClick={() => copy(created.token)}>Copy link</button></section>}
    <section className="contract-card"><div className="contract-actions"><h3>Agreements ({items.length})</h3><label>Status<select value={filter} onChange={e => setFilter(e.target.value)}>{["ALL", "PENDING", "SIGNED", "REJECTED", "CANCELLED"].map(status => <option key={status}>{status}</option>)}</select></label><button disabled={busy} onClick={() => refresh().catch(e => setError(message(e)))}>Refresh</button></div>
      {loading ? <p>Loading agreements...</p> : !visible.length ? <p>No agreements {filter === "ALL" ? "yet" : "with this status"}.</p> : <div className="contract-table-wrap"><table><thead><tr><th>Agreement / Carrier</th><th>Fee</th><th>Status</th><th>Signature</th><th>Actions</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><strong>{item.companyName}</strong><br /><small>EWL-{item.id} &middot; MC {item.companyMC || "-"}</small></td><td>{item.ratePercent}%</td><td><span className={"contract-status status-" + item.status.toLowerCase()}>{item.status}</span></td><td>{item.signerName || "-"}{item.signedAt && <><br /><small>{new Date(item.signedAt).toLocaleString()}</small></>}</td><td><div className="contract-actions"><button disabled={busy} onClick={() => view(item)}>View / PDF</button>{item.status === "PENDING" && branch.isActive && <><button onClick={() => copy(item.token)}>Copy link</button><button className="contract-secondary" disabled={busy} onClick={() => setCancelId(item.id)}>Cancel</button></>}</div></td></tr>)}</tbody></table></div>}
    </section>
    {cancelId && <section className="contract-card" role="alert"><p>Cancel agreement EWL-{cancelId}? Its signing link will close permanently.</p><div className="contract-actions"><button disabled={busy} onClick={cancel}>Yes, cancel agreement</button><button className="contract-secondary" disabled={busy} onClick={() => setCancelId(null)}>Keep agreement</button></div></section>}
    {detail && <section className="contract-card"><div className="contract-actions"><h3>Agreement EWL-{detail.id}</h3><button className="contract-secondary" onClick={() => setDetail(null)}>Close preview</button></div><AgreementDocument agreement={detail} /></section>}
  </div>;
}
export default function Contracts() {
  const { selectedBranch } = useContext(BranchContext);
  return <Layout title="Contracts">{selectedBranch && <BranchContracts key={selectedBranch.id} branch={selectedBranch} />}</Layout>;
}
