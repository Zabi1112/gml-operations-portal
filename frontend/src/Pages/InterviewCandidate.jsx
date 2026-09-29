import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { API } from "../api";
import ListeningTask from "../interviews/ListeningTask";
import VoiceRecorder from "../interviews/VoiceRecorder";
import "../interviews/interviews.css";

function CandidateAssessment({ token }) {
  const [stage, setStage] = useState("loading"); const [name, setName] = useState(""); const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(["", ""]); const [plays, setPlays] = useState([0, 0]); const [audio, setAudio] = useState([null, null, null]);
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState({ listening: [], speaking: [] });
  const [consent, setConsent] = useState(false); const [sending, setSending] = useState(false);
  const listeningTasks = tasks.listening; const speakingTasks = tasks.speaking;
  const listenCount = listeningTasks.length; const taskCount = listenCount + speakingTasks.length; const lastStep = taskCount - 1; const isBeginner = tasks.testType === "BEGINNER";
  const labels = [...listeningTasks.map((_, i) => "Listen " + (i + 1)), ...speakingTasks.map((_, i) => "Speak " + (i + 1))]; const [error, setError] = useState(""); const urls = useRef(new Set());
  useEffect(() => { const owned = urls.current; return () => owned.forEach(url => URL.revokeObjectURL(url)); }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(API + "/interviews/public/" + token, { signal: controller.signal, referrerPolicy: "no-referrer" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.message || "Unable to open invitation."); return body; })
      .then(body => { setName(body.name); if (body.status !== "PENDING") setStage("submitted"); else { setTasks(body); setAnswers(body.listening.map(() => "")); setPlays(body.listening.map(() => 0)); setAudio(body.speaking.map(() => null)); setStage("welcome"); } })
      .catch(e => { if (e.name !== "AbortError") { setError(e.message); setStage("unavailable"); } });
    return () => controller.abort();
  }, [token]);
  useEffect(() => {
    if (stage !== "candidate") return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [stage]);
  function setRecording(index, entry) {
    if (audio[index]) { URL.revokeObjectURL(audio[index].url); urls.current.delete(audio[index].url); }
    urls.current.add(entry.url); setAudio(previous => previous.map((value, i) => i === index ? entry : value));
  }

  async function move() {
    if (step < lastStep) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (sending || !consent) return;
    setSending(true); setBusy(true); setError("");
    try {
      const recordings = await Promise.all(audio.map(async entry => {
        if (!entry) return null;
        const blob = await fetch(entry.url).then(r => r.blob());
        if (blob.size > (isBeginner ? 524288 : 786432)) throw new Error("A recording is too large. Please replace it with a shorter response.");
        const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(",")[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
        return { data, mimeType: blob.type, duration: entry.duration };
      }));
      const response = await fetch(API + "/interviews/public/" + token + "/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent, answers, recordings }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to submit.");
      urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); setAudio([null, null, null]);
      setStage("submitted"); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError(e.message === "Failed to fetch" ? "Cannot reach the server. Your responses are still here; check your connection and retry." : e.message); }
    finally { setBusy(false); setSending(false); }
  }
  return <main className="iv-shell"><header className="iv-header"><img src="/east-west-logo.png" alt="East West Logistics" /><div><span className="iv-eyebrow">EAST WEST LOGISTICS</span><strong>Communication assessment</strong></div><span className="iv-demo">CANDIDATE ASSESSMENT</span></header>
    <div className="iv-wrap"><p className="iv-preview-note">Your responses are private to the hiring team. Speaking recordings are deleted after review; scores, written responses, and feedback remain until the team deletes your assessment.</p>
    {stage === "loading" && <section className="iv-card"><h1>Loading your invitation...</h1></section>}
    {stage === "unavailable" && <section className="iv-card"><h1>Unable to open this invitation</h1><p>Ask the hiring team to check your link, or try again if your connection was interrupted.</p><button onClick={() => window.location.reload()}>Try again</button></section>}
    {error && <p className="iv-error" role="alert">{error}</p>}
    {stage === "welcome" && <><section className="iv-hero"><span className="iv-tag">LISTEN CLEARLY. RESPOND CONFIDENTLY.</span><h1>{isBeginner ? "A simple English conversation test." : <>A practical English test<br />for the dispatch desk.</>}</h1><p>{listenCount} short dictations. {speakingTasks.length} spoken responses. {isBeginner ? "Talk about yourself, your hobbies, and everyday life. No dispatch experience needed." : "Show how you understand and communicate in dispatch situations."}</p></section>
      <div className="iv-overview"><article><span>01</span><h2>Listen & type</h2><p>Hear {listenCount} short paragraphs and type what you heard. Up to two listens each.</p><strong>50 points &middot; Automatic word comparison</strong></article><article><span>02</span><h2>Speak & respond</h2><p>{isBeginner ? "Answer four simple questions about familiar everyday topics." : "Answer one general English prompt and two dispatch communication prompts."}</p><strong>50 points &middot; Reviewed by your team</strong></article></div>
      <section className="iv-card"><h2>Welcome, {name}</h2><p>Use a quiet room, allow microphone access, and check your volume. Complete the test in this tab; leaving before submission loses your unsent responses.</p><p>Sound check: play this sample before starting.</p><audio controls preload="metadata" src="/interview-audio/sound-check.wav" aria-label="Sound check" /><form onSubmit={e => { e.preventDefault(); setStage("candidate"); setError(""); }}><label className="iv-consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree to record my speaking responses and submit them to the hiring team for assessment.</label><div className="iv-actions"><button disabled={!consent}>Start assessment</button><span className="iv-muted">Allow about 15 minutes</span></div></form></section></>}
    {stage === "candidate" && <><div className="iv-progress" style={{ gridTemplateColumns: "repeat(" + taskCount + ", minmax(0, 1fr))" }} aria-label={"Task " + (step + 1) + " of " + taskCount}>{labels.map((label, i) => <div key={label} className={i === step ? "active" : i < step ? "complete" : ""}><span>{i + 1}</span>{label}</div>)}</div>
      <section className="iv-card"><div className="iv-section-heading"><span className="iv-tag">{step < listenCount ? "LISTENING" : "SPEAKING"}</span><span>Task {step + 1} of {taskCount} &middot; {name}</span></div>
        {step < listenCount ? <ListeningTask key={step} task={listeningTasks[step]} answer={answers[step]} plays={plays[step]} onPlay={delta => setPlays(previous => previous.map((value, i) => i === step ? Math.max(0, value + delta) : value))} onAnswer={value => setAnswers(previous => previous.map((a, i) => i === step ? value : a))} onBusy={setBusy} /> : <><h1>{speakingTasks[step - listenCount].title}</h1><p className="iv-muted">{speakingTasks[step - listenCount].tag} &middot; Take a moment to prepare before recording.</p><blockquote>{speakingTasks[step - listenCount].prompt}</blockquote><h3>In your response</h3><ul>{speakingTasks[step - listenCount].points.map(point => <li key={point}>{point}</li>)}</ul><VoiceRecorder maxBytes={isBeginner ? 524288 : 786432} disabled={sending} key={step} limit={speakingTasks[step - listenCount].seconds} audio={audio[step - listenCount]} onAudio={entry => setRecording(step - listenCount, entry)} onBusy={setBusy} /></>}
        <div className="iv-actions iv-bottom"><button disabled={busy || (step < listenCount ? !answers[step].trim() : !audio[step - listenCount])} onClick={move}>{sending ? "Submitting..." : step === lastStep ? "Submit assessment" : "Save response & continue"}</button><button className="iv-secondary" disabled={busy} onClick={move}>{step === lastStep ? (audio[step - listenCount] ? "Submit assessment" : "Submit without this response") : "Continue without an answer"}</button></div>
      </section></>}
    {stage === "submitted" && <section className="iv-card iv-complete"><span className="iv-tag">ASSESSMENT SUBMITTED</span><h1>Thank you, {name}.</h1><p>Your responses have been received. Our team will review your assessment.</p><p>You can close this page now.</p></section>}
    <footer className="iv-footer">Internal communication assessment &middot; Not an official IELTS score</footer></div>
  </main>;
}

export default function InterviewCandidate() { const { token } = useParams(); return <CandidateAssessment key={token} token={token} />; }
