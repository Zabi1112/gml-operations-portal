import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API } from "../api";
import AgreementDocument from "../contracts/AgreementDocument";
import "../contracts/contracts.css";
export default function PublicAgreement() {
  const { token } = useParams();
  const [agreement, setAgreement] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    axios.get(API + "/contracts/public/" + encodeURIComponent(token), { signal: controller.signal }).then(({ data }) => setAgreement(data))
      .catch(e => { if (!axios.isCancel(e)) setError(e.response?.data?.message || "Unable to open agreement. Please check your connection and reload."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);
  async function respond(action) {
    setBusy(true); setError("");
    try {
      const { data } = await axios.post(API + "/contracts/public/" + encodeURIComponent(token) + "/respond", { action, signerName: name, consent, documentHash: agreement.documentHash });
      setAgreement(data); setRejecting(false); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.response?.data?.message || "Unable to submit. Please try again. If the response was lost, reload to check your agreement's status.");
      if (e.response?.status === 409) {
        try { const { data } = await axios.get(API + "/contracts/public/" + encodeURIComponent(token)); setAgreement(data); } catch { /* Keep the original error visible. */ }
      }
    } finally { setBusy(false); }
  }
  return <main className="public-agreement"><div className="public-agreement-inner">
    {loading && <p role="status">Loading agreement...</p>}
    {error && <p role="alert" className="contract-error">{error}</p>}
    {!loading && agreement && <>
      {agreement.status === "SIGNED" && <section className="contract-success" role="status"><h1>Agreement signed successfully</h1><p>Thank you, {agreement.signerName}. Your signed agreement has been saved. Download your copy below.</p></section>}
      {agreement.status === "REJECTED" && <section className="contract-notice"><h1>Agreement rejected</h1><p>Your response has been recorded. Contact the dispatch team if you wish to discuss a new agreement.</p></section>}
      {agreement.status === "CANCELLED" && <section className="contract-notice"><h1>Agreement cancelled</h1><p>This link is closed for signing. Contact the dispatch team for a new agreement.</p></section>}
      {agreement.status === "PENDING" && !agreement.canRespond && <p className="contract-notice">This agreement belongs to an archived operation and is closed for signing.</p>}
      {agreement.canRespond && <header><p className="contract-eyebrow">EAST WEST LOGISTICS</p><h1>Review your dispatch agreement</h1><p>Please read the agreement below before signing on behalf of {agreement.companyName}.</p></header>}
      <AgreementDocument agreement={agreement} />
      {agreement.canRespond && <form className="contract-card" onSubmit={e => { e.preventDefault(); respond("sign"); }}>
        <h2>Sign for {agreement.companyName}</h2>
        <label>Your full name (electronic signature)<input value={name} onChange={e => setName(e.target.value)} required maxLength={150} autoComplete="name" disabled={busy} /></label>
        {name && <p className="typed-signature">{name}</p>}
        <label className="contract-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required disabled={busy} /><span>I am authorized to sign for the Carrier. I have read and agree to this agreement and consent to using my typed name as my electronic signature.</span></label>
        <div className="contract-actions"><button type="submit" disabled={busy || !consent || !name.trim()}>{busy ? "Submitting..." : "Sign agreement"}</button><button type="button" className="contract-secondary" disabled={busy} onClick={() => setRejecting(true)}>Reject agreement</button></div>
        {rejecting && <div className="contract-notice"><p>Reject this agreement? This will close the link for signing.</p><div className="contract-actions"><button type="button" disabled={busy} onClick={() => respond("reject")}>Confirm rejection</button><button type="button" className="contract-secondary" disabled={busy} onClick={() => setRejecting(false)}>Go back</button></div></div>}
      </form>}
    </>}
    <footer>EastWestLogisticsLLC &middot; Zeeshan Cheema<br /><a href="mailto:info@eastandwestlogistics.com">info@eastandwestlogistics.com</a> &middot; <a href="tel:+14092482002">(409) 248-2002</a></footer>
  </div></main>;
}
