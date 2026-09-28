
import { useContext, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { BranchContext } from "../context/BranchContext";
import { API } from "../api";
import { rubric } from "../interviews/rubric";
import { speakingScore } from "../interviews/scoring";
import "../interviews/interviews.css";
const shareUrl = token => window.location.origin + "/interview/" + token;
async function request(branchId, path = "", options = {}) {
  const response = await fetch(API + "/interviews" + path + (path.includes("?") ? "&" : "?") + "branchId=" + branchId, { ...options, headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") } });
  if (!response.ok) { const body = await response.json(); throw new Error(body.message || "Unable to load assessment."); }
  return response;
}
function ProtectedAudio({ branchId, id, index }) {
  const [url, setUrl] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    let active = true; let objectUrl;
    request(branchId, "/" + id + "/audio/" + index).then(r => r.blob()).then(blob => {
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [branchId, id, index]);
  return error ? <p role="alert">{error}</p> : url ? <audio controls src={url} /> : <p>Loading recording...</p>;
}
function BranchInterviews({ branch }) {
  const [rows, setRows] = useState([]); const [detail, setDetail] = useState(null);
  const [scores, setScores] = useState([{}, {}, {}]); const [notes, setNotes] = useState(["", "", ""]);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); const [created, setCreated] = useState(null); const [deleteItem, setDeleteItem] = useState(null);
  const [page, setPage] = useState(1); const [totalRows, setTotalRows] = useState(0); const [counts, setCounts] = useState(null); const [loading, setLoading] = useState(true);
  async function refresh() {
    const data = await request(branch.id, "?page=" + page).then(r => r.json());
    setRows(data.items); setTotalRows(data.total); setCounts(data.counts);
  }
  useEffect(() => {
    const controller = new AbortController();
    request(branch.id, "?page=" + page, { signal: controller.signal }).then(r => r.json()).then(data => {
      setRows(data.items); setTotalRows(data.total); setCounts(data.counts); setLoading(false);
    }).catch(e => { if (e.name !== "AbortError") { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [branch.id, page]);
  async function create(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const row = await request(branch.id, "", { method: "POST", body: JSON.stringify({ name, branchId: branch.id }) }).then(r => r.json());
      setCreated(row); setName(""); setNotice("Invitation created. Copy the private link and send it to this candidate.");
      if (page !== 1) setPage(1); else await refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function copy(token) {
    try { await navigator.clipboard.writeText(shareUrl(token)); setNotice("Candidate link copied."); }
    catch { setNotice("Copy the candidate link from the field below."); setCreated({ token }); }
  }
  async function open(id) {
    setBusy(true); setError("");
    try { const row = await request(branch.id, "/" + id).then(r => r.json()); setDetail(row); setScores(row.result?.scores || [{}, {}, {}]); setNotes(row.result?.notes || ["", "", ""]); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function finalize() {
    setBusy(true); setError("");
    try {
      const result = await request(branch.id, "/" + detail.id + "/review", { method: "POST", body: JSON.stringify({ scores, notes }) }).then(r => r.json());
      setDetail(previous => ({ ...previous, status: "REVIEWED", result, speaking: previous.speaking.map(task => ({ ...task, hasAudio: false })) }));
      setNotice("Review saved permanently. Speaking recordings deleted."); await refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try {
      await request(branch.id, "/" + deleteItem.id, { method: "DELETE" });
      if (detail?.id === deleteItem.id) setDetail(null);
      if (created?.id === deleteItem.id) setCreated(null);
      setDeleteItem(null); setNotice("Assessment deleted. Its candidate link no longer works.");
      if (rows.length === 1 && page > 1) setPage(page - 1); else await refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const speakingTotal = speakingScore(scores);
  return <div className="iv-shell iv-portal"><div className="iv-wrap">
    <p>Create a candidate link, share it privately, then review the submitted assessment here. Candidates do not need a portal account and cannot see scores.</p>
    <p className="iv-preview-note">Results, written responses, and feedback stay until you delete the assessment. Speaking recordings are retained until review, then deleted automatically. Invitations stay open until submission or deletion.</p>
    {counts && <div className="iv-bank-summary"><strong>{counts.trucking} trucking prompts</strong><strong>{counts.english} English prompts</strong><strong>{counts.listening} listening paragraphs</strong><span>Each invitation: 2 listening + 1 English speaking + 2 trucking speaking. New invitations use a fresh random selection; refreshing keeps the assigned questions.</span></div>}
    {error && <p className="iv-error" role="alert">{error}</p>}{notice && <p className="iv-notice" role="status">{notice}</p>}
    {deleteItem && <section className="iv-card" role="alert"><h2>Delete {deleteItem.name}'s assessment?</h2><p>This permanently deletes the scores, written responses, feedback, and any remaining recordings. The candidate link will stop working.</p><div className="iv-actions"><button disabled={busy} onClick={remove}>Yes, delete permanently</button><button className="iv-secondary" disabled={busy} onClick={() => setDeleteItem(null)}>Keep assessment</button></div></section>}
    {!detail ? <>
      {branch.isActive && <section className="iv-card"><h2>Invite a candidate</h2><p>Create a separate invitation for each candidate or retest. Share only the generated candidate link, not your portal login.</p><form onSubmit={create}><label>Candidate name<input value={name} onChange={e => setName(e.target.value)} required maxLength={100} placeholder="Full name" /></label><button disabled={busy || !name.trim()}>Create candidate link</button></form></section>}
      {created && <section className="iv-card"><h2>Share {created.name ? "with " + created.name : "candidate link"}</h2><input aria-label="Candidate invitation link" readOnly value={shareUrl(created.token)} onFocus={e => e.target.select()} /><div className="iv-actions"><button onClick={() => copy(created.token)}>Copy link</button><a href={shareUrl(created.token)} target="_blank" rel="noreferrer">Open candidate test</a></div><p className="iv-muted">{["localhost", "127.0.0.1"].includes(window.location.hostname) ? "This is a local link. It works on this computer; external candidates need the deployed portal link." : "Send this private link directly to the named candidate."}</p></section>}
      <section className="iv-card"><div className="iv-actions"><h2>Assessments ({totalRows})</h2><button disabled={busy} onClick={() => refresh().catch(e => setError(e.message))}>Refresh</button></div>
        {loading ? <p>Loading assessments...</p> : !rows.length ? <p>No assessments yet. Create your first candidate link above.</p> : <div className="iv-table-wrap"><table><thead><tr><th>Candidate</th><th>Status</th><th>Score</th><th>Created</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong><br /><small>Assessment #{row.id}</small></td><td>{row.status}</td><td>{row.total === null ? "Awaiting review" : row.total + " / 100"}</td><td>{new Date(row.createdAt).toLocaleDateString()}</td><td><div className="iv-actions"><button disabled={busy} onClick={() => open(row.id)}>{row.status === "SUBMITTED" ? "Review" : "View"}</button>{row.status === "PENDING" && branch.isActive && <button className="iv-secondary" onClick={() => copy(row.token)}>Copy link</button>}{branch.isActive && <button className="iv-secondary" disabled={busy} onClick={() => setDeleteItem(row)}>Delete</button>}</div></td></tr>)}</tbody></table></div>}
        <div className="iv-actions"><button className="iv-secondary" disabled={page === 1 || busy} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(totalRows / 50))}</span><button className="iv-secondary" disabled={page * 50 >= totalRows || busy} onClick={() => setPage(page + 1)}>Next</button></div>
      </section>
    </> : <>
      <button className="iv-secondary" disabled={busy} onClick={() => setDetail(null)}>Back to assessments</button><h2>{detail.name} &middot; Assessment #{detail.id}</h2>
      {detail.status === "PENDING" ? <section className="iv-card"><h2>Waiting for the candidate</h2><p>This invitation has not been submitted. The assigned questions stay fixed when the candidate refreshes.</p><input readOnly aria-label="Candidate invitation link" value={shareUrl(detail.token)} onFocus={e => e.target.select()} /><div className="iv-actions"><button onClick={() => copy(detail.token)}>Copy link</button><a href={shareUrl(detail.token)} target="_blank" rel="noreferrer">Open candidate test</a></div></section> : <>
        {detail.result && <section className="iv-card"><h2>Review complete: {detail.result.total} / 100</h2><p>Listening: {detail.result.listeningTotal} / 50 &middot; Speaking: {detail.result.speakingTotal} / 50</p><p>Results are saved. Speaking recordings were deleted after review.</p></section>}
        <p>Listening compares words, ignoring punctuation and capitalization. Speaking is scored by your team. Reference answers are examples; candidates can use other valid wording.</p>
        {detail.listening.map((task, i) => <section className="iv-card" key={task.id}><h2>Listening {i + 1}: {task.title} &mdash; {task.points} / 25</h2><div className="iv-comparison"><div><h3>Original paragraph</h3><p>{task.text}</p></div><div><h3>Candidate typed</h3><p>{task.answer || "No response."}</p></div></div><p>{task.accuracy}% word accuracy &middot; {task.errors} word edits</p></section>)}
        {detail.speaking.map((task, i) => <section className="iv-card" key={detail.id + task.id}><h2>Speaking {i + 1}: {task.title}</h2><p>{task.prompt}</p><details><summary>Reviewer reference answer</summary><p>{task.referenceAnswer}</p></details>{task.hasAudio ? <ProtectedAudio branchId={branch.id} id={detail.id} index={i} /> : <p>{detail.result && task.hadRecording ? "Recording deleted after review." : "No recording submitted."}</p>}
          <p>0 = no usable response; 1 = very limited; 2 = needs support; 3 = understandable; 4 = clear; 5 = strong.</p>
          <div className="iv-rubric">{rubric.map(([key, label, help]) => <label key={key}>{label}<small>{help}</small><select disabled={Boolean(detail.result) || busy || !branch.isActive} aria-label={label + " speaking " + (i + 1)} value={scores[i][key] ?? ""} onChange={e => setScores(previous => previous.map((row, index) => index === i ? { ...row, [key]: Number(e.target.value) } : row))}><option value="" disabled>Choose score</option>{[0,1,2,3,4,5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div>
          {!detail.result && !task.hasAudio && branch.isActive && <button className="iv-secondary" disabled={busy} onClick={() => setScores(previous => previous.map((row, index) => index === i ? Object.fromEntries(rubric.map(([key]) => [key, 0])) : row))}>No response: score all areas zero</button>}
          <label>Reviewer feedback<textarea disabled={Boolean(detail.result) || busy || !branch.isActive} maxLength={1500} rows={2} value={notes[i]} onChange={e => setNotes(previous => previous.map((note, index) => index === i ? e.target.value : note))} /></label>
        </section>)}
        {!detail.result && branch.isActive && <section className="iv-card"><h2>Finalize review</h2><p>Speaking: {speakingTotal === null ? "Complete all scores" : speakingTotal + " / 50"}</p><p>Saving keeps the scores and feedback until you delete this assessment. It permanently deletes the speaking recordings, so finish listening before saving.</p><button disabled={busy || speakingTotal === null} onClick={finalize}>{busy ? "Saving..." : "Save review & delete recordings"}</button></section>}
      </>}
    </>}
  </div></div>;
}
export default function Interviews() {
  const { selectedBranch } = useContext(BranchContext);
  return <Layout title="Interviews">{selectedBranch && <BranchInterviews key={selectedBranch.id} branch={selectedBranch} />}</Layout>;
}
