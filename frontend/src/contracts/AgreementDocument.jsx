import { useState } from "react";
import { jsPDF } from "jspdf";

async function downloadAgreement(agreement) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const receipt = agreement.status === "SIGNED"
    ? "\n\nCARRIER ELECTRONIC SIGNATURE\nName: " + agreement.signerName + "\nSigned at (UTC): " + new Date(agreement.signedAt).toISOString() + "\n" + agreement.consentText
    : "\n\nStatus: " + agreement.status + " (not signed)";
  const text = agreement.termsText + receipt + "\n\nAgreement ID: EWL-" + agreement.id + "\nTemplate: " + agreement.templateVersion + "\nDocument SHA-256: " + agreement.documentHash;
  const lines = doc.splitTextToSize(text, 495);
  let y = 48;
  for (const line of lines) {
    if (y > 780) { doc.addPage(); y = 48; }
    doc.text(line, 48, y); y += 14;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8);
    doc.text("EastWestLogisticsLLC | EWL-" + agreement.id + " | " + i + "/" + pages, 48, 817);
  }
  doc.save("EWL-Agreement-" + agreement.id + ".pdf");
}
export default function AgreementDocument({ agreement }) {
  const [error, setError] = useState("");
  return <article className="agreement-document">
    <header className="agreement-brand"><img src="/east-west-logo.png" alt="EastWestLogisticsLLC" /><div><strong>EastWestLogisticsLLC</strong><p>Freight Dispatch Agreement</p></div></header>
    <div className="contract-actions"><span className={"contract-status status-" + agreement.status.toLowerCase()}>{agreement.status}</span><button type="button" onClick={() => downloadAgreement(agreement).catch(() => setError("PDF could not be downloaded. Please try again."))}>Download PDF</button></div>
    {error && <p role="alert" className="contract-error">{error}</p>}
    <div className="agreement-text">{agreement.termsText}</div>
    {agreement.status === "SIGNED" && <section className="signature-receipt"><h3>Carrier electronic signature</h3><p className="typed-signature">{agreement.signerName}</p><p>{agreement.consentText}</p><p>Signed: {new Date(agreement.signedAt).toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p></section>}
    <p className="contract-fingerprint">Agreement EWL-{agreement.id} &middot; Template {agreement.templateVersion}<br />Document SHA-256: {agreement.documentHash}</p>
  </article>;
}
