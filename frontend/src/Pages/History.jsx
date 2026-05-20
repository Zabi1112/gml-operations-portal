import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import SalarySlipView from "../components/SalarySlipView.jsx";
import InvoiceView from "../components/InvoiceView.jsx";
import LoadReportView from "../components/LoadReportView.jsx";
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

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedLoadReport, setSelectedLoadReport] = useState(null);

  const [clearInvoiceData, setClearInvoiceData] = useState(null);

  const [settlementForm, setSettlementForm] = useState({
    usdRate: "",
    dispatcherPercent: "",
    accountsPercent: "",
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

    const res = await axios.get(`${API}/salary-slips?${params.toString()}`, auth);
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

    const res = await axios.get(`${API}/load-reports?${params.toString()}`, auth);
    setLoadReports(res.data);
  };

  useEffect(() => {
    loadEmployees();
    loadCompanies();
    loadSalaryHistory();
    loadInvoiceHistory();
    loadLoadReportHistory();
  }, [selectedBranch]);

  const openLoadReport = (item) => {
    setSelectedLoadReport(item.reportData);
  };

  const openClearInvoice = (invoice) => {
    setClearInvoiceData(invoice);

    setSettlementForm({
      usdRate: "",
      dispatcherPercent: selectedBranch?.dispatcherPercent || 25,
      accountsPercent: selectedBranch?.accountsPercent || 10,
      notes: ""
    });
  };

  const closeClearInvoice = () => {
    setClearInvoiceData(null);
    setSettlementForm({
      usdRate: "",
      dispatcherPercent: "",
      accountsPercent: "",
      notes: ""
    });
  };

  const submitClearInvoice = async (e) => {
    e.preventDefault();

    if (!clearInvoiceData) return;

    try {
      await axios.post(
        `${API}/finance/clear-invoice/${clearInvoiceData.id}`,
        {
          invoiceAmountUSD: Number(clearInvoiceData.netPayable || 0),
          usdRate: Number(settlementForm.usdRate || 0),
          dispatcherPercent: Number(settlementForm.dispatcherPercent || 0),
          accountsPercent: Number(settlementForm.accountsPercent || 0),
          notes: settlementForm.notes
        },
        auth
      );

      alert("Invoice cleared successfully");
      closeClearInvoice();
      loadInvoiceHistory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to clear invoice");
    }
  };

  const invoiceAmountUSD = Number(clearInvoiceData?.netPayable || 0);
  const usdRate = Number(settlementForm.usdRate || 0);
  const invoiceAmountPKR = invoiceAmountUSD * usdRate;

  const dispatcherPercent = Number(settlementForm.dispatcherPercent || 0);
  const accountsPercent = Number(settlementForm.accountsPercent || 0);

  const dispatcherAmountPKR = (invoiceAmountPKR * dispatcherPercent) / 100;
  const accountsAmountPKR = (invoiceAmountPKR * accountsPercent) / 100;
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
                      <th>Action</th>
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
                        <td>
                          <button onClick={() => setSelectedSlip(slip)}>
                            View
                          </button>
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
                      <th>Action</th>
                      {isAdmin && <th>Clear</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {invoices.map((invoice) => (
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
                        <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button onClick={() => setSelectedInvoice(invoice)}>
                            View
                          </button>
                        </td>

                        {isAdmin && (
                          <td>
                            <button
                              disabled={invoice.isCleared}
                              onClick={() => openClearInvoice(invoice)}
                            >
                              {invoice.isCleared ? "Cleared" : "Clear"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? "10" : "9"}>
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
                      <th>Action</th>
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
                        <td>
                          <button onClick={() => openLoadReport(item)}>
                            View
                          </button>
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

          {clearInvoiceData && (
            <div className="settlement-modal">
              <div className="settlement-box">
                <h2>Clear Invoice</h2>

                <p>
                  <strong>Invoice:</strong>{" "}
                  {clearInvoiceData.invoiceNumber || "-"}
                </p>
                <p>
                  <strong>Company:</strong> {clearInvoiceData.companyName || "-"}
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
                    <label>Accounts %</label>
                    <input
                      type="number"
                      value={settlementForm.accountsPercent}
                      onChange={(e) =>
                        setSettlementForm({
                          ...settlementForm,
                          accountsPercent: e.target.value
                        })
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
        </>
      )}
    </Layout>
  );
}

export default History;