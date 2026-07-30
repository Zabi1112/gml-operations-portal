import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import SalarySlipView from "../components/SalarySlipView.jsx";
import InvoiceView from "../components/InvoiceView.jsx";
import LoadReportView from "../components/LoadReportView.jsx";
import SettlementView from "../components/SettlementView.jsx";
import DispatcherSplitEditor from "../components/DispatcherSplitEditor.jsx";
import SettlementEditModal from "../components/SettlementEditModal.jsx";
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

  const [activeTab, setActiveTab] = useState(isAdmin ? "salary" : "invoice");

  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [salarySlips, setSalarySlips] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadReports, setLoadReports] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [partners, setPartners] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedLoadReport, setSelectedLoadReport] = useState(null);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [editingSettlement, setEditingSettlement] = useState(null);

  const [editInvoiceData, setEditInvoiceData] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [clearInvoiceData, setClearInvoiceData] = useState(null);

  const [settlementForm, setSettlementForm] = useState({
    usdRate: "",
    dispatcherPercent: "",
    dispatcherType: "PERCENTAGE",
    dispatcherSplits: [],
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
    if (!selectedBranch?.id || !isAdmin) return setSalarySlips([]);
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

  const loadFinanceSettings = async () => {
    if (!selectedBranch?.id || !isAdmin) {
      setPartners([]);
      setDispatchers([]);
      return;
    }
    const res = await axios.get(
      `${API}/finance/settings/${selectedBranch.id}`,
      auth
    );
    setPartners(res.data?.partners || []);
    setDispatchers(res.data?.dispatchers || []);
  };

  useEffect(() => {
    loadEmployees();
    loadCompanies();
    loadSalaryHistory();
    loadInvoiceHistory();
    loadLoadReportHistory();
    loadSettlements();
    loadFinanceSettings();
  }, [selectedBranch]);

  const openLoadReport = (item) => {
    setSelectedLoadReport(item.reportData);
  };

  const openClearInvoice = (invoice) => {
    setClearInvoiceData(invoice);
    setSettlementForm({
      usdRate: "",
      dispatcherPercent: selectedBranch?.dispatcherPercent || 25,
      dispatcherType: "PERCENTAGE",
      dispatcherSplits: [],
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
      dispatcherType: "PERCENTAGE",
      dispatcherSplits: [],
      accountsValue: "",
      accountsType: "PERCENTAGE",
      notes: ""
    });
  };

  const submitClearInvoice = async (e) => {
    e.preventDefault();
    if (!clearInvoiceData) return;

    const splitsTotal = settlementForm.dispatcherSplits.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );
    if (splitsTotal > dispatcherAmountPKR + 1) {
      return alert("Dispatcher split amounts cannot exceed the total dispatcher amount");
    }

    try {
      const res = await axios.post(
        `${API}/finance/clear-invoice/${clearInvoiceData.id}`,
        {
          invoiceAmountUSD: Number(clearInvoiceData.netPayable || 0),
          usdRate: Number(settlementForm.usdRate || 0),
          dispatcherValue: Number(settlementForm.dispatcherPercent || 0),
          dispatcherType: settlementForm.dispatcherType,
          dispatcherSplits: settlementForm.dispatcherSplits,
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

  const handleDeleteSalarySlip = async (slipId) => {
    if (!window.confirm("Are you sure you want to delete this salary slip? This action cannot be undone.")) return;
    try {
      await axios.delete(`${API}/salary-slips/${slipId}`, auth);
      alert("Salary slip deleted successfully");
      loadSalaryHistory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete salary slip");
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return;
    try {
      await axios.delete(`${API}/invoices/${invoiceId}`, auth);
      alert("Invoice deleted successfully");
      loadInvoiceHistory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete invoice");
    }
  };

  const openEditInvoice = (invoice) => {
    setEditInvoiceData(invoice);
    setEditForm({
      invoiceNumber: invoice.invoiceNumber || "",
      invoiceStart: invoice.invoiceStart
        ? String(invoice.invoiceStart).slice(0, 10)
        : "",
      invoiceEnd: invoice.invoiceEnd
        ? String(invoice.invoiceEnd).slice(0, 10)
        : "",
      dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : "",
      accountNumber: invoice.accountNumber || "",
      accountTitle: invoice.accountTitle || "",
      dispatchPercent: invoice.dispatchPercent || 0,
      fixedMonthlyRate: invoice.fixedMonthlyRate || 0,
      accountsFeeWeeks: invoice.accountsFeeWeeks || 0,
      accountsFeeRate: invoice.accountsFeeRate || 0,
      discountAmount: invoice.discountAmount || 0,
      referralBonus: invoice.referralBonus || 0,
      fineAmount: invoice.fineAmount || 0,
      fineReason: invoice.fineReason || "",
      previousInvoiceAmount: invoice.previousInvoiceAmount || 0,
      includePreviousInvoiceInNet: !!invoice.includePreviousInvoiceInNet,
      notes: invoice.notes || "",
      loads: (invoice.loads || []).map((load) => ({
        date: load.date ? String(load.date).slice(0, 10) : "",
        pickup: load.pickup || "",
        dropoff: load.dropoff || "",
        loadAmount: load.loadAmount || 0
      })),
      truckRateBreakdown: (invoice.truckRateBreakdown || []).map((truck) => ({
        ...truck
      }))
    });
  };

  const closeEditInvoice = () => {
    setEditInvoiceData(null);
    setEditForm(null);
  };

  const updateEditLoad = (index, key, value) => {
    const updated = [...editForm.loads];
    updated[index] = { ...updated[index], [key]: value };
    setEditForm({ ...editForm, loads: updated });
  };

  const addEditLoad = () => {
    setEditForm({
      ...editForm,
      loads: [
        ...editForm.loads,
        { date: "", pickup: "", dropoff: "", loadAmount: 0 }
      ]
    });
  };

  const removeEditLoad = (index) => {
    setEditForm({
      ...editForm,
      loads: editForm.loads.filter((_, i) => i !== index)
    });
  };

  const updateEditTruckRate = (index, value) => {
    const updated = [...editForm.truckRateBreakdown];
    updated[index] = { ...updated[index], rate: value };
    setEditForm({ ...editForm, truckRateBreakdown: updated });
  };

  const submitEditInvoice = async (e) => {
    e.preventDefault();
    if (!editInvoiceData || !editForm) return;

    try {
      const payload = {
        ...editInvoiceData,
        ...editForm,
        dispatchPercent: Number(editForm.dispatchPercent || 0),
        fixedMonthlyRate: Number(editForm.fixedMonthlyRate || 0),
        accountsFeeWeeks: Number(editForm.accountsFeeWeeks || 0),
        accountsFeeRate: Number(editForm.accountsFeeRate || 0),
        discountAmount: Number(editForm.discountAmount || 0),
        referralBonus: Number(editForm.referralBonus || 0),
        fineAmount: Number(editForm.fineAmount || 0),
        previousInvoiceAmount: Number(editForm.previousInvoiceAmount || 0),
        loads: editForm.loads.filter(
          (load) =>
            load.date &&
            load.pickup &&
            load.dropoff &&
            Number(load.loadAmount || 0) > 0
        ),
        truckRateBreakdown: editForm.truckRateBreakdown.map((truck) => ({
          ...truck,
          rate: Number(truck.rate || 0)
        }))
      };

      await axios.put(`${API}/invoices/${editInvoiceData.id}`, payload, auth);
      alert("Invoice updated successfully");
      closeEditInvoice();
      loadInvoiceHistory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update invoice");
    }
  };

  const handleDeleteLoadReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this load report? This action cannot be undone.")) return;
    try {
      await axios.delete(`${API}/load-reports/${reportId}`, auth);
      alert("Load report deleted successfully");
      loadLoadReportHistory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete load report");
    }
  };

  const handleDeleteSettlement = async (settlementId) => {
    if (!window.confirm("Are you sure you want to delete this settlement? The associated invoice will be marked as not cleared. This action cannot be undone.")) return;
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
  const dispatcherAmountPKR =
    settlementForm.dispatcherType === "ABSOLUTE"
      ? dispatcherPercent
      : (invoiceAmountPKR * dispatcherPercent) / 100;

  let accountsAmountPKR = 0;
  if (settlementForm.accountsType === "PERCENTAGE") {
    accountsAmountPKR = (invoiceAmountPKR * accountsValue) / 100;
  } else {
    accountsAmountPKR = accountsValue;
  }

  const partnerProfitPKR = invoiceAmountPKR - dispatcherAmountPKR - accountsAmountPKR;

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
            {isAdmin && (
              <button
                className={activeTab === "salary" ? "active" : ""}
                onClick={() => setActiveTab("salary")}
              >
                Salary History
              </button>
            )}

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

          {activeTab === "salary" && isAdmin && (
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
                          <td style={{ display: "flex", gap: "5px" }}>
                            <button onClick={() => setSelectedInvoice(invoice)}>
                              View
                            </button>
                            {isAdmin && (
                              <button onClick={() => openEditInvoice(invoice)}>
                                Edit
                              </button>
                            )}
                          </td>
                          {isAdmin && (
                            <td>
                              {invoice.isCleared ? (
                                <button
                                  onClick={() => {
                                    if (!settlement) {
                                      alert("Settlement not found. Please refresh history.");
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
                                className={invoice.isCleared ? "disabled-btn" : ""}
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
                        {Number(settlement.invoiceAmountUSD || 0) > 0
                          ? `$${Number(settlement.invoiceAmountUSD).toFixed(2)}`
                          : "-"}
                      </td>
                      <td>
                        {Number(settlement.usdRate || 0) > 0
                          ? Number(settlement.usdRate).toFixed(2)
                          : "-"}
                      </td>
                      <td>
                        {Number(settlement.totalAmountPKR || 0).toLocaleString()}
                      </td>
                      <td>
                        {Number(settlement.dispatcherAmountPKR || 0).toLocaleString()}
                      </td>
                      <td>
                        {Number(settlement.accountsAmountPKR || 0).toLocaleString()}
                      </td>
                      <td>
                        {Number(settlement.partnerProfitPKR || 0).toLocaleString()}
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
                        <button onClick={() => setSelectedSettlement(settlement)}>
                          View / Print
                        </button>
                        <button onClick={() => setEditingSettlement(settlement)}>
                          Edit
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
                    <label>Dispatcher Payment Type</label>
                    <DispatcherSplitEditor
                      dispatchers={dispatchers}
                      dispatcherType={settlementForm.dispatcherType}
                      dispatcherValue={settlementForm.dispatcherPercent}
                      onDispatcherTypeChange={(type) =>
                        setSettlementForm({ ...settlementForm, dispatcherType: type })
                      }
                      onDispatcherValueChange={(value) =>
                        setSettlementForm({ ...settlementForm, dispatcherPercent: value })
                      }
                      dispatcherAmount={dispatcherAmountPKR}
                      splits={settlementForm.dispatcherSplits}
                      onSplitsChange={(splits) =>
                        setSettlementForm({ ...settlementForm, dispatcherSplits: splits })
                      }
                      formatCurrency={(v) => Number(v || 0).toLocaleString()}
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
                      Accounts{" "}
                      {settlementForm.accountsType === "PERCENTAGE" ? "(%)" : "(PKR)"}
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
                      {invoiceAmountPKR.toLocaleString()}
                    </p>
                    <p>
                      <strong>Dispatcher Amount:</strong>{" "}
                      {dispatcherAmountPKR.toLocaleString()}
                    </p>
                    <p>
                      <strong>Accounts Amount:</strong>{" "}
                      {accountsAmountPKR.toLocaleString()}
                    </p>
                    <p>
                      <strong>Partner Profit:</strong>{" "}
                      {partnerProfitPKR.toLocaleString()}
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

          {editForm && editInvoiceData && (
            <div className="settlement-modal">
              <div className="settlement-box wide-box">
                <h2>Edit Invoice</h2>

                <p>
                  <strong>Company:</strong>{" "}
                  {editInvoiceData.companyName || "-"}
                </p>

                <form onSubmit={submitEditInvoice}>
                  <div className="form-group">
                    <label>Invoice Number</label>
                    <input
                      value={editForm.invoiceNumber}
                      onChange={(e) =>
                        setEditForm({ ...editForm, invoiceNumber: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Invoice Start</label>
                    <input
                      type="date"
                      value={editForm.invoiceStart}
                      onChange={(e) =>
                        setEditForm({ ...editForm, invoiceStart: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Invoice End</label>
                    <input
                      type="date"
                      value={editForm.invoiceEnd}
                      onChange={(e) =>
                        setEditForm({ ...editForm, invoiceEnd: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, dueDate: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Account Number</label>
                    <input
                      value={editForm.accountNumber}
                      onChange={(e) =>
                        setEditForm({ ...editForm, accountNumber: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Account Title</label>
                    <input
                      value={editForm.accountTitle}
                      onChange={(e) =>
                        setEditForm({ ...editForm, accountTitle: e.target.value })
                      }
                    />
                  </div>

                  {editInvoiceData.billingType === "PERCENTAGE" && (
                    <>
                      <div className="form-group">
                        <label>Dispatch Percentage %</label>
                        <input
                          type="number"
                          value={editForm.dispatchPercent}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              dispatchPercent: e.target.value
                            })
                          }
                        />
                      </div>

                      <div className="edit-loads-block">
                        <label>Loads</label>

                        {editForm.loads.map((load, index) => (
                          <div className="edit-load-row" key={index}>
                            <input
                              type="date"
                              value={load.date}
                              onChange={(e) =>
                                updateEditLoad(index, "date", e.target.value)
                              }
                            />
                            <input
                              placeholder="Pickup"
                              value={load.pickup}
                              onChange={(e) =>
                                updateEditLoad(index, "pickup", e.target.value)
                              }
                            />
                            <input
                              placeholder="Drop-off"
                              value={load.dropoff}
                              onChange={(e) =>
                                updateEditLoad(index, "dropoff", e.target.value)
                              }
                            />
                            <input
                              type="number"
                              placeholder="Amount $"
                              value={load.loadAmount}
                              onChange={(e) =>
                                updateEditLoad(index, "loadAmount", e.target.value)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => removeEditLoad(index)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}

                        <button type="button" onClick={addEditLoad}>
                          Add Load
                        </button>
                      </div>
                    </>
                  )}

                  {editInvoiceData.billingType === "FIXED" && (
                    <>
                      <div className="form-group">
                        <label>Fixed Monthly Rate / Truck $</label>
                        <input
                          type="number"
                          value={editForm.fixedMonthlyRate}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              fixedMonthlyRate: e.target.value
                            })
                          }
                        />
                      </div>

                      {editForm.truckRateBreakdown.length > 0 && (
                        <div className="edit-loads-block">
                          <label>Truck Rates</label>

                          {editForm.truckRateBreakdown.map((truck, index) => (
                            <div className="edit-load-row" key={index}>
                              <span>{truck.truckNumber || "-"}</span>
                              <input
                                type="number"
                                value={truck.rate}
                                onChange={(e) =>
                                  updateEditTruckRate(index, e.target.value)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="form-group">
                    <label>Accounts Fee Weeks</label>
                    <input
                      type="number"
                      value={editForm.accountsFeeWeeks}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          accountsFeeWeeks: e.target.value
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Accounts Fee Rate / Week $</label>
                    <input
                      type="number"
                      value={editForm.accountsFeeRate}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          accountsFeeRate: e.target.value
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Discount $</label>
                    <input
                      type="number"
                      value={editForm.discountAmount}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          discountAmount: e.target.value
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Referral Bonus $</label>
                    <input
                      type="number"
                      value={editForm.referralBonus}
                      onChange={(e) =>
                        setEditForm({ ...editForm, referralBonus: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Fine $</label>
                    <input
                      type="number"
                      value={editForm.fineAmount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, fineAmount: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Fine Reason</label>
                    <input
                      value={editForm.fineReason}
                      onChange={(e) =>
                        setEditForm({ ...editForm, fineReason: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Previous Invoice Amount $</label>
                    <input
                      type="number"
                      value={editForm.previousInvoiceAmount}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          previousInvoiceAmount: e.target.value
                        })
                      }
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={editForm.includePreviousInvoiceInNet}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            includePreviousInvoiceInNet: e.target.checked
                          })
                        }
                      />
                      Add Previous Invoice To Net
                    </label>
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm({ ...editForm, notes: e.target.value })
                      }
                    />
                  </div>

                  <div className="settlement-actions">
                    <button type="submit">Save Changes</button>
                    <button type="button" onClick={closeEditInvoice}>
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

          {editingSettlement && (
            <SettlementEditModal
              settlement={editingSettlement}
              dispatchers={dispatchers}
              partners={partners}
              auth={auth}
              onClose={() => setEditingSettlement(null)}
              onSaved={() => {
                setEditingSettlement(null);
                loadSettlements();
              }}
            />
          )}
        </>
      )}
    </Layout>
  );
}

export default History;