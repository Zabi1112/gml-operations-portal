import { useState } from "react";
import axios from "axios";
import { API } from "../api";
import DispatcherSplitEditor from "./DispatcherSplitEditor";

function SettlementEditModal({ settlement, dispatchers, partners, auth, onClose, onSaved }) {
  const [form, setForm] = useState({
    companyName: settlement.companyName || "",
    totalAmountPKR: settlement.totalAmountPKR ?? 0,
    dispatcherType: settlement.dispatcherType || "PERCENTAGE",
    dispatcherValue: settlement.dispatcherValue ?? 0,
    dispatcherSplits: Array.isArray(settlement.dispatcherSplits)
      ? settlement.dispatcherSplits.map((s) => ({
          dispatcherId: String(s.dispatcherId),
          amount: s.amountPKR
        }))
      : [],
    accountsType: settlement.accountsType || "PERCENTAGE",
    accountsValue: settlement.accountsValue ?? 0,
    settlementDate: settlement.settlementDate
      ? String(settlement.settlementDate).slice(0, 10)
      : "",
    notes: settlement.notes || ""
  });
  const [saving, setSaving] = useState(false);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0
    }).format(Number(value || 0));

  const totalAmount = Number(form.totalAmountPKR) || 0;

  const dispatcherAmount =
    form.dispatcherType === "ABSOLUTE"
      ? Number(form.dispatcherValue) || 0
      : (totalAmount * (Number(form.dispatcherValue) || 0)) / 100;

  const accountsAmount =
    form.accountsType === "ABSOLUTE"
      ? Number(form.accountsValue) || 0
      : (totalAmount * (Number(form.accountsValue) || 0)) / 100;

  const partnerProfit = totalAmount - dispatcherAmount - accountsAmount;

  const partnerSplitsPreview = partners.map((partner) => ({
    partnerId: partner.id,
    name: partner.name,
    percent: Number(partner.percent || 0),
    amountPKR: (partnerProfit * Number(partner.percent || 0)) / 100
  }));

  const splitsTotal = form.dispatcherSplits.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalAmount <= 0) return alert("Please enter a valid total amount");
    if (splitsTotal > dispatcherAmount + 1) {
      return alert("Dispatcher split amounts cannot exceed the total dispatcher amount");
    }

    try {
      setSaving(true);
      const res = await axios.patch(
        `${API}/finance/settlements/${settlement.id}`,
        {
          companyName: form.companyName,
          totalAmountPKR: totalAmount,
          dispatcherType: form.dispatcherType,
          dispatcherValue: Number(form.dispatcherValue) || 0,
          dispatcherSplits: form.dispatcherSplits,
          accountsType: form.accountsType,
          accountsValue: Number(form.accountsValue) || 0,
          settlementDate: form.settlementDate,
          notes: form.notes
        },
        auth
      );
      alert("Settlement updated successfully!");
      onSaved(res.data?.settlement);
    } catch (error) {
      alert(error.response?.data?.message || "Error updating settlement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settlement-modal">
      <div className="settlement-box wide-box">
        <h2>Edit Settlement</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company/Invoice Name</label>
            <input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Total Amount Received (PKR) *</label>
            <input
              type="number"
              value={form.totalAmountPKR}
              onChange={(e) => setForm({ ...form, totalAmountPKR: e.target.value })}
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Settlement Date</label>
            <input
              type="date"
              value={form.settlementDate}
              onChange={(e) => setForm({ ...form, settlementDate: e.target.value })}
            />
          </div>

          <div style={{ marginTop: "10px" }}>
            <label style={{ fontWeight: 600, color: "#333", fontSize: "14px" }}>
              Dispatcher Payment Type
            </label>
            <DispatcherSplitEditor
              dispatchers={dispatchers}
              dispatcherType={form.dispatcherType}
              dispatcherValue={form.dispatcherValue}
              onDispatcherTypeChange={(type) => setForm({ ...form, dispatcherType: type })}
              onDispatcherValueChange={(value) => setForm({ ...form, dispatcherValue: value })}
              dispatcherAmount={dispatcherAmount}
              splits={form.dispatcherSplits}
              onSplitsChange={(splits) => setForm({ ...form, dispatcherSplits: splits })}
              formatCurrency={formatCurrency}
            />
          </div>

          <div className="form-group" style={{ marginTop: "10px" }}>
            <label>Accounts Payment Type</label>
            <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="radio"
                  name="editAccountsType"
                  value="PERCENTAGE"
                  checked={form.accountsType === "PERCENTAGE"}
                  onChange={() => setForm({ ...form, accountsType: "PERCENTAGE", accountsValue: "" })}
                />
                Percentage (%)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="radio"
                  name="editAccountsType"
                  value="ABSOLUTE"
                  checked={form.accountsType === "ABSOLUTE"}
                  onChange={() => setForm({ ...form, accountsType: "ABSOLUTE", accountsValue: "" })}
                />
                Absolute (PKR)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Accounts {form.accountsType === "PERCENTAGE" ? "(%)" : "(PKR)"}</label>
            <input
              type="number"
              value={form.accountsValue}
              onChange={(e) => setForm({ ...form, accountsValue: e.target.value })}
              step="0.01"
            />
            <div className="amount-preview">Calculated: {formatCurrency(accountsAmount)}</div>
          </div>

          <div className="calculation-summary">
            <h3>Settlement Summary</h3>
            <div className="summary-row">
              <span>Total Amount Received:</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>Given to Dispatcher:</span>
              <strong>{formatCurrency(dispatcherAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>Given to Accounts:</span>
              <strong>{formatCurrency(accountsAmount)}</strong>
            </div>
            <div className="summary-row total">
              <span>Partner Profit:</span>
              <strong>{formatCurrency(partnerProfit)}</strong>
            </div>
            {partnerSplitsPreview.length > 0 && (
              <div className="partner-breakdown">
                <h4>Partner Distribution:</h4>
                {partnerSplitsPreview.map((split) => (
                  <div key={split.partnerId} className="partner-row">
                    <span>{split.name} ({split.percent}%)</span>
                    <span>{formatCurrency(split.amountPKR)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows="3"
            />
          </div>

          <div className="settlement-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettlementEditModal;
