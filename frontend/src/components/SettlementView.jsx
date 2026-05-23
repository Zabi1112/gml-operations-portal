import "./SettlementView.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function SettlementView({ settlement, onClose }) {
  if (!settlement) return null;

  const partnerSplits = Array.isArray(settlement.partnerSplits)
    ? settlement.partnerSplits
    : [];

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
        <button onClick={printSettlement}>DownloadPDF</button>
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
              : "-"}
          </div>
        </div>

        <h3>Settlement Breakdown</h3>

        <table className="settlement-table">
          <tbody>
            <tr>
              <td>Invoice Amount USD</td>
              <td>${Number(settlement.invoiceAmountUSD || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>USD Rate</td>
              <td>{Number(settlement.usdRate || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>Invoice Amount PKR</td>
              <td>{Number(settlement.invoiceAmountPKR || 0).toFixed(0)}</td>
            </tr>

            <tr>
              <td>Dispatcher ({settlement.dispatcherPercent}%)</td>
              <td>{Number(settlement.dispatcherAmountPKR || 0).toFixed(0)}</td>
            </tr>

            <tr>
              <td>Accounts ({settlement.accountsPercent}%)</td>
              <td>{Number(settlement.accountsAmountPKR || 0).toFixed(0)}</td>
            </tr>

            <tr className="net-row">
              <td>Partner Profit</td>
              <td>{Number(settlement.partnerProfitPKR || 0).toFixed(0)}</td>
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
                <td>{Number(partner.amountPKR || 0).toFixed(0)}</td>
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