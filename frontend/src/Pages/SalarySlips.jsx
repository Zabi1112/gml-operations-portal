import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout.jsx";
import SalarySlipView from "../components/SalarySlipView.jsx";
import "./SalarySlips.css";

const API = "http://localhost:5000/api";

function SalarySlips() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const [employees, setEmployees] = useState([]);
  const [previewSlip, setPreviewSlip] = useState(null);

  const emptyForm = {
    employeeId: "",
    employeeName: "",
    designation: "",
    cnic: "",
    salaryType: "FIXED",
    periodStart: "",
    periodEnd: "",
    dispatchCompany: "",
    dispatchAmountUSD: 0,
    commissionPercent: 0,
    usdRate: 0,
    fixedSalaryPKR: 0,
    bonus: 0,
    loanDeduction: 0,
    advanceDeduction: 0,
    otherDeduction: 0,
    notes: ""
  };

  const [form, setForm] = useState(emptyForm);

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";

  const loadEmployees = async () => {
    const empRes = await axios.get(`${API}/employees`, auth);
    setEmployees(empRes.data);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleEmployeeSelect = (id) => {
    const emp = employees.find((e) => e.id === Number(id));

    if (!emp) {
      setForm(emptyForm);
      return;
    }

    setForm((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name,
      designation: emp.role,
      cnic: emp.cnic || "",
      salaryType: emp.salaryType || "FIXED",
      fixedSalaryPKR: Number(emp.fixedSalary || 0),
      commissionPercent: Number(emp.commission || 0)
    }));
  };

  const dispatchAmountUSD = Number(form.dispatchAmountUSD || 0);
  const commissionPercent = Number(form.commissionPercent || 0);
  const usdRate = Number(form.usdRate || 0);
  const fixedSalaryPKR = Number(form.fixedSalaryPKR || 0);
  const bonus = Number(form.bonus || 0);

  const employeeShareUSD =
    form.salaryType === "COMMISSION"
      ? (dispatchAmountUSD * commissionPercent) / 100
      : 0;

  const grossSalaryPKR =
    form.salaryType === "COMMISSION"
      ? employeeShareUSD * usdRate
      : fixedSalaryPKR;

  const netSalaryPKR =
    grossSalaryPKR +
    bonus -
    Number(form.loanDeduction || 0) -
    Number(form.advanceDeduction || 0) -
    Number(form.otherDeduction || 0);

  const previewSalarySlip = (e) => {
    e.preventDefault();

    const slip = {
      ...form,
      employeeId: Number(form.employeeId),
      dispatchAmountUSD,
      commissionPercent,
      usdRate,
      fixedSalaryPKR,
      bonus,
      employeeShareUSD,
      grossSalaryPKR,
      netSalaryPKR,
      loanDeduction: Number(form.loanDeduction || 0),
      advanceDeduction: Number(form.advanceDeduction || 0),
      otherDeduction: Number(form.otherDeduction || 0)
    };

    setPreviewSlip(slip);
  };

  const resetAfterSave = () => {
    setPreviewSlip(null);
    setForm(emptyForm);
  };

  return (
    <Layout title="Salary Slips">
      {canEdit && (
        <form className="salary-form" onSubmit={previewSalarySlip}>
          <div className="form-group">
            <label>Select Staff</label>
            <select
              value={form.employeeId}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              required
            >
              <option value="">Select Staff</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.role} — {emp.salaryType}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Staff Name</label>
            <input value={form.employeeName} readOnly />
          </div>

          <div className="form-group">
            <label>Designation</label>
            <input value={form.designation} readOnly />
          </div>

          <div className="form-group">
            <label>CNIC Number</label>
            <input value={form.cnic} readOnly />
          </div>

          <div className="form-group">
            <label>Salary Type</label>
            <select value={form.salaryType} disabled>
              <option value="FIXED">Fixed Monthly</option>
              <option value="COMMISSION">Commission Based</option>
            </select>
          </div>

          <div className="form-group">
            <label>Period Start</label>
            <input
              type="date"
              value={form.periodStart}
              onChange={(e) =>
                setForm({ ...form, periodStart: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Period End</label>
            <input
              type="date"
              value={form.periodEnd}
              onChange={(e) =>
                setForm({ ...form, periodEnd: e.target.value })
              }
              required
            />
          </div>

          {form.salaryType === "COMMISSION" && (
            <>
              <div className="form-group">
                <label>Dispatch Company</label>
                <input
                  value={form.dispatchCompany}
                  onChange={(e) =>
                    setForm({ ...form, dispatchCompany: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Dispatch Amount USD</label>
                <input
                  type="number"
                  value={form.dispatchAmountUSD}
                  onChange={(e) =>
                    setForm({ ...form, dispatchAmountUSD: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Commission %</label>
                <input value={form.commissionPercent} readOnly />
              </div>

              <div className="form-group">
                <label>USD Rate</label>
                <input
                  type="number"
                  value={form.usdRate}
                  onChange={(e) =>
                    setForm({ ...form, usdRate: e.target.value })
                  }
                />
              </div>
            </>
          )}

          {form.salaryType === "FIXED" && (
            <div className="form-group">
              <label>Fixed Salary PKR</label>
              <input value={form.fixedSalaryPKR} readOnly />
            </div>
          )}

          <div className="form-group">
            <label>Bonus PKR</label>
            <input
              type="number"
              value={form.bonus}
              onChange={(e) => setForm({ ...form, bonus: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Loan Deduction</label>
            <input
              type="number"
              value={form.loanDeduction}
              onChange={(e) =>
                setForm({ ...form, loanDeduction: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Advance Deduction</label>
            <input
              type="number"
              value={form.advanceDeduction}
              onChange={(e) =>
                setForm({ ...form, advanceDeduction: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Other Deduction</label>
            <input
              type="number"
              value={form.otherDeduction}
              onChange={(e) =>
                setForm({ ...form, otherDeduction: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="salary-preview">
            <strong>Employee Share USD:</strong> {employeeShareUSD.toFixed(2)}
            <br />
            <strong>Gross Salary PKR:</strong> {grossSalaryPKR.toFixed(0)}
            <br />
            <strong>Bonus PKR:</strong> {bonus.toFixed(0)}
            <br />
            <strong>Net Salary PKR:</strong> {netSalaryPKR.toFixed(0)}
          </div>

          <button type="submit">Preview Salary Slip</button>
        </form>
      )}

      {previewSlip && (
        <SalarySlipView
          slip={previewSlip}
          isPreview={true}
          onClose={() => setPreviewSlip(null)}
          onSaved={resetAfterSave}
        />
      )}
    </Layout>
  );
}

export default SalarySlips;