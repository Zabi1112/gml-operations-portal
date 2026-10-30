import {groupInvoiceLoads} from "../invoices/groupLoads";
import axios from "axios";
import { useState } from "react";
import { API } from "../api";
import "./InvoiceView.css";

const invoiceAddresses = {
  usa: {
    label: "United States",
    address: "5 Hillcrest Dr, Downingtown, PA 19335"
  },
  pakistan: {
    label: "Pakistan",
    address: "Office #1, 3rd Floor, Al Rehmat Plaza, Haji Pura Chowk, Wazirabad"
  }
};

const InvoiceView = ({ invoice, onClose, onSaved, isPreview = false }) => {
  const [addressSelection, setAddressSelection] = useState({ invoice, key: "usa" });
  const addressKey =
    addressSelection.invoice === invoice ? addressSelection.key : "usa";

  if (!invoice) return null;

  const selectedAddress = invoiceAddresses[addressKey];
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

      const element = document.querySelector(".invoice-print");
      if (!element) return;

      const heightPx = element.scrollHeight;
      const heightMm = Math.ceil(heightPx * 0.264583) + 20;

      const oldStyle = document.getElementById("dynamic-invoice-print-size");
      if (oldStyle) oldStyle.remove();

      const style = document.createElement("style");
      style.id = "dynamic-invoice-print-size";
      style.innerHTML = `
      @media print {
        @page {
          size: 210mm ${heightMm}mm;
          margin: 0;
        }
      }
    `;

      document.head.appendChild(style);
      window.print();

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
  const receivedAmount = Number(invoice.receivedAmountUSD || 0);
  const remainingPayable = Number(
    invoice.outstandingAmountUSD ?? invoice.netPayable ?? 0
  );

  return (
    <div className="invoice-modal">
      <div className="invoice-actions no-print">
        <button onClick={onClose}>Close / Edit</button>
        {isPreview && <button onClick={handleSave}>Save to History</button>}
        <label className="invoice-address-choice">
          Company address
          <select
            value={addressKey}
            onChange={(event) =>
              setAddressSelection({ invoice, key: event.target.value })
            }
          >
            {Object.entries(invoiceAddresses).map(([key, address]) => (
              <option key={key} value={key}>
                {address.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handlePrint}>Download PDF</button>
      </div>

      <div className="invoice-print">
        <div className="invoice-brand-header">
          <img src="/east-west-logo.png" alt="EASTWEST Logistics logo" />

          <div>
            <h1>Invoice</h1>
            <p>EASTWEST Logistics</p>
          </div>

          <div className="invoice-meta-card">
            <span>Invoice #</span>
            <strong>{invoice.invoiceNumber || "Auto Generated"}</strong>
          </div>
        </div>

        <div className="invoice-company-row">
          <div className="company-block">
            <h3>From</h3>
            <p><strong>EASTWEST Logistics</strong></p>
            <p>{selectedAddress.label}<br />{selectedAddress.address}</p>
            <p>Phone: (409) 248-2002<br />+92 344 6060933</p>
            <p>Email: info@eastandwestlogistics.com</p>
            <p>Website: https://eastandwestlogistics.com/</p>
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
            <strong>{invoice.balanceTransferredToInvoiceId ? "Balance carried forward" : invoice.isCleared ? "Paid" : invoice.paymentStatus === "PARTIAL" ? "Partially paid" : "Pending"}</strong>
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

              {groupInvoiceLoads(loads).map(group => <tbody key={group.key}>
                <tr className="invoice-driver-heading"><th colSpan="6" scope="rowgroup">Driver: {group.name}</th></tr>
                {group.loads.map((load, index) => (
                  <tr key={index}>
                    <td>{formatDate(load.date)}</td>
                    <td>{load.pickup || "-"}</td>
                    <td>{load.dropoff || "-"}</td>
                    <td>${Number(load.loadAmount || 0).toFixed(2)}</td>
                    <td>{Number(load.dispatchPercent || invoice.dispatchPercent || 0)}%</td>
                    <td>${Number(load.dispatchAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}

              </tbody>)}
              {loads.length === 0 && <tbody>
                {loads.length === 0 && (
                  <tr>
                    <td colSpan="6">No loads added.</td>
                  </tr>
                )}
              </tbody>}

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

            {invoice.truckRateBreakdown && invoice.truckRateBreakdown.length > 0 ? (
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Truck</th>
                    <th>Rate</th>
                  </tr>
                </thead>

                <tbody>
                  {invoice.truckRateBreakdown.map((truck, index) => (
                    <tr key={index}>
                      <td>{truck.truckNumber || "-"}</td>
                      <td>${Number(truck.rate || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <td>Fixed Billing Amount</td>
                    <td>${Number(invoice.fixedBillingAmount || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
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
            )}
          </>
        )}

        {invoice.balanceTransferredToInvoiceId && <p style={{margin:"16px 32px"}}>Historical balance consolidated into a later invoice. This is not a payment receipt.</p>}
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
              <td>Previous unpaid balance {invoice.includePreviousInvoiceInNet ? "(Added)" : "(Reference)"}</td>
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
            {!invoice.balanceTransferredToInvoiceId && (
              <>
                <tr className="payment-row received-row">
                  <td>Received Amount</td>
                  <td>${receivedAmount.toFixed(2)}</td>
                </tr>
                <tr className="payment-row remaining-row">
                  <td>Remaining Payable</td>
                  <td>${remainingPayable.toFixed(2)}</td>
                </tr>
              </>
            )}
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
          <span>Generated by EASTWEST Logistics Portal</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;