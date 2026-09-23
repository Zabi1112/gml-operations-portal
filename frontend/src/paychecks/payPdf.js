import { jsPDF } from "jspdf";
import { money } from "./payDefaults.js";
export function createPayPdf(snapshot, record = {}) {
  const { form: f, loads, totals: t } = snapshot;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth(); const margin = 40; const usable = width - 80;
  const title = f.recipientType === "DRIVER" ? "DRIVER PAY STATEMENT" : "OWNER-OPERATOR STATEMENT";
  let y = 46;
  const normal = (size = 9) => { doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(30, 45, 58); };
  const newPage = () => { doc.addPage(); normal(9); doc.text(title + " - continued", margin, 30); y = 50; };
  const ensure = height => { if (y + height > 780) newPage(); };
  let companyX = margin;
  if (f.companyLogo) {
    const props = doc.getImageProperties(f.companyLogo); const scale = Math.min(65 / props.width, 65 / props.height);
    doc.addImage(f.companyLogo, "PNG", margin, y - 8, props.width * scale, props.height * scale); companyX += 78;
  }
  normal(16); doc.setFont("helvetica", "bold");
  const companyLines = doc.splitTextToSize(f.companyName, 285 - (companyX - margin));
  doc.text(companyLines, companyX, y); const headerBottom = y + companyLines.length * 19;
  normal(10); doc.setFont("helvetica", "bold");
  doc.text(doc.splitTextToSize(title, 170), width - margin, y, { align: "right" });
  normal(9); doc.text(f.periodStart + " to " + f.periodEnd, width - margin, y + 32, { align: "right" });
  doc.text(record.id ? "PS-" + record.id + " | Revision " + record.revision : "DRAFT PREVIEW", width - margin, y + 47, { align: "right" });
  y = Math.max(headerBottom + 4, y + 76);
  normal(9);
  for (const line of ["MC: " + (f.mcNumber || "-") + "     USDOT: " + (f.dotNumber || "-"), f.companyAddress, f.companyPhone].filter(Boolean)) {
    const lines = doc.splitTextToSize(line, usable); doc.text(lines, margin, y); y += lines.length * 12 + 3;
  }
  doc.setDrawColor(24, 86, 113); doc.setLineWidth(2); doc.line(margin, y, width - margin, y); y += 22;
  function paragraph(text) {
    normal(); for (const line of doc.splitTextToSize(text, usable)) { ensure(14); doc.text(line, margin, y); y += 14; } y += 6;
  }
  paragraph((f.recipientType === "DRIVER" ? "Driver: " : "Owner-operator: ") + f.recipientName + " | Phone: " + (f.recipientPhone || "-"));
  paragraph("Truck: " + (f.truckNumber || "-") + " | Trailer: " + (f.trailerNumber || "-"));
  function table(heading, headers, rows, proportions) {
    const widths = proportions.map(p => usable * p); ensure(66);
    normal(11); doc.setFont("helvetica", "bold"); doc.text(heading, margin, y); y += 12;
    function header() {
      doc.setFillColor(24, 86, 113); doc.rect(margin, y, usable, 25, "F"); doc.setTextColor(255); doc.setFontSize(8); doc.setFont("helvetica", "bold");
      let x = margin; headers.forEach((h, i) => { doc.text(h, x + 5, y + 16); x += widths[i]; }); y += 25;
    }
    header();
    rows.forEach((row, rowIndex) => {
      normal(8); const cells = row.map((value, i) => doc.splitTextToSize(String(value), widths[i] - 10));
      const height = Math.max(24, ...cells.map(lines => lines.length * 11 + 12));
      if (y + height > 780) { newPage(); header(); normal(8); }
      if (rowIndex % 2 === 0) { doc.setFillColor(240, 246, 248); doc.rect(margin, y, usable, height, "F"); }
      let x = margin;
      cells.forEach((lines, i) => { doc.text(lines, x + 5, y + 14); x += widths[i]; });
      doc.setDrawColor(215); doc.setLineWidth(0.4); doc.line(margin, y + height, width - margin, y + height); y += height;
    }); y += 22;
  }
  table("LOAD EARNINGS", ["Pickup", "Origin / Ref", "Delivery", "Destination", "Miles", "Gross", "Pay"], loads.map(l => [l.pickupDate, l.origin + (l.reference ? " / " + l.reference : ""), l.deliveryDate, l.destination, l.miles.toLocaleString("en-US"), money(l.grossCents), money(l.payCents)]), [.115, .19, .115, .19, .09, .15, .15]);
  paragraph("Total miles: " + t.totalMiles.toLocaleString("en-US") + " | Total load gross: " + money(t.grossCents));
  paragraph(f.recipientType === "DRIVER" ? "Driver earnings: " + f.percent + "% of gross = " + money(t.earnedCents) : "Owner-operator gross earnings: " + money(t.earnedCents));
  const charges = f.deductions.map(r => [r.description, r.frequency === "WEEKLY" ? money(Math.round(r.rate * 100)) + " x " + f.weeks + " weeks" : "Per statement", money(r.amountCents)]);
  if (f.recipientType === "OWNER_OPERATOR") charges.unshift(["Carrier percentage deduction", f.percent + "% of gross", money(t.feeCents)]);
  table("DEDUCTIONS & ADJUSTMENTS", ["Description", "Calculation", "Amount"], [...charges, ["TOTAL DEDUCTIONS", "", money(t.totalDeductionsCents)]], [.48, .32, .20]);
  if (f.additions.length) table("ADDITIONAL EARNINGS", ["Description", "Calculation", "Amount"], [...f.additions.map(r => [r.description, r.frequency === "WEEKLY" ? money(Math.round(r.rate * 100)) + " x " + f.weeks + " weeks" : "Per statement", money(r.amountCents)]), ["TOTAL ADDITIONS", "", money(t.additionsCents)]], [.48, .32, .20]);
  ensure(90); doc.setFillColor(24, 86, 113); doc.rect(margin, y, usable, 40, "F"); doc.setTextColor(255); doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("NET PAYABLE (USD)", margin + 12, y + 26); doc.text(money(t.netCents), width - margin - 12, y + 26, { align: "right" }); y += 60;
  if (t.netCents < 0) paragraph("Deductions exceed earnings. Negative balance shown for review.");
  if (f.notes) paragraph("Notes: " + f.notes);
  paragraph("Payment is handled by " + f.companyName + ". This statement is not proof of payment.");
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) { doc.setPage(page); normal(8); doc.text((record.id ? "PS-" + record.id + " / Rev " + record.revision : "Draft preview") + " | USD", margin, 817); doc.text("Page " + page + " of " + pages, width - margin, 817, { align: "right" }); }
  return doc;
}
