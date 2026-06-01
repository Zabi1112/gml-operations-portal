import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import SalarySlipView from "../components/SalarySlipView.jsx";
import InvoiceView from "../components/InvoiceView.jsx";
import LoadReportView from "../components/LoadReportView.jsx";
import SettlementView from "../components/SettlementView.jsx";
import { BranchContext } from "../context/BranchContext.jsx";
import "./History.css";

function History() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const { selectedBranch } = useContext(BranchContext);

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const isAdmin = user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState("salary");

  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [salarySlips, setSalarySlips] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadReports, setLoadReports] = useState([]);
  const [settlements, setSettlements] = useState([]);

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedLoadReport, setSelectedLoadReport] = useState(null);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  const [clearInvoiceData, setClearInvoiceData] = useState(null);

  const [settlementForm, setSettlementForm] = useState({
    usdRate: "",
    dispatcherPercent: "",
    accountsValue: "",
    accountsType: "PERCENTAGE",
    notes: ""
  });

  const [salaryFilters, setSalaryFilters] = useState({ employeeId: "" });
  const [invoiceFilters, setInvoiceFilters] = useState({ companyId: "" });
  const [loadReportFilters, setLoadReportFilters] = useState({ companyId: "" });

  const loadEmployees = async () => {
    if (!selectedBranch?.id) return setEmployees([]);

    const res = await axios.get(
      `${API}/employees?branchId=${selectedBranch.id}`,
      auth
    );

    setEmployees(res.data);
  };

  const loadCompanies = async () => {
    if (!selectedBranch?.id) return setCompanies([]);

    const res = await axios.get(
      `${API}/companies?branchId=${selectedBranch.id}`,
      auth
    );

    setCompanies(res.data);
  };

  const loadSalaryHistory = async () => {
    if (!selectedBranch?.id) return setSalarySlips([]);

    const params = new URLSearchParams();
    params.append("branchId", selectedBranch.id);

    if (salaryFilters.employeeId) {
      params.append("employeeId", salaryFilters.employeeId);
    }

    const res = await axios.get(
      `${API}/salary-slips?${params.toString()}`,
      auth
    );

    setSalarySlips(res.data);
  };

  const loadInvoiceHistory = async () => {
    if (!selectedBranch?.id) return setInvoices([]);

    const params = new URLSearchParams();
    params.append("branchId", selectedBranch.id);

    if (invoiceFilters.companyId) {
      params.append("companyId", invoiceFilters.companyId);
    }

    const res = await axios.get(`${API}/invoices?${params.toString()}`, auth);
    setInvoices(res.data);
  };

  const loadLoadReportHistory = async () => {
    if (!selectedBranch?.id) return setLoadReports([]);

    const params = new URLSearchParams();
    params.append("branchId", selectedBranch.id);

    if (loadReportFilters.companyId) {
      params.append("companyId", loadReportFilters.companyId);
    }

    const res = await axios.get(
      `${API}/load-reports?${params.toString()}`,
      auth
    );

    setLoadReports(res.data);
  };

  const loadSettlements = async () => {
    if (!selectedBranch?.id || !isAdmin) {
      setSettlements([]);
      return;
    }

    const params = new URLSearchParams();
    params.append("branchId", selectedBranch.id);

    const res = await axios.get(
      `${API}/finance/settlements?${params.toString()}`,
      auth
    );

    setSettlements(res.data);
  };

  useEffect(() => {
    loadEmployees();
    loadCompanies();
    loadSalaryHistory();
    loadInvoiceHistory();
    loadLoadReportHistory();
    loadSettlements();
  }, [selectedBranch]);

  const openLoadReport = (item) => {
    setSelectedLoadReport(item.reportData);
  };

  const openClearInvoice = (invoice) => {
    setClearInvoiceData(invoice);

    setSettlementForm({
      usdRate: "",
      dispatcherPercent: selectedBranch?.dispatcherPercent || 25,
      accountsValue: selectedBranch?.accountsPercent || 10,
      accountsType: "PERCENTAGE",
      notes: ""
    });
  };

  const closeClearInvoice = () => {
    setClearInvoiceData(null);

    setSettlementForm({
      usdRate: "",
      dispatcherPercent: "",
      accountsValue: "",
      accountsType: "PERCENTAGE",
      notes: ""
    });
  };

  const submitClearInvoice = async (e) => {
    e.preventDefault();

    if (!clearInvoiceData) return;

    try {
      const res = await axios.post(
        `${API}/finance/clear-invoice/${clearInvoiceData.id}`,
        {
          invoiceAmountUSD: Number(clearInvoiceData.netPayable || 0),
          usdRate: Number(settlementForm.usdRate || 0),
          dispatcherValue: Number(settlementForm.dispatcherPercent || 0),
          accountsValue: Number(settlementForm.accountsValue || 0),
          accountsType: settlementForm.accountsType,
          notes: settlementForm.notes
        },
        auth
      );

      alert("Invoice cleared successfully");

      closeClearInvoice();
      loadInvoiceHistory();
      loadSettlements();

      if (res.data?.settlement) {
        setSelectedSettlement(res.data.settlement);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to clear invoice");
    }
  };

  // Delete functions
  const handleDeleteSalarySlip = async (slipId) => {
    if (!window.confirm("Are you sure you want to delete this salary slip? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API}/salary-slips/${slipId}`, auth);
      alert("Salary slip deleted successfully");
      loadSalaryHistory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete salary slip");
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API}/invoices/${invoiceId}`, auth);
      alert("Invoice deleted successfully");
      loadInvoiceHistory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete invoice");
    }
  };

  const handleDeleteLoadReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this load report? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API}/load-reports/${reportId}`, auth);
      alert("Load report deleted successfully");
      loadLoadReportHistory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete load report");
    }
  };

  const handleDeleteSettlement = async (settlementId) => {
    if (!window.confirm("Are you sure you want to delete this settlement? The associated invoice will be marked as not cleared. This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API}/finance/settlements/${settlementId}`, auth);
      alert("Settlement deleted successfully");
      loadInvoiceHistory();
      loadSettlements();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete settlement");
    }
  };

  const findSettlementByInvoiceId = (invoiceId) => {
    return settlements.find(
      (item) => Number(item.invoiceId) === Number(invoiceId)
    );
  };

  const invoiceAmountUSD = Number(clearInvoiceData?.netPayable || 0);
  const usdRate = Number(settlementForm.usdRate || 0);
  const invoiceAmountPKR = invoiceAmountUSD * usdRate;

  const dispatcherPercent = Number(settlementForm.dispatcherPercent || 0);
  const accountsValue = Number(settlementForm.accountsValue || 0);

  const dispatcherAmountPKR = (invoiceAmountPKR * dispatcherPercent) / 100;
  
  // Accounts can be percentage or absolute
  let accountsAmountPKR = 0;
  if (settlementForm.accountsType === "PERCENTAGE") {
    accountsAmountPKR = (invoiceAmountPKR * accountsValue) / 100;
  } else {
    accountsAmountPKR = accountsValue;
  }

  const partnerProfitPKR =
    invoiceAmountPKR - dispatcherAmountPKR - accountsAmountPKR;

  return (
    <Layout title="History">
      {!selectedBranch && (
        <div className="warning-message">
          Please select a GML branch from Dashboard first.
        </div>
      )}

      {selectedBranch && (
        <>
          <div className="history-tabs">
            <button
              className={activeTab === "salary" ? "active" : ""}
              onClick={() => setActiveTab("salary")}
            >
              Salary History
            </button>

            <button
              className={activeTab === "invoice" ? "active" : ""}
              onClick={() => setActiveTab("invoice")}
            >
              Invoice History
            </button>

            <button
              className={activeTab === "loadReport" ? "active" : ""}
              onClick={() => setActiveTab("loadReport")}
            >
              Load Report History
            </button>

            {isAdmin && (
              <button
                className={activeTab === "settlement" ? "active" : ""}
                onClick={() => setActiveTab("settlement")}
              >
                Settlement History
              </button>
            )}
          </div>

          {activeTab === "salary" && (
            <>
              <form
                className="history-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  loadSalaryHistory();
                }}
              >
                <select
                  value={salaryFilters.employeeId}
                  onChange={(e) =>
                    setSalaryFilters({
                      ...salaryFilters,
                      employeeId: e.target.value
                    })
                  }
                >
                  <option value="">All Staff</option>

                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role}
                    </option>
                  ))}
                </select>

                <button type="submit">Apply Filter</button>
              </form>

              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Type</th>
                      <th>Period</th>
                      <th>Gross PKR</th>
                      <th>Net PKR</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {salarySlips.map((slip) => (
                      <tr key={slip.id}>
                        <td>{slip.employeeName}</td>
                        <td>{slip.salaryType}</td>
                        <td>
                          {new Date(slip.periodStart).toLocaleDateString()} -{" "}
                          {new Date(slip.periodEnd).toLocaleDateString()}
                        </td>
                        <td>{Number(slip.grossSalaryPKR || 0).toFixed(0)}</td>
                        <td>{Number(slip.netSalaryPKR || 0).toFixed(0)}</td>
                        <td>{new Date(slip.createdAt).toLocaleDateString()}</td>
                        <td style={{ display: "flex", gap: "5px" }}>
                          <button onClick={() => setSelectedSlip(slip)}>
                            View
                          </button>
                          {isAdmin && (
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteSalarySlip(slip.id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {salarySlips.length === 0 && (
                      <tr>
                        <td colSpan="7">No salary history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "invoice" && (
            <>
              <form
                className="history-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  loadInvoiceHistory();
                }}
              >
                <select
                  value={invoiceFilters.companyId}
                  onChange={(e) =>
                    setInvoiceFilters({
                      ...invoiceFilters,
                      companyId: e.target.value
                    })
                  }
                >
                  <option value="">All Companies</option>

                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>

                <button type="submit">Apply Filter</button>
              </form>

              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Company</th>
                      <th>Billing</th>
                      <th>Period</th>
                      <th>Trucks</th>
                      <th>Net Payable</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>View</th>
                      {isAdmin && <th>Settlement</th>}
                      {isAdmin && <th>Clear</th>}
                      {isAdmin && <th>Delete</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {invoices.map((invoice) => {
                      const settlement = findSettlementByInvoiceId(invoice.id);

                      return (
                        <tr key={invoice.id}>
                          <td>{invoice.invoiceNumber || "-"}</td>
                          <td>{invoice.companyName || "-"}</td>
                          <td>{invoice.billingType}</td>
                          <td>
                            {new Date(invoice.invoiceStart).toLocaleDateString()} -{" "}
                            {new Date(invoice.invoiceEnd).toLocaleDateString()}
                          </td>
                          <td>{invoice.truckNumbers || "-"}</td>
                          <td>${Number(invoice.netPayable || 0).toFixed(2)}</td>
                          <td>
                            {invoice.isCleared ? (
                              <span className="status-cleared">Cleared</span>
                            ) : (
                              <span className="status-pending">Pending</span>
                            )}
                          </td>
                          <td>
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <button onClick={() => setSelectedInvoice(invoice)}>
                              View
                            </button>
                          </td>

                          {isAdmin && (
                            <td>
                              {invoice.isCleared ? (
                                <button
                                  onClick={() => {
                                    if (!settlement) {
                                      alert(
                                        "Settlement not found. Please refresh history."
                                      );
                                      return;
                                    }

                                    setSelectedSettlement(settlement);
                                  }}
                                >
                                  View Settlement
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}

                          {isAdmin && (
                            <td>
                              <button
                                className={
                                  invoice.isCleared ? "disabled-btn" : ""
                                }
                                disabled={invoice.isCleared}
                                onClick={() => openClearInvoice(invoice)}
                              >
                                {invoice.isCleared ? "Cleared" : "Clear"}
                              </button>
                            </td>
                          )}

                          {isAdmin && (
                            <td>
                              <button
                                className="delete-btn"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? "12" : "9"}>
                          No invoice history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "loadReport" && (
            <>
              <form
                className="history-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  loadLoadReportHistory();
                }}
              >
                <select
                  value={loadReportFilters.companyId}
                  onChange={(e) =>
                    setLoadReportFilters({
                      ...loadReportFilters,
                      companyId: e.target.value
                    })
                  }
                >
                  <option value="">All Companies</option>

                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>

                <button type="submit">Apply Filter</button>
              </form>

              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Company</th>
                      <th>Truck</th>
                      <th>Period</th>
                      <th>Loads</th>
                      <th>Total Gross</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadReports.map((item) => (
                      <tr key={item.id}>
                        <td>{item.reportTitle}</td>
                        <td>{item.companyName || "-"}</td>
                        <td>{item.truckNumber || "-"}</td>
                        <td>
                          {new Date(item.periodStart).toLocaleDateString()} -{" "}
                          {new Date(item.periodEnd).toLocaleDateString()}
                        </td>
                        <td>{item.totalLoads}</td>
                        <td>${Number(item.totalGross || 0).toFixed(2)}</td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td style={{ display: "flex", gap: "5px" }}>
                          <button onClick={() => openLoadReport(item)}>
                            View
                          </button>
                          {isAdmin && (
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteLoadReport(item.id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {loadReports.length === 0 && (
                      <tr>
                        <td colSpan="8">No load report history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "settlement" && isAdmin && (
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Company</th>
                    <th>Invoice USD</th>
                    <th>USD Rate</th>
                    <th>Invoice PKR</th>
                    <th>Dispatcher</th>
                    <th>Accounts</th>
                    <th>Partner Profit</th>
                    <th>Cleared By</th>
                    <th>Cleared Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement.id}>
                      <td>{settlement.invoiceNumber || "-"}</td>
                      <td>{settlement.companyName || "-"}</td>
                      <td>
                        ${Number(settlement.invoiceAmountUSD || 0).toFixed(2)}
                      </td>
                      <td>{Number(settlement.usdRate || 0).toFixed(2)}</td>
                      <td>
                        {Number(settlement.invoiceAmountPKR || 0).toFixed(0)}
                      </td>
                      <td>
                        {Number(settlement.dispatcherAmountPKR || 0).toFixed(0)}{" "}
                        ({settlement.dispatcherPercent}%)
                      </td>
                      <td>
                        {Number(settlement.accountsAmountPKR || 0).toFixed(0)}{" "}
                        ({settlement.accountsPercent}%)
                      </td>
                      <td>
                        {Number(settlement.partnerProfitPKR || 0).toFixed(0)}
                      </td>
                      <td>{settlement.clearedBy || "-"}</td>
                      <td>
                        {settlement.clearedAt
                          ? new Date(settlement.clearedAt).toLocaleDateString()
                          : settlement.createdAt
                          ? new Date(settlement.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td style={{ display: "flex", gap: "5px" }}>
                        <button
                          onClick={() => setSelectedSettlement(settlement)}
                        >
                          View / Print
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteSettlement(settlement.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {settlements.length === 0 && (
                    <tr>
                      <td colSpan="11">No settlement history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {clearInvoiceData && (
            <div className="settlement-modal">
              <div className="settlement-box">
                <h2>Clear Invoice</h2>

                <p>
                  <strong>Invoice:</strong>{" "}
                  {clearInvoiceData.invoiceNumber || "-"}
                </p>

                <p>
                  <strong>Company:</strong>{" "}
                  {clearInvoiceData.companyName || "-"}
                </p>

                <p>
                  <strong>Invoice Amount USD:</strong> $
                  {invoiceAmountUSD.toFixed(2)}
                </p>

                <form onSubmit={submitClearInvoice}>
                  <div className="form-group">
                    <label>USD Rate</label>
                    <input
                      type="number"
                      value={settlementForm.usdRate}
                      onChange={(e) =>
                        setSettlementForm({
                          ...settlementForm,
                          usdRate: e.target.value
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Dispatcher %</label>
                    <input
                      type="number"
                      value={settlementForm.dispatcherPercent}
                      onChange={(e) =>
                        setSettlementForm({
                          ...settlementForm,
                          dispatcherPercent: e.target.value
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Accounts Payment Type</label>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <input
                          type="radio"
                          name="accountsType"
                          value="PERCENTAGE"
                          checked={settlementForm.accountsType === "PERCENTAGE"}
                          onChange={(e) =>
                            setSettlementForm({
                              ...settlementForm,
                              accountsType: e.target.value,
                              accountsValue: ""
                            })
                          }
                        />
                        Percentage (%)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <input
                          type="radio"
                          name="accountsType"
                          value="ABSOLUTE"
                          checked={settlementForm.accountsType === "ABSOLUTE"}
                          onChange={(e) =>
                            setSettlementForm({
                              ...settlementForm,
                              accountsType: e.target.value,
                              accountsValue: ""
                            })
                          }
                        />
                        Absolute (PKR)
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Accounts {settlementForm.accountsType === "PERCENTAGE" ? "(%)" : "(PKR)"}
                    </label>
                    <input
                      type="number"
                      value={settlementForm.accountsValue}
                      onChange={(e) =>
                        setSettlementForm({
                          ...settlementForm,
                          accountsValue: e.target.value
                        })
                      }
                      placeholder={
                        settlementForm.accountsType === "PERCENTAGE"
                          ? "Enter percentage (e.g., 10)"
                          : "Enter amount in PKR"
                      }
                      required
                    />
                  </div>

                  <div className="settlement-summary">
                    <p>
                      <strong>Invoice PKR:</strong>{" "}
                      {invoiceAmountPKR.toFixed(0)}
                    </p>

                    <p>
                      <strong>Dispatcher Amount:</strong>{" "}
                      {dispatcherAmountPKR.toFixed(0)}
                    </p>

                    <p>
                      <strong>Accounts Amount:</strong>{" "}
                      {accountsAmountPKR.toFixed(0)}
                    </p>

                    <p>
                      <strong>Partner Profit:</strong>{" "}
                      {partnerProfitPKR.toFixed(0)}
                    </p>
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      value={settlementForm.notes}
                      onChange={(e) =>
                        setSettlementForm({
                          ...settlementForm,
                          notes: e.target.value
                        })
                      }
                    />
                  </div>

                  <div className="settlement-actions">
                    <button type="submit">Save Settlement</button>

                    <button type="button" onClick={closeClearInvoice}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {selectedSlip && (
            <SalarySlipView
              slip={selectedSlip}
              onClose={() => setSelectedSlip(null)}
            />
          )}

          {selectedInvoice && (
            <InvoiceView
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
            />
          )}

          {selectedLoadReport && (
            <LoadReportView
              report={selectedLoadReport}
              onClose={() => setSelectedLoadReport(null)}
            />
          )}

          {selectedSettlement && (
            <SettlementView
              settlement={selectedSettlement}
              onClose={() => setSelectedSettlement(null)}
            />
          )}
        </>
      )}
    </Layout>
  );
}

export default History;