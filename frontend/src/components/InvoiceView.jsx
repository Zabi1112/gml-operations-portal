import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { API } from "../api";
import "./InvoiceView.css";

const InvoiceView = ({ invoice, onClose, onSaved, isPreview = false }) => {
  if (!invoice) return null;

  const token = localStorage.getItem("token");

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const saveInvoice = async () => {
    if (!isPreview || invoice.id) return invoice;

    const res = await axios.post(`${API}/invoices`, invoice, auth);
    return res.data.invoice;
  };

  const handleSave = async () => {
    try {
      await saveInvoice();
      alert("Invoice saved in history");
      if (onSaved) onSaved();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save invoice");
    }
  };

  const handlePrint = async () => {
    try {
      const savedInvoice = await saveInvoice();

      const element = document.querySelector(".invoice-print");
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
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

      const fileName =
        savedInvoice?.invoiceNumber || invoice.invoiceNumber || "invoice";

      pdf.save(`${fileName}.pdf`);

      if (onSaved) onSaved();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create PDF");
    }
  };
  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    });
  };

  const loads = invoice.loads || [];

  return (
    <div className="invoice-modal">
      <div className="invoice-actions no-print">
        <button onClick={onClose}>Close / Edit</button>
        {isPreview && <button onClick={handleSave}>Save to History</button>}
        <button onClick={handlePrint}>Download PDF</button>
      </div>

      <div className="invoice-print">
        <div className="invoice-brand-header">
          <img src="/logo.jpeg" alt="GML Logo" />

          <div>
            <h1>Invoice</h1>
            <p>Get Moving Logistics</p>
          </div>

          <div className="invoice-meta-card">
            <span>Invoice #</span>
            <strong>{invoice.invoiceNumber || "Auto Generated"}</strong>
          </div>
        </div>

        <div className="invoice-company-row">
          <div className="company-block">
            <h3>From</h3>
            <p><strong>Get Moving Logistics</strong></p>
            <p>30 N Gould Street, Sheridan, WY, US 82801</p>
            <p>Phone: (256) 272-4062</p>
            <p>Email: info@getmovinglogistics.org</p>
            <p>Website: www.getmovinglogistics.org</p>
          </div>

          <div className="company-block right">
            <h3>Bill To</h3>
            <p><strong>{invoice.companyName || "-"}</strong></p>
            <p>Owner: {invoice.ownerName || "-"}</p>
            <p>MC #: {invoice.mcNumber || "-"}</p>
            <p>DOT #: {invoice.dotNumber || "-"}</p>
            <p>Phone: {invoice.contactNumber || "-"}</p>
          </div>
        </div>

        <div className="invoice-info-grid">
          <div>
            <span>Invoice Period</span>
            <strong>
              {formatDate(invoice.invoiceStart)} - {formatDate(invoice.invoiceEnd)}
            </strong>
          </div>

          <div>
            <span>Due Date</span>
            <strong>{formatDate(invoice.dueDate)}</strong>
          </div>

          <div>
            <span>Billing Type</span>
            <strong>{invoice.billingType}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{invoice.isCleared ? "Cleared" : "Pending"}</strong>
          </div>

          <div>
            <span>Truck(s)</span>
            <strong>{invoice.truckNumbers || "-"}</strong>
          </div>

          <div>
            <span>Driver(s)</span>
            <strong>{invoice.driverNames || "-"}</strong>
          </div>
        </div>

        {invoice.billingType === "PERCENTAGE" && (
          <>
            <h3 className="section-title">Load Details</h3>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Load Amount</th>
                  <th>Dispatch %</th>
                  <th>Dispatch Amount</th>
                </tr>
              </thead>

              <tbody>
                {loads.map((load, index) => (
                  <tr key={index}>
                    <td>{formatDate(load.date)}</td>
                    <td>{load.pickup || "-"}</td>
                    <td>{load.dropoff || "-"}</td>
                    <td>${Number(load.loadAmount || 0).toFixed(2)}</td>
                    <td>{Number(load.dispatchPercent || invoice.dispatchPercent || 0)}%</td>
                    <td>${Number(load.dispatchAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}

                {loads.length === 0 && (
                  <tr>
                    <td colSpan="6">No loads added.</td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan="3">Totals</td>
                  <td>${Number(invoice.totalLoadAmount || 0).toFixed(2)}</td>
                  <td>{Number(invoice.dispatchPercent || 0)}%</td>
                  <td>${Number(invoice.totalDispatchAmount || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {invoice.billingType === "FIXED" && (
          <>
            <h3 className="section-title">Fixed Billing Details</h3>

            <table className="invoice-table">
              <tbody>
                <tr>
                  <td>Fixed Monthly Rate / Truck</td>
                  <td>${Number(invoice.fixedMonthlyRate || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Selected Trucks</td>
                  <td>{invoice.selectedTruckCount || 0}</td>
                </tr>
                <tr>
                  <td>Fixed Billing Amount</td>
                  <td>${Number(invoice.fixedBillingAmount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <div className="invoice-summary-grid">
          <div className="summary-card">
            <span>Total Load Amount</span>
            <strong>${Number(invoice.totalLoadAmount || 0).toFixed(2)}</strong>
          </div>

          <div className="summary-card">
            <span>Dispatch / Fixed Amount</span>
            <strong>${Number(invoice.totalDispatchAmount || invoice.fixedBillingAmount || 0).toFixed(2)}</strong>
          </div>

          <div className="summary-card">
            <span>Accounts Fee</span>
            <strong>${Number(invoice.accountsFeeTotal || 0).toFixed(2)}</strong>
          </div>

          <div className="summary-card accent">
            <span>Net Payable</span>
            <strong>${Number(invoice.netPayable || 0).toFixed(2)}</strong>
          </div>
        </div>

        <div className="payment-details-block">
          <div className="payment-icon">💳</div>
          <div className="payment-details">
            <h3>Payment Details</h3>
            <p><strong>Account Title:</strong> {invoice.accountTitle || "-"}</p>
            <p><strong>Account Number:</strong> {invoice.accountNumber || "-"}</p>
          </div>
        </div>

        <h3 className="section-title">Accounts Fee & Deductions</h3>

        <table className="summary-table">
          <tbody>
            <tr>
              <td>Accounts Fee ({invoice.accountsFeeWeeks || 0} × ${invoice.accountsFeeRate || 0})</td>
              <td>${Number(invoice.accountsFeeTotal || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>Gross Amount</td>
              <td>${Number(invoice.grossAmount || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>Previous Invoice Amount {invoice.includePreviousInvoiceInNet ? "(Added)" : "(Reference)"}</td>
              <td>${Number(invoice.previousInvoiceAmount || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>Discount</td>
              <td>-${Number(invoice.discountAmount || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>Referral Bonus</td>
              <td>-${Number(invoice.referralBonus || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>Fine {invoice.fineReason ? `(${invoice.fineReason})` : ""}</td>
              <td>-${Number(invoice.fineAmount || 0).toFixed(2)}</td>
            </tr>

            <tr className="net-row">
              <td>Net Payable</td>
              <td>${Number(invoice.netPayable || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {invoice.notes && (
          <div className="invoice-notes">
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}

        <div className="payment-terms-block">
          <div className="note-icon">⚠️</div>
          <div className="note-content">
            <h3>Payment Terms</h3>
            <p>Please clear this invoice by the due date. A 10% late fee may apply for each day past due until payment is completed.</p>
          </div>
        </div>

        <div className="invoice-footer">
          <span>Generated by GML Portal</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;