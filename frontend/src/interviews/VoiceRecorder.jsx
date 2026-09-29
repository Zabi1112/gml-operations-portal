import { useEffect, useRef, useState } from "react";
export default function VoiceRecorder({ limit, audio, onAudio, onBusy, disabled = false, maxBytes = 786432 }) {
  const active = useRef(true); const [starting, setStarting] = useState(false);
  const recorder = useRef(null); const stream = useRef(null); const started = useRef(0);
  const [recording, setRecording] = useState(false); const [seconds, setSeconds] = useState(0); const [error, setError] = useState("");
  useEffect(() => { active.current = true; return () => {
    active.current = false;
    if (recorder.current) { recorder.current.onstop = null; recorder.current.ondataavailable = null; if (recorder.current.state !== "inactive") recorder.current.stop(); }
    stream.current?.getTracks().forEach(track => track.stop());
  }; }, []);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started.current) / 1000); setSeconds(Math.min(elapsed, limit));
      if (elapsed >= limit && recorder.current?.state === "recording") recorder.current.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [recording, limit]);
  async function start() {
    setError(""); setStarting(true); onBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Recording is unavailable in this browser. Open the preview in Chrome or Edge over localhost or HTTPS.");
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) { stream.current.getTracks().forEach(track => track.stop()); return; }
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(stream.current, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined); recorder.current = rec;
      const chunks = [];
      rec.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      rec.onerror = () => { setError("Recording failed. Please try again."); setRecording(false); onBusy(false); stream.current?.getTracks().forEach(track => track.stop()); };
      rec.onstop = () => {
        stream.current?.getTracks().forEach(track => track.stop()); setRecording(false); onBusy(false);
        const duration = Math.min(limit, (Date.now() - started.current) / 1000);
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size > maxBytes) { setError("This recording is too large. Please record a shorter response."); return; }
        if (duration < 1 || !blob.size) { setError("The recording was too short. Please record again."); return; }
        onAudio({ url: URL.createObjectURL(blob), duration: Math.round(duration), bytes: blob.size });
      };
      started.current = Date.now(); setSeconds(0); rec.start(500); setRecording(true);
    } catch (e) {
      stream.current?.getTracks().forEach(track => track.stop()); onBusy(false);
      setError(e.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access in your browser and try again." : e.message);
    } finally { if (active.current) setStarting(false); }
  }
  return <div className="iv-recorder">
    {error && <p role="alert" className="iv-error">{error}</p>}
    <div className="iv-actions"><button type="button" disabled={starting || disabled} onClick={recording ? () => recorder.current?.stop() : start}>{recording ? "Stop recording" : audio ? "Record again" : "Start recording"}</button><span aria-live="polite">{recording ? "Recording: " + seconds + " / " + limit + " seconds" : "Up to " + limit + " seconds"}</span></div>
    {audio && !recording && <><p>Your response &middot; {audio.duration} seconds</p><audio controls src={audio.url} /></>}
    <p className="iv-muted">Speak naturally. You can play back and replace your recording before moving on.</p>
  </div>;
}
