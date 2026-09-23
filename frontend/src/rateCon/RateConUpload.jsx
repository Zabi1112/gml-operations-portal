import { useEffect, useRef, useState } from "react";
import { fields, mapRateCon } from "./fields";
import { parseRateCon } from "./parseRateCon";
import { readDocument } from "./readDocument";
import "./RateConUpload.css";

export default function RateConUpload({ context, onApply }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [values, setValues] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function close() {
    controllerRef.current?.abort();
    setOpen(false);
    setBusy(false);
  }

  async function readFile(selected) {
    if (!selected) return;
    setFile(selected);
    setOpen(true);
    setBusy(true);
    setError("");
    setWarnings([]);
    setValues({});
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const document = await readDocument(selected, {
        signal: controller.signal,
        progress: setStatus
      });
      const parsed = parseRateCon(document.text);
      setValues(mapRateCon(parsed.values, context));
      setWarnings([
        ...(document.usedOcr ? ["This file was read with OCR. Check every detected value."] : []),
        ...parsed.warnings
      ]);
      setStatus(`${document.pages} page${document.pages === 1 ? "" : "s"} read. Review the fields below.`);
    } catch (readError) {
      if (readError.name !== "AbortError") setError(readError.message || "Could not read this file.");
    } finally {
      setBusy(false);
      controllerRef.current = null;
    }
  }

  function update(key, value) {
    setValues(previous => ({ ...previous, [key]: value }));
  }

  function apply() {
    onApply(values);
    close();
  }

  return <>
    <button type="button" className="rate-con-button" onClick={() => inputRef.current?.click()} disabled={busy}>
      Upload Rate Confirmation
    </button>
    <input ref={inputRef} className="rate-con-file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={event => { readFile(event.target.files?.[0]); event.target.value = ""; }} />
    {open && <div className="rate-con-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <section className="rate-con-dialog" role="dialog" aria-modal="true" aria-labelledby="rate-con-title">
        <div className="rate-con-dialog-head"><div><h2 id="rate-con-title">Review Rate Confirmation</h2><p>{file?.name}</p></div><button type="button" className="rate-con-close" onClick={close} aria-label="Close">X</button></div>
        {busy && <p className="rate-con-status" role="status">{status || "Reading file..."}</p>}
        {error && <p className="rate-con-error" role="alert">{error}</p>}
        {!busy && !error && <>
          {warnings.length > 0 && <div className="rate-con-warnings"><strong>Check before applying</strong>{warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
          <div className="rate-con-fields">{fields.filter(([key]) => Object.keys(mapRateCon({ [key]: "x" }, context)).length).map(([key, label, type]) => {
            const mapped = mapRateCon({ [key]: "x" }, context);
            const target = Object.keys(mapped)[0] || key;
            if (!["daily", "report"].includes(context) && !mapped[target]) return null;
            return <label key={key}>{label}<input type={type} value={values[target] ?? ""} onChange={event => update(target, event.target.value)} /></label>;
          })}</div>
          <div className="rate-con-actions"><button type="button" className="rate-con-secondary" onClick={close}>Cancel</button><button type="button" onClick={apply} disabled={!Object.keys(values).length}>Apply to load form</button></div>
        </>}
      </section>
    </div>}
  </>;
}