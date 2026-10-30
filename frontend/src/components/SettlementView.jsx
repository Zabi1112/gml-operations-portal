import {loadLetterLogo} from '../hr/letterPdf';
import {createPartnerStatementPdf,loadAccountsSignature} from "../finance/partnerStatementPdf";
import { useState } from "react";
import AccountsOfficeSignature, {waitForAccountsSignature} from "./AccountsOfficeSignature";
import "./SettlementView.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function SettlementView({ settlement, onClose }) {
  const [partnerStatement, setPartnerStatement] = useState(null);
  const [printing, setPrinting] = useState(false);
  if (!settlement) return null;

  const partnerSplits = Array.isArray(settlement.partnerSplits)
    ? settlement.partnerSplits
    : [];

  const dispatcherSplits = Array.isArray(settlement.dispatcherSplits)
    ? settlement.dispatcherSplits
    : [];

  const totalAmountPKR = Number(settlement.totalAmountPKR ?? 0);
  const invoiceAmountUSD = Number(settlement.invoiceAmountUSD ?? 0);
  const usdRate = Number(settlement.usdRate ?? 0);
  const dispatcherValue = Number(settlement.dispatcherValue ?? 0);
  const accountsValue = Number(settlement.accountsValue ?? 0);
  const dispatcherAmountPKR = Number(settlement.dispatcherAmountPKR ?? 0);
  const accountsAmountPKR = Number(settlement.accountsAmountPKR ?? 0);
  const partnerProfitPKR = Number(settlement.partnerProfitPKR ?? 0);

  const accountsLabel =
    settlement.accountsType === "ABSOLUTE"
      ? `Accounts (Fixed PKR)`
      : `Accounts (${accountsValue}%)`;
  const accountsPartner = partnerSplits.find(
    (partner) => Number(partner.partnerId) === Number(settlement.accountsPartnerId)
  );

  const dispatcherLabel =
    settlement.dispatcherType === "ABSOLUTE"
      ? `Dispatcher (Fixed PKR)`
      : `Dispatcher (${dispatcherValue}%)`;

  const printSettlement = async (partner = null) => {
    if(partner){setPrinting(true);try{const doc=createPartnerStatementPdf(settlement,partner,{signature:await loadAccountsSignature(),logo:await loadLetterLogo()});doc.save(`settlement-${settlement.id}-${String(partner.name||"partner").replace(/[^a-z0-9_-]+/gi,"-")}.pdf`);}catch(error){alert(error.message||"Unable to create partner PDF");}finally{setPrinting(false);}return;}
    setPrinting(true);
    if (partner) {
      setPartnerStatement(partner);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } else {
      setPartnerStatement(null);
    }

    const element = document.querySelector(".settlement-print");
    if (!element) {
      setPrinting(false);
      return;
    }

    if (!partner) {
      try {
        await waitForAccountsSignature(element);
      } catch {
        alert("The accounts office signature could not load. Please refresh and try again.");
        setPrinting(false);
        return;
      }
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const safePartnerName = partner?.name
        ?.replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-|-$/g, "");
      pdf.save(
        partner
          ? `settlement-${settlement.invoiceNumber || "report"}-${safePartnerName || "partner"}.pdf`
          : `settlement-${settlement.invoiceNumber || "report"}.pdf`
      );
    } finally {
      setPartnerStatement(null);
      setPrinting(false);
    }
  };

  return (
    <div className="settlement-view-modal">
      <div className="settlement-view-actions no-print">
        <button onClick={onClose}>Close</button>
        <button disabled={printing} onClick={() => printSettlement()}>
          Download Full Settlement PDF
        </button>
        {partnerSplits.map((partner, index) => (
          <button
            key={partner.partnerId ?? `${partner.name}-${index}`}
            disabled={printing}
            onClick={() => printSettlement(partner)}
          >
            Download {partner.name || "Partner"} Statement
          </button>
        ))}
      </div>

      <div className="settlement-print">
        {partnerStatement ? (
          <>
            <div className="settlement-header">
              <img src="/east-west-logo.png" alt="EASTWEST Logistics logo" />
              <div>
                <h1>Partner Settlement Statement</h1>
                <p>EASTWEST Logistics</p>
              </div>
            </div>

            <div className="settlement-info">
              <div>
                <strong>Invoice #:</strong> {settlement.invoiceNumber || "-"}
              </div>
              <div>
                <strong>Company:</strong> {settlement.companyName || "-"}
              </div>
              <div>
                <strong>Settlement Date:</strong>{" "}
                {settlement.clearedAt
                  ? new Date(settlement.clearedAt).toLocaleDateString()
                  : settlement.settlementDate
                  ? new Date(settlement.settlementDate).toLocaleDateString()
                  : "-"}
              </div>
              <div>
                <strong>Partner:</strong> {partnerStatement.name || "Partner"}
              </div>
            </div>

            <h3>Settlement Summary</h3>
            <table className="settlement-table">
              <tbody>
                <tr>
                  <td>Company Generated</td>
                  <td>{totalAmountPKR.toLocaleString()} PKR</td>
                </tr>
                <tr>
                  <td>Given to Dispatch</td>
                  <td>{dispatcherAmountPKR.toLocaleString()} PKR</td>
                </tr>
                <tr className="settlement-net-row">
                  <td>Your Partner Share</td>
                  <td>
                    {Number(partnerStatement.amountPKR || 0).toLocaleString()} PKR
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
        <div className="settlement-header">
          <img src="/east-west-logo.png" alt="EASTWEST Logistics logo" />
          <div>
            <h1>Invoice Settlement</h1>
            <p>EASTWEST Logistics</p>
          </div>
        </div>

        <div className="settlement-info">
          <div>
            <strong>Invoice #:</strong> {settlement.invoiceNumber || "-"}
          </div>
          <div>
            <strong>Company:</strong> {settlement.companyName || "-"}
          </div>
          <div>
            <strong>Cleared By:</strong> {settlement.clearedBy || "-"}
          </div>
          <div>
            <strong>Cleared Date:</strong>{" "}
            {settlement.clearedAt
              ? new Date(settlement.clearedAt).toLocaleString()
              : settlement.settlementDate
              ? new Date(settlement.settlementDate).toLocaleString()
              : "-"}
          </div>
        </div>

        <h3>Settlement Breakdown</h3>

        <table className="settlement-table">
          <tbody>
            <tr>
              <td>Invoice Amount USD</td>
              <td>{invoiceAmountUSD > 0 ? `$${invoiceAmountUSD.toFixed(2)}` : "-"}</td>
            </tr>

            <tr>
              <td>USD Rate</td>
              <td>{usdRate > 0 ? usdRate.toFixed(2) : "-"}</td>
            </tr>

            <tr>
              <td>Invoice Amount PKR</td>
              <td>{totalAmountPKR.toLocaleString()}</td>
            </tr>

            <tr>
              <td>{dispatcherLabel}</td>
              <td>{dispatcherAmountPKR.toLocaleString()}</td>
            </tr>

            <tr>
                  <td>
                    {accountsLabel}
                    {accountsPartner ? ` - deducted from ${accountsPartner.name}` : ""}
                  </td>
              <td>{accountsAmountPKR.toLocaleString()}</td>
            </tr>

            <tr className="settlement-net-row">
              <td>Partner Profit</td>
              <td>{partnerProfitPKR.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {dispatcherSplits.length > 0 && (
          <>
            <h3>Dispatcher Split</h3>

            <table className="settlement-table">
              <thead>
                <tr>
                  <th>Dispatcher</th>
                  <th>Amount PKR</th>
                </tr>
              </thead>

              <tbody>
                {dispatcherSplits.map((dispatcher, index) => (
                  <tr key={index}>
                    <td>{dispatcher.name}</td>
                    <td>{Number(dispatcher.amountPKR || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h3>Partner Split</h3>

        <table className="settlement-table">
          <thead>
            <tr>
              <th>Partner</th>
              <th>Percentage</th>
              <th>Amount PKR</th>
            </tr>
          </thead>

          <tbody>
            {partnerSplits.map((partner, index) => (
              <tr key={index}>
                <td>{partner.name}</td>
                <td>{partner.percent}%</td>
                <td>{Number(partner.amountPKR || 0).toLocaleString()}</td>
              </tr>
            ))}

            {partnerSplits.length === 0 && (
              <tr>
                <td colSpan="3">No partner split found.</td>
              </tr>
            )}
          </tbody>
        </table>

        {settlement.notes && (
          <div className="settlement-notes">
            <strong>Notes:</strong> {settlement.notes}
          </div>
        )}

        <div className="signature-section">
          <AccountsOfficeSignature />
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SettlementView;