import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { BranchContext } from "../context/BranchContext";
import { API } from "../api";
import "./Settlements.css";

const Settlements = () => {
  const { selectedBranch } = useContext(BranchContext);
  const token = localStorage.getItem("token");
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const emptyForm = {
    totalAmountPKR: "",
    totalAmountUSD: "",
    dollarRate: "",
    dispatcherValue: "",
    dispatcherType: "PERCENTAGE",
    accountsValue: "",
    accountsType: "PERCENTAGE",
    companyName: "",
    settlementDate: new Date().toISOString().split("T")[0],
    notes: ""
  };

  const emptyLoanForm = {
    lenderPartnerId: "",
    borrowerPartnerId: "",
    amount: "",
    note: "",
    loanDate: new Date().toISOString().split("T")[0]
  };

  const emptyRepaymentForm = {
    amount: "",
    note: "",
    paidDate: new Date().toISOString().split("T")[0]
  };

  const [activeSection, setActiveSection] = useState("settlements");
  const [settlements, setSettlements] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [loanForm, setLoanForm] = useState(emptyLoanForm);
  const [repaymentForm, setRepaymentForm] = useState(emptyRepaymentForm);
  const [selectedLoan, setSelectedLoan] = useState(null); // loan to add repayment to
  const [expandedLoan, setExpandedLoan] = useState(null); // loan to view repayments

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
      fetchLoans();
    } else {
      setSettlements([]);
      setPartners([]);
      setLoans([]);
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

  const fetchLoans = async () => {
    try {
      const response = await axios.get(
        `${API}/finance/loans?branchId=${selectedBranch.id}`,
        auth
      );
      setLoans(response.data || []);
    } catch (error) {
      console.error("Error fetching loans:", error);
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

    setCalculatedAmounts({ dispatcherAmount, accountsAmount, partnerProfit, partnerSplits });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      const rate = Number(updated.dollarRate) || 0;
      if (name === "totalAmountUSD" && rate > 0) {
        updated.totalAmountPKR = (Number(value || 0) * rate).toFixed(2);
      }
      if (name === "totalAmountPKR" && rate > 0) {
        updated.totalAmountUSD = (Number(value || 0) / rate).toFixed(2);
      }
      if (name === "dollarRate" && Number(value) > 0) {
        if (updated.totalAmountUSD) {
          updated.totalAmountPKR = (Number(updated.totalAmountUSD || 0) * Number(value)).toFixed(2);
        } else if (updated.totalAmountPKR) {
          updated.totalAmountUSD = (Number(updated.totalAmountPKR || 0) / Number(value)).toFixed(2);
        }
      }
      return updated;
    });
  };

  const handleAccountsTypeChange = (e) => {
    setFormData((prev) => ({ ...prev, accountsType: e.target.value, accountsValue: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBranch?.id) return alert("Please select a branch first.");
    if (!formData.totalAmountPKR || Number(formData.totalAmountPKR) <= 0)
      return alert("Please enter a valid total amount");
    if (formData.dispatcherValue === "") return alert("Please enter dispatcher percentage");
    if (formData.accountsValue === "") return alert("Please enter accounts value");

    try {
      await axios.post(
        `${API}/finance/manual-settlement`,
        {
          branchId: selectedBranch.id,
          totalAmountPKR: Number(formData.totalAmountPKR),
          totalAmountUSD: Number(formData.totalAmountUSD || 0),
          dollarRate: Number(formData.dollarRate || 0),
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
      setFormData(emptyForm);
      setShowForm(false);
      fetchSettlements();
    } catch (error) {
      alert(error.response?.data?.message || "Error creating settlement");
    }
  };

  const handleAddLoan = async (e) => {
    e.preventDefault();
    if (!selectedBranch?.id) return alert("Please select a branch first.");
    if (!loanForm.lenderPartnerId || !loanForm.borrowerPartnerId)
      return alert("Please select both lender and borrower.");
    if (loanForm.lenderPartnerId === loanForm.borrowerPartnerId)
      return alert("Lender and borrower cannot be the same partner.");
    if (!loanForm.amount || Number(loanForm.amount) <= 0)
      return alert("Please enter a valid loan amount.");

    const lender = partners.find((p) => p.id === Number(loanForm.lenderPartnerId));
    const borrower = partners.find((p) => p.id === Number(loanForm.borrowerPartnerId));

    try {
      await axios.post(
        `${API}/finance/loans`,
        {
          branchId: selectedBranch.id,
          lenderPartnerId: Number(loanForm.lenderPartnerId),
          lenderName: lender?.name || "",
          borrowerPartnerId: Number(loanForm.borrowerPartnerId),
          borrowerName: borrower?.name || "",
          amount: Number(loanForm.amount),
          note: loanForm.note,
          loanDate: loanForm.loanDate
        },
        auth
      );
      alert("Loan recorded successfully!");
      setLoanForm(emptyLoanForm);
      setShowLoanForm(false);
      fetchLoans();
    } catch (error) {
      alert(error.response?.data?.message || "Error recording loan");
    }
  };

  const handleAddRepayment = async (e) => {
    e.preventDefault();
    if (!repaymentForm.amount || Number(repaymentForm.amount) <= 0)
      return alert("Please enter a valid repayment amount.");

    try {
      await axios.post(
        `${API}/finance/loans/repayment`,
        {
          loanId: selectedLoan.id,
          amount: Number(repaymentForm.amount),
          note: repaymentForm.note,
          paidDate: repaymentForm.paidDate
        },
        auth
      );
      alert("Repayment recorded successfully!");
      setRepaymentForm(emptyRepaymentForm);
      setSelectedLoan(null);
      fetchLoans();
    } catch (error) {
      alert(error.response?.data?.message || "Error recording repayment");
    }
  };

  const handleDeleteLoan = async (id) => {
    if (!window.confirm("Delete this loan and all its repayments?")) return;
    try {
      await axios.delete(`${API}/finance/loans/${id}`, auth);
      fetchLoans();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting loan");
    }
  };

  const handleDeleteRepayment = async (repaymentId) => {
    if (!window.confirm("Delete this repayment?")) return;
    try {
      await axios.delete(`${API}/finance/loans/repayment/${repaymentId}`, auth);
      fetchLoans();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting repayment");
    }
  };

  // Calculate per-partner loan summary
  const partnerLoanSummary = partners.map((partner) => {
    const given = loans
      .filter((l) => l.lenderPartnerId === partner.id)
      .reduce((sum, l) => sum + Number(l.outstanding || 0), 0);

    const taken = loans
      .filter((l) => l.borrowerPartnerId === partner.id)
      .reduce((sum, l) => sum + Number(l.outstanding || 0), 0);

    return { ...partner, outstandingGiven: given, outstandingTaken: taken, net: given - taken };
  });

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0
    }).format(Number(value || 0));

  const formatUSD = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }).format(Number(value || 0));

  if (!selectedBranch) {
    return (
      <div className="settlements-container">
        <div className="warning-message">Please select a branch first.</div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="settlements-container">
      <div className="settlements-header">
        <h1>Settlement Management</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={`btn-primary ${activeSection === "settlements" ? "active" : ""}`}
            onClick={() => setActiveSection("settlements")}
          >
            Settlements
          </button>
          <button
            className={`btn-primary ${activeSection === "loans" ? "active" : ""}`}
            onClick={() => setActiveSection("loans")}
          >
            Partner Loans
          </button>
        </div>
      </div>

      {/* ── SETTLEMENTS SECTION ── */}
      {activeSection === "settlements" && (
        <>
          <div style={{ marginBottom: "16px" }}>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
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
                      <label>Dollar Amount ($)</label>
                      <input
                        type="number"
                        name="totalAmountUSD"
                        value={formData.totalAmountUSD}
                        onChange={handleInputChange}
                        placeholder="Enter dollar amount"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>Dollar Rate</label>
                      <input
                        type="number"
                        name="dollarRate"
                        value={formData.dollarRate}
                        onChange={handleInputChange}
                        placeholder="e.g. 280"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>Total Amount Received (PKR) *</label>
                      <input
                        type="number"
                        name="totalAmountPKR"
                        value={formData.totalAmountPKR}
                        onChange={handleInputChange}
                        placeholder="Enter PKR amount"
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
                        placeholder="e.g. ABC Company"
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

                  {formData.dollarRate && (
                    <div className="calculation-summary">
                      <h3>Currency Conversion</h3>
                      <div className="summary-row">
                        <span>Dollar Amount:</span>
                        <strong>{formatUSD(formData.totalAmountUSD)}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Dollar Rate:</span>
                        <strong>{formData.dollarRate}</strong>
                      </div>
                      <div className="summary-row total">
                        <span>PKR Amount:</span>
                        <strong>{formatCurrency(formData.totalAmountPKR)}</strong>
                      </div>
                    </div>
                  )}
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
                        Calculated: {formatCurrency(calculatedAmounts.dispatcherAmount)}
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
                        Accounts {formData.accountsType === "PERCENTAGE" ? "(%)" : "(PKR)"} *
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
                        Calculated: {formatCurrency(calculatedAmounts.accountsAmount)}
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
                      <strong>{formatCurrency(formData.totalAmountPKR)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Given to Dispatcher:</span>
                      <strong>{formatCurrency(calculatedAmounts.dispatcherAmount)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Given to Accounts:</span>
                      <strong>{formatCurrency(calculatedAmounts.accountsAmount)}</strong>
                    </div>
                    <div className="summary-row total">
                      <span>Partner Profit:</span>
                      <strong>{formatCurrency(calculatedAmounts.partnerProfit)}</strong>
                    </div>
                    {calculatedAmounts.partnerSplits.length > 0 && (
                      <div className="partner-breakdown">
                        <h4>Partner Distribution:</h4>
                        {calculatedAmounts.partnerSplits.map((split) => (
                          <div key={split.partnerId} className="partner-row">
                            <span>{split.name} ({split.percent}%)</span>
                            <span>{formatCurrency(split.amountPKR)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn-success">Save Settlement</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
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
                      <td>{settlement.companyName || settlement.invoiceNumber || "N/A"}</td>
                      <td>{formatCurrency(settlement.totalAmountPKR)}</td>
                      <td>
                        <span className={`badge badge-${(settlement.amountType || "manual").toLowerCase()}`}>
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
        </>
      )}

      {/* ── LOANS SECTION ── */}
      {activeSection === "loans" && (
        <>
          {/* Partner Balance Summary */}
          <div className="loan-summary-cards">
            {partnerLoanSummary.map((partner) => (
              <div key={partner.id} className="loan-summary-card">
                <h4>{partner.name}</h4>
                <div className="loan-summary-row">
                  <span>Given (outstanding)</span>
                  <strong className="text-green">
                    {formatCurrency(partner.outstandingGiven)}
                  </strong>
                </div>
                <div className="loan-summary-row">
                  <span>Taken (outstanding)</span>
                  <strong className="text-red">
                    {formatCurrency(partner.outstandingTaken)}
                  </strong>
                </div>
                <div className="loan-summary-row net">
                  <span>Net Position</span>
                  <strong className={partner.net >= 0 ? "text-green" : "text-red"}>
                    {formatCurrency(partner.net)}
                  </strong>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <button className="btn-primary" onClick={() => setShowLoanForm(!showLoanForm)}>
              {showLoanForm ? "Cancel" : "Record New Loan"}
            </button>
          </div>

          {showLoanForm && (
            <div className="settlement-form-card">
              <h2>Record Partner Loan</h2>
              <form onSubmit={handleAddLoan}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Lender (Giving loan)</label>
                    <select
                      value={loanForm.lenderPartnerId}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, lenderPartnerId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select Partner</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Borrower (Taking loan)</label>
                    <select
                      value={loanForm.borrowerPartnerId}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, borrowerPartnerId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select Partner</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Loan Amount (PKR)</label>
                    <input
                      type="number"
                      value={loanForm.amount}
                      onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                      placeholder="Enter amount"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Loan Date</label>
                    <input
                      type="date"
                      value={loanForm.loanDate}
                      onChange={(e) => setLoanForm({ ...loanForm, loanDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Note</label>
                    <input
                      value={loanForm.note}
                      onChange={(e) => setLoanForm({ ...loanForm, note: e.target.value })}
                      placeholder="Optional note"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-success">Save Loan</button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowLoanForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Repayment Modal */}
          {selectedLoan && (
            <div className="settlement-modal">
              <div className="settlement-box">
                <h2>Record Repayment</h2>
                <p>
                  <strong>{selectedLoan.borrowerName}</strong> repaying{" "}
                  <strong>{selectedLoan.lenderName}</strong>
                </p>
                <p>
                  Outstanding: <strong>{formatCurrency(selectedLoan.outstanding)}</strong>
                </p>
                <form onSubmit={handleAddRepayment}>
                  <div className="form-group">
                    <label>Repayment Amount (PKR)</label>
                    <input
                      type="number"
                      value={repaymentForm.amount}
                      onChange={(e) =>
                        setRepaymentForm({ ...repaymentForm, amount: e.target.value })
                      }
                      placeholder="Enter amount"
                      max={selectedLoan.outstanding}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={repaymentForm.paidDate}
                      onChange={(e) =>
                        setRepaymentForm({ ...repaymentForm, paidDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Note</label>
                    <input
                      value={repaymentForm.note}
                      onChange={(e) =>
                        setRepaymentForm({ ...repaymentForm, note: e.target.value })
                      }
                      placeholder="Optional note"
                    />
                  </div>
                  <div className="settlement-actions">
                    <button type="submit">Save Repayment</button>
                    <button type="button" onClick={() => setSelectedLoan(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Loans Table */}
          <div className="settlements-list">
            <h2>Loan Records</h2>
            {loans.length === 0 ? (
              <p className="no-data">No loans recorded</p>
            ) : (
              <table className="settlements-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Lender</th>
                    <th>Borrower</th>
                    <th>Loan Amount</th>
                    <th>Repaid</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <>
                      <tr key={loan.id}>
                        <td>{new Date(loan.loanDate).toLocaleDateString()}</td>
                        <td>{loan.lenderName}</td>
                        <td>{loan.borrowerName}</td>
                        <td>{formatCurrency(loan.amount)}</td>
                        <td>{formatCurrency(loan.totalRepaid)}</td>
                        <td>
                          <strong className={loan.outstanding > 0 ? "text-red" : "text-green"}>
                            {formatCurrency(loan.outstanding)}
                          </strong>
                        </td>
                        <td>
                          <span className={`badge ${loan.outstanding <= 0 ? "badge-cleared" : "badge-pending"}`}>
                            {loan.outstanding <= 0 ? "Settled" : "Pending"}
                          </span>
                        </td>
                        <td>{loan.note || "-"}</td>
                        <td style={{ display: "flex", gap: "5px" }}>
                          {loan.outstanding > 0 && (
                            <button
                              className="btn-primary"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setRepaymentForm(emptyRepaymentForm);
                              }}
                            >
                              Repay
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setExpandedLoan(expandedLoan === loan.id ? null : loan.id)
                            }
                          >
                            {expandedLoan === loan.id ? "Hide" : "History"}
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteLoan(loan.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>

                      {/* Repayment History Row */}
                      {expandedLoan === loan.id && (
                        <tr key={`repayments-${loan.id}`}>
                          <td colSpan="9" style={{ background: "#f9f9f9", padding: "12px 24px" }}>
                            <strong>Repayment History</strong>
                            {loan.repayments.length === 0 ? (
                              <p style={{ margin: "8px 0 0" }}>No repayments yet.</p>
                            ) : (
                              <table style={{ width: "100%", marginTop: "8px" }}>
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Note</th>
                                    <th>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loan.repayments.map((r) => (
                                    <tr key={r.id}>
                                      <td>{new Date(r.paidDate).toLocaleDateString()}</td>
                                      <td>{formatCurrency(r.amount)}</td>
                                      <td>{r.note || "-"}</td>
                                      <td>
                                        <button
                                          className="delete-btn"
                                          onClick={() => handleDeleteRepayment(r.id)}
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Settlements;