import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout.jsx";
import SalarySlipView from "../components/SalarySlipView.jsx";
import InvoiceView from "../components/InvoiceView.jsx";
import "./History.css";

const API = "http://localhost:5000/api";

function History() {
  const token = localStorage.getItem("token");

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const [activeTab, setActiveTab] = useState("salary");

  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [salarySlips, setSalarySlips] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [salaryFilters, setSalaryFilters] = useState({
    employeeId: "",
    from: "",
    to: ""
  });

  const [invoiceFilters, setInvoiceFilters] = useState({
    companyId: "",
    from: "",
    to: ""
  });

  const loadEmployees = async () => {
    const res = await axios.get(`${API}/employees`, auth);
    setEmployees(res.data);
  };

  const loadCompanies = async () => {
    const res = await axios.get(`${API}/companies`, auth);
    setCompanies(res.data);
  };

  const loadSalaryHistory = async () => {
    const params = new URLSearchParams();

    if (salaryFilters.employeeId) params.append("employeeId", salaryFilters.employeeId);
    if (salaryFilters.from) params.append("from", salaryFilters.from);
    if (salaryFilters.to) params.append("to", salaryFilters.to);

    const res = await axios.get(`${API}/salary-slips?${params.toString()}`, auth);
    setSalarySlips(res.data);
  };

  const loadInvoiceHistory = async () => {
    const params = new URLSearchParams();

    if (invoiceFilters.companyId) params.append("companyId", invoiceFilters.companyId);
    if (invoiceFilters.from) params.append("from", invoiceFilters.from);
    if (invoiceFilters.to) params.append("to", invoiceFilters.to);

    const res = await axios.get(`${API}/invoices?${params.toString()}`, auth);
    setInvoices(res.data);
  };

  useEffect(() => {
    loadEmployees();
    loadCompanies();
    loadSalaryHistory();
    loadInvoiceHistory();
  }, []);

  const applySalaryFilters = (e) => {
    e.preventDefault();
    loadSalaryHistory();
  };

  const applyInvoiceFilters = (e) => {
    e.preventDefault();
    loadInvoiceHistory();
  };

  return (
    <Layout title="History">
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
      </div>

      {activeTab === "salary" && (
        <>
          <form className="history-filters" onSubmit={applySalaryFilters}>
            <select
              value={salaryFilters.employeeId}
              onChange={(e) =>
                setSalaryFilters({ ...salaryFilters, employeeId: e.target.value })
              }
            >
              <option value="">All Staff</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.role}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={salaryFilters.from}
              onChange={(e) =>
                setSalaryFilters({ ...salaryFilters, from: e.target.value })
              }
            />

            <input
              type="date"
              value={salaryFilters.to}
              onChange={(e) =>
                setSalaryFilters({ ...salaryFilters, to: e.target.value })
              }
            />

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
                    <td>{slip.grossSalaryPKR}</td>
                    <td>{slip.netSalaryPKR}</td>
                    <td>{new Date(slip.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => setSelectedSlip(slip)}>View</button>
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
          <form className="history-filters" onSubmit={applyInvoiceFilters}>
            <select
              value={invoiceFilters.companyId}
              onChange={(e) =>
                setInvoiceFilters({ ...invoiceFilters, companyId: e.target.value })
              }
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={invoiceFilters.from}
              onChange={(e) =>
                setInvoiceFilters({ ...invoiceFilters, from: e.target.value })
              }
            />

            <input
              type="date"
              value={invoiceFilters.to}
              onChange={(e) =>
                setInvoiceFilters({ ...invoiceFilters, to: e.target.value })
              }
            />

            <button type="submit">Apply Filter</button>
          </form>

          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Company</th>
                  <th>Billing Type</th>
                  <th>Period</th>
                  <th>Trucks</th>
                  <th>Net Payable</th>
                  <th>Created</th>
                  <th>Action</th>
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
                    <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => setSelectedInvoice(invoice)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan="8">No invoice history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
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
    </Layout>
  );
}

export default History;