import axios from "axios";
import "./InvoiceView.css";

const API = "http://localhost:5000/api";

function InvoiceView({ invoice, onClose, onSaved, isPreview = false }) {
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
      await saveInvoice();

      setTimeout(() => {
        window.print();
        if (onSaved) onSaved();
      }, 200);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save before print");
    }
  };

  return (
    <div className="invoice-modal">
      <div className="invoice-actions no-print">
        <button onClick={onClose}>Close / Edit</button>
        {isPreview && <button onClick={handleSave}>Save to History</button>}
        <button onClick={handlePrint}>Print / Save PDF</button>
      </div>

      <div className="invoice-print">
        <h1>Invoice</h1>

        <div className="invoice-header">
          <div>
            <h3>Get Moving Logistics</h3>
            <p><strong>Address:</strong> 30 N Gould Street, Sheridan, WY, US 82801</p>
            <p><strong>Phone:</strong> (256) 272-4062</p>
            <p><strong>Email:</strong> info@getmovinglogistics.org</p>
            <p><strong>Website:</strong> www.getmovinglogistics.org</p>
            <p><strong>Account Number:</strong> {invoice.accountNumber || "-"}</p>
            <p><strong>Account Title:</strong> {invoice.accountTitle || "-"}</p>
          </div>

          <div className="invoice-right">
            <p><strong>Invoice #:</strong> {invoice.invoiceNumber || "-"}</p>
            <p><strong>Company:</strong> {invoice.companyName || "-"}</p>
            <p><strong>Owner:</strong> {invoice.ownerName || "-"}</p>
            <p><strong>MC #:</strong> {invoice.mcNumber || "-"}</p>
            <p><strong>DOT #:</strong> {invoice.dotNumber || "-"}</p>
            <p><strong>Phone:</strong> {invoice.contactNumber || "-"}</p>
          </div>
        </div>

        <div className="invoice-dates">
          <p>
            <strong>Invoice Period:</strong>{" "}
            {new Date(invoice.invoiceStart).toLocaleDateString()} -{" "}
            {new Date(invoice.invoiceEnd).toLocaleDateString()}
          </p>

          <p>
            <strong>Due Date:</strong>{" "}
            {invoice.dueDate
              ? new Date(invoice.dueDate).toLocaleDateString()
              : "-"}
          </p>

          <p><strong>Truck(s):</strong> {invoice.truckNumbers || "-"}</p>
          <p><strong>Driver(s):</strong> {invoice.driverNames || "-"}</p>
        </div>

        {invoice.billingType === "PERCENTAGE" && (
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
              {invoice.loads?.map((load, index) => (
                <tr key={index}>
                  <td>{new Date(load.date).toLocaleDateString()}</td>
                  <td>{load.pickup}</td>
                  <td>{load.dropoff}</td>
                  <td>${Number(load.loadAmount || 0).toFixed(2)}</td>
                  <td>{load.dispatchPercent}%</td>
                  <td>${Number(load.dispatchAmount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan="3"><strong>Totals</strong></td>
                <td>${Number(invoice.totalLoadAmount || 0).toFixed(2)}</td>
                <td>{invoice.dispatchPercent}%</td>
                <td>${Number(invoice.totalDispatchAmount || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {invoice.billingType === "FIXED" && (
          <table className="summary-table fixed-table">
            <tbody>
              <tr>
                <td>Billing Type</td>
                <td>Fixed Monthly Per Truck</td>
              </tr>
              <tr>
                <td>Fixed Monthly Rate</td>
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
        )}

        <h3>Accounts Fee & Deductions Summary</h3>

        <table className="summary-table">
          <tbody>
            <tr>
              <td>Accounts Fee ({invoice.accountsFeeWeeks} × ${invoice.accountsFeeRate})</td>
              <td>${Number(invoice.accountsFeeTotal || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>
                Gross (
                {invoice.billingType === "FIXED"
                  ? "Fixed Billing + Accounts Fee"
                  : "Dispatch + Accounts Fee"}
                )
              </td>
              <td>${Number(invoice.grossAmount || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>
                Previous Invoice Amount{" "}
                {invoice.includePreviousInvoiceInNet ? "(Added)" : "(Reference)"}
              </td>
              <td>${Number(invoice.previousInvoiceAmount || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>Less: Discounts</td>
              <td>-${Number(invoice.discountAmount || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>Less: Referral Bonus</td>
              <td>-${Number(invoice.referralBonus || 0).toFixed(2)}</td>
            </tr>

            <tr>
              <td>
                Less: Fine{" "}
                {invoice.fineReason ? `(${invoice.fineReason})` : ""}
              </td>
              <td>-${Number(invoice.fineAmount || 0).toFixed(2)}</td>
            </tr>

            <tr className="net-row">
              <td>Net Payable</td>
              <td>${Number(invoice.netPayable || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div className="invoice-warning">
          <strong>⚠️ Please Note:</strong>
          <br />
          Please clear them by the due date to avoid charges — a 10% late fee
          will apply for each day past due until payment.
        </div>
      </div>
    </div>
  );
}

export default InvoiceView;