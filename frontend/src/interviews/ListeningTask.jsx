
import { useEffect, useRef, useState } from "react";
export default function ListeningTask({ task, answer, onAnswer, plays, onPlay, onBusy }) {
  const player = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => { const audio = player.current; return () => { audio?.pause(); }; }, []);
  function stop() { player.current?.pause(); setPlaying(false); onBusy(false); }
  async function play() {
    if (pending.current || plays >= 2) return;
    pending.current = true; setError(""); onBusy(true);
    try {
      player.current.currentTime = 0;
      await player.current.play();
      setPlaying(true); onPlay(1);
    } catch {
      setError("Audio could not play. Check your connection and device volume, then try again.");
      setPlaying(false); onBusy(false);
    } finally { pending.current = false; }
  }
  return <>
    <p>Listen to the paragraph, then type exactly what you heard. You may listen twice. Capitalization and punctuation do not affect the score.</p>
    <div className="iv-listen-box"><span className="iv-tag">LISTEN & TYPE</span><h2>{task.title}</h2>
      <audio ref={player} src={task.audioUrl} preload="auto" onEnded={stop} onError={() => { stop(); setError("The audio file could not load. Refresh the page and try again."); }} />
      <div className="iv-actions"><button type="button" disabled={!playing && plays >= 2} onClick={playing ? stop : play}>{playing ? "Stop audio" : plays ? "Listen again" : "Play paragraph"}</button><span role="status">{playing ? "Playing paragraph..." : plays + " of 2 listens used"}</span></div>
    </div>
    {error && <p role="alert" className="iv-error">{error}</p>}
    <label>Your transcription<textarea value={answer} onChange={e => onAnswer(e.target.value)} rows={8} maxLength={4000} spellCheck={false} autoComplete="off" placeholder="Type what you heard here..." /></label>
    <p className="iv-muted">Your typing is kept when you continue.</p>
  </>;
}
