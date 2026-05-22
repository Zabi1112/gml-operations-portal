import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { BranchContext } from "../context/BranchContext";
import { API } from "../api";
import "./Settlements.css";

const Settlements = () => {
  const { selectedBranch } = useContext(BranchContext);

  const token = localStorage.getItem("token");

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const [settlements, setSettlements] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    totalAmountPKR: "",
    dispatcherValue: "",
    dispatcherType: "PERCENTAGE",
    accountsValue: "",
    accountsType: "PERCENTAGE",
    companyName: "",
    settlementDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const [calculatedAmounts, setCalculatedAmounts] = useState({
    dispatcherAmount: 0,
    accountsAmount: 0,
    partnerProfit: 0,
    partnerSplits: []
  });

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchSettlements();
      fetchPartners();
    } else {
      setSettlements([]);
      setPartners([]);
    }
  }, [selectedBranch]);

  useEffect(() => {
    calculateAmounts();
  }, [formData, partners]);

  const fetchSettlements = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API}/finance/settlements?branchId=${selectedBranch.id}`,
        auth
      );

      setSettlements(response.data || []);
    } catch (error) {
      console.error("Error fetching settlements:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await axios.get(
        `${API}/finance/settings/${selectedBranch.id}`,
        auth
      );

      setPartners(response.data?.partners || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
    }
  };

  const calculateAmounts = () => {
    const totalAmount = Number(formData.totalAmountPKR) || 0;
    const dispatcherValue = Number(formData.dispatcherValue) || 0;
    const accountsValue = Number(formData.accountsValue) || 0;

    const dispatcherAmount = (totalAmount * dispatcherValue) / 100;

    let accountsAmount = 0;

    if (formData.accountsType === "PERCENTAGE") {
      accountsAmount = (totalAmount * accountsValue) / 100;
    } else {
      accountsAmount = accountsValue;
    }

    const partnerProfit = totalAmount - dispatcherAmount - accountsAmount;

    const partnerSplits = partners.map((partner) => ({
      partnerId: partner.id,
      name: partner.name,
      percent: Number(partner.percent || 0),
      amountPKR: (partnerProfit * Number(partner.percent || 0)) / 100
    }));

    setCalculatedAmounts({
      dispatcherAmount,
      accountsAmount,
      partnerProfit,
      partnerSplits
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAccountsTypeChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      accountsType: e.target.value,
      accountsValue: ""
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    if (!formData.totalAmountPKR || Number(formData.totalAmountPKR) <= 0) {
      alert("Please enter a valid total amount");
      return;
    }

    if (formData.dispatcherValue === "") {
      alert("Please enter dispatcher percentage");
      return;
    }

    if (formData.accountsValue === "") {
      alert(
        `Please enter accounts ${
          formData.accountsType === "PERCENTAGE" ? "percentage" : "amount"
        }`
      );
      return;
    }

    try {
      await axios.post(
        `${API}/finance/manual-settlement`,
        {
          branchId: selectedBranch.id,
          totalAmountPKR: Number(formData.totalAmountPKR),
          dispatcherValue: Number(formData.dispatcherValue),
          dispatcherType: "PERCENTAGE",
          accountsValue: Number(formData.accountsValue),
          accountsType: formData.accountsType,
          companyName: formData.companyName || "Manual Settlement",
          settlementDate: formData.settlementDate,
          notes: formData.notes
        },
        auth
      );

      alert("Settlement created successfully!");

      setFormData({
        totalAmountPKR: "",
        dispatcherValue: "",
        dispatcherType: "PERCENTAGE",
        accountsValue: "",
        accountsType: "PERCENTAGE",
        companyName: "",
        settlementDate: new Date().toISOString().split("T")[0],
        notes: ""
      });

      setShowForm(false);
      fetchSettlements();
    } catch (error) {
      alert(error.response?.data?.message || "Error creating settlement");
      console.error("Error creating settlement:", error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2
    }).format(Number(value || 0));
  };

  if (!selectedBranch) {
    return (
      <div className="settlements-container">
        <div className="warning-message">
          Please select a branch first.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading settlements...</div>;
  }

  return (
    <div className="settlements-container">
      <div className="settlements-header">
        <h1>Settlement Management</h1>

        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add Manual Settlement"}
        </button>
      </div>

      {showForm && (
        <div className="settlement-form-card">
          <h2>Create Manual Settlement</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Settlement Details</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>Total Amount Received (PKR) *</label>
                  <input
                    type="number"
                    name="totalAmountPKR"
                    value={formData.totalAmountPKR}
                    onChange={handleInputChange}
                    placeholder="Enter total amount received"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Company/Invoice Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="e.g., ABC Company"
                  />
                </div>

                <div className="form-group">
                  <label>Settlement Date</label>
                  <input
                    type="date"
                    name="settlementDate"
                    value={formData.settlementDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Settlement Amounts</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>Dispatcher (%) *</label>
                  <input
                    type="number"
                    name="dispatcherValue"
                    value={formData.dispatcherValue}
                    onChange={handleInputChange}
                    placeholder="Enter percentage"
                    step="0.01"
                  />

                  <div className="amount-preview">
                    Calculated:{" "}
                    {formatCurrency(calculatedAmounts.dispatcherAmount)}
                  </div>
                </div>

                <div className="form-group">
                  <label>Accounts Payment Type *</label>

                  <div className="amount-type-selector-accounts">
                    <label>
                      <input
                        type="radio"
                        name="accountsType"
                        value="PERCENTAGE"
                        checked={formData.accountsType === "PERCENTAGE"}
                        onChange={handleAccountsTypeChange}
                      />
                      Percentage (%)
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="accountsType"
                        value="ABSOLUTE"
                        checked={formData.accountsType === "ABSOLUTE"}
                        onChange={handleAccountsTypeChange}
                      />
                      Absolute (PKR)
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Accounts{" "}
                    {formData.accountsType === "PERCENTAGE"
                      ? "(%)"
                      : "(PKR)"}{" "}
                    *
                  </label>

                  <input
                    type="number"
                    name="accountsValue"
                    value={formData.accountsValue}
                    onChange={handleInputChange}
                    placeholder={
                      formData.accountsType === "PERCENTAGE"
                        ? "Enter percentage"
                        : "Enter amount"
                    }
                    step="0.01"
                  />

                  <div className="amount-preview">
                    Calculated:{" "}
                    {formatCurrency(calculatedAmounts.accountsAmount)}
                  </div>
                </div>
              </div>

              <div className="notes-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes"
                  rows="3"
                />
              </div>
            </div>

            {formData.totalAmountPKR && (
              <div className="calculation-summary">
                <h3>Settlement Summary</h3>

                <div className="summary-row">
                  <span>Total Amount Received:</span>
                  <strong>
                    {formatCurrency(Number(formData.totalAmountPKR))}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Given to Dispatcher:</span>
                  <strong>
                    {formatCurrency(calculatedAmounts.dispatcherAmount)}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Given to Accounts:</span>
                  <strong>
                    {formatCurrency(calculatedAmounts.accountsAmount)}
                  </strong>
                </div>

                <div className="summary-row total">
                  <span>Partner Profit:</span>
                  <strong>
                    {formatCurrency(calculatedAmounts.partnerProfit)}
                  </strong>
                </div>

                {calculatedAmounts.partnerSplits.length > 0 && (
                  <div className="partner-breakdown">
                    <h4>Partner Distribution:</h4>

                    {calculatedAmounts.partnerSplits.map((split) => (
                      <div key={split.partnerId} className="partner-row">
                        <span>
                          {split.name} ({split.percent}%)
                        </span>
                        <span>{formatCurrency(split.amountPKR)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-success">
                Save Settlement
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="settlements-list">
        <h2>Settlement History</h2>

        {settlements.length === 0 ? (
          <p className="no-data">No settlements found</p>
        ) : (
          <table className="settlements-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Company/Reference</th>
                <th>Total Amount</th>
                <th>Type</th>
                <th>Dispatcher</th>
                <th>Accounts</th>
                <th>Partner Profit</th>
                <th>Cleared By</th>
              </tr>
            </thead>

            <tbody>
              {settlements.map((settlement) => (
                <tr key={settlement.id}>
                  <td>
                    {new Date(
                      settlement.settlementDate || settlement.createdAt
                    ).toLocaleDateString()}
                  </td>

                  <td>
                    {settlement.companyName ||
                      settlement.invoiceNumber ||
                      "N/A"}
                  </td>

                  <td>{formatCurrency(settlement.totalAmountPKR)}</td>

                  <td>
                    <span
                      className={`badge badge-${(
                        settlement.amountType || "manual"
                      ).toLowerCase()}`}
                    >
                      {settlement.amountType || "MANUAL"}
                    </span>
                  </td>

                  <td>{formatCurrency(settlement.dispatcherAmountPKR)}</td>
                  <td>{formatCurrency(settlement.accountsAmountPKR)}</td>
                  <td>{formatCurrency(settlement.partnerProfitPKR)}</td>
                  <td>{settlement.clearedBy || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Settlements;