import "./SettlementView.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function SettlementView({ settlement, onClose }) {
  if (!settlement) return null;

  const partnerSplits = Array.isArray(settlement.partnerSplits)
    ? settlement.partnerSplits
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

  const printSettlement = async () => {
    const element = document.querySelector(".settlement-print");
    if (!element) return;

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
    pdf.save(`settlement-${settlement.invoiceNumber || "report"}.pdf`);
  };

  return (
    <div className="settlement-view-modal">
      <div className="settlement-view-actions no-print">
        <button onClick={onClose}>Close</button>
        <button onClick={printSettlement}>Download PDF</button>
      </div>

      <div className="settlement-print">
        <div className="settlement-header">
          <img src="/logo.jpeg" alt="GML Logo" />
          <div>
            <h1>Invoice Settlement</h1>
            <p>Get Moving Logistics</p>
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
              <td>Dispatcher ({dispatcherValue}%)</td>
              <td>{dispatcherAmountPKR.toLocaleString()}</td>
            </tr>

            <tr>
              <td>{accountsLabel}</td>
              <td>{accountsAmountPKR.toLocaleString()}</td>
            </tr>

            <tr className="net-row">
              <td>Partner Profit</td>
              <td>{partnerProfitPKR.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

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
          <div>
            <span>Admin Signature</span>
            <div className="signature-line"></div>
          </div>

          {partnerSplits.map((partner, index) => (
            <div key={index}>
              <span>{partner.name} Signature</span>
              <div className="signature-line"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SettlementView;