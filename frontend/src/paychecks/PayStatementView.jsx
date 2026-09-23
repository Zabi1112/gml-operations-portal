import { useState } from "react";
import { money } from "./payDefaults";
import { createPayPdf } from "./payPdf";
export default function PayStatementView({ snapshot, record }) {
  const [error, setError] = useState("");
  const { form: f, loads, totals: t } = snapshot;
  function download() {
    try { createPayPdf(snapshot, record).save("Pay-Statement-" + (record?.id || "Draft") + ".pdf"); }
    catch { setError("Unable to generate the PDF. Please check the company logo and try again."); }
  }
  return <section className="pay-preview">
    <div className="pay-actions"><strong>{record?.id ? "Saved statement PS-" + record.id + " / Revision " + record.revision : "Draft preview"}</strong><button type="button" onClick={download}>Download PDF</button></div>
    {error && <p role="alert" className="pay-error">{error}</p>}
    <article className="pay-document">
      <header className="pay-doc-header"><div className="pay-company">{f.companyLogo && <img src={f.companyLogo} alt={f.companyName + " logo"} />}<div><h2>{f.companyName}</h2><p>MC # {f.mcNumber || "-"} &nbsp; USDOT # {f.dotNumber || "-"}</p><p>{f.companyAddress}</p><p>{f.companyPhone}</p></div></div><div><h3>{f.recipientType === "DRIVER" ? "DRIVER PAY STATEMENT" : "OWNER-OPERATOR STATEMENT"}</h3><p>{f.periodStart} to {f.periodEnd}</p></div></header>
      <div className="pay-recipient"><div><strong>{f.recipientType === "DRIVER" ? "Driver" : "Owner-operator"}</strong><br />{f.recipientName}</div><div><strong>Phone</strong><br />{f.recipientPhone || "-"}</div><div><strong>Truck #</strong><br />{f.truckNumber || "-"}</div><div><strong>Trailer #</strong><br />{f.trailerNumber || "-"}</div></div>
      <h3>LOAD EARNINGS</h3><div className="pay-table-wrap"><table><thead><tr><th>Pickup</th><th>Origin / Ref</th><th>Delivery</th><th>Destination</th><th>Miles</th><th>Gross</th><th>Pay</th></tr></thead><tbody>{loads.map((l, i) => <tr key={i}><td>{l.pickupDate}</td><td>{l.origin}{l.reference && <><br />{l.reference}</>}</td><td>{l.deliveryDate}</td><td>{l.destination}</td><td>{l.miles.toLocaleString("en-US")}</td><td>{money(l.grossCents)}</td><td>{money(l.payCents)}</td></tr>)}</tbody><tfoot><tr><th colSpan="4">TOTAL</th><th>{t.totalMiles.toLocaleString("en-US")}</th><th>{money(t.grossCents)}</th><th>{money(t.earnedCents)}</th></tr></tfoot></table></div>
      {f.recipientType === "DRIVER" && <p>Driver pay: {f.percent}% of total gross.</p>}
      <h3>DEDUCTIONS & ADJUSTMENTS</h3><table><thead><tr><th>Description</th><th>Calculation</th><th>Amount</th></tr></thead><tbody>{f.recipientType === "OWNER_OPERATOR" && <tr><td>Carrier percentage deduction</td><td>{f.percent}% of gross</td><td>{money(t.feeCents)}</td></tr>}{f.deductions.map((r, i) => <tr key={i}><td>{r.description}</td><td>{r.frequency === "WEEKLY" ? money(Math.round(r.rate * 100)) + " x " + f.weeks + " weeks" : "Per statement"}</td><td>{money(r.amountCents)}</td></tr>)}</tbody><tfoot><tr><th colSpan="2">TOTAL DEDUCTIONS</th><th>{money(t.totalDeductionsCents)}</th></tr></tfoot></table>
      {f.additions.length > 0 && <><h3>ADDITIONAL EARNINGS</h3><table><tbody>{f.additions.map((r, i) => <tr key={i}><td>{r.description}</td><td>{money(r.amountCents)}</td></tr>)}</tbody><tfoot><tr><th>Total additions</th><th>{money(t.additionsCents)}</th></tr></tfoot></table></>}
      <div className="pay-net"><strong>NET PAYABLE (USD)</strong><strong>{money(t.netCents)}</strong></div>
      {t.netCents < 0 && <p className="pay-error">Deductions exceed earnings. Negative balance shown for review.</p>}
      {f.notes && <p className="pay-notes">Notes: {f.notes}</p>}
      <footer>Payment is handled by {f.companyName}. This statement is not proof of payment.</footer>
    </article>
  </section>;
}
