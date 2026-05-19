import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import { BranchContext } from "../context/BranchContext.jsx";
import "./Employees.css";

function Employees() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const { selectedBranch } = useContext(BranchContext);

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";
  const canDelete = user?.role === "ADMIN";

  const emptyForm = {
    name: "",
    phone: "",
    email: "",
    cnic: "",
    role: "Dispatcher",
    salaryType: "FIXED",
    fixedSalary: 0,
    commission: 0
  };

  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const loadEmployees = async () => {
    if (!selectedBranch?.id) {
      setEmployees([]);
      return;
    }

    const res = await axios.get(
      `${API}/employees?branchId=${selectedBranch.id}`,
      auth
    );

    setEmployees(res.data);
  };

  useEffect(() => {
    loadEmployees();
    resetForm();
  }, [selectedBranch]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submitStaff = async (e) => {
    e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    const payload = {
      branchId: selectedBranch.id,
      name: form.name,
      phone: form.phone || "",
      email: form.email || "",
      cnic: form.cnic || "",
      role: form.role || "Dispatcher",
      salaryType: form.salaryType || "FIXED",
      fixedSalary: Number(form.fixedSalary || 0),
      commission: Number(form.commission || 0)
    };

    try {
      if (editingId) {
        await axios.patch(`${API}/employees/${editingId}`, payload, auth);
      } else {
        await axios.post(`${API}/employees`, payload, auth);
      }

      resetForm();
      loadEmployees();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save staff");
    }
  };

  const startEdit = (emp) => {
    setEditingId(emp.id);

    setForm({
      name: emp.name || "",
      phone: emp.phone || "",
      email: emp.email || "",
      cnic: emp.cnic || "",
      role: emp.role || "Dispatcher",
      salaryType: emp.salaryType || "FIXED",
      fixedSalary: emp.fixedSalary || 0,
      commission: emp.commission || 0
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEmployee = async (id) => {
    if (!confirm("Delete this staff member?")) return;

    try {
      await axios.delete(`${API}/employees/${id}`, auth);
      loadEmployees();
    } catch (error) {
      alert("Failed to delete staff");
    }
  };

  return (
    <Layout title="Staff Management">
      {!selectedBranch && (
        <div className="warning-message">
          Please select a GML branch from Dashboard first.
        </div>
      )}

      {selectedBranch && canEdit && (
        <form className="employee-form" onSubmit={submitStaff}>
          <h3>{editingId ? "Edit Staff" : "Add Staff"} — {selectedBranch.branchName}</h3>

          <div className="form-group">
            <label>Staff Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>CNIC Number</label>
            <input
              value={form.cnic}
              onChange={(e) => setForm({ ...form, cnic: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Staff Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="Dispatcher">Dispatcher</option>
              <option value="Sales Person">Sales Person</option>
              <option value="Office Staff">Office Staff</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div className="form-group">
            <label>Salary Type</label>
            <select
              value={form.salaryType}
              onChange={(e) =>
                setForm({ ...form, salaryType: e.target.value })
              }
            >
              <option value="FIXED">Fixed</option>
              <option value="COMMISSION">Commission</option>
            </select>
          </div>

          <div className="form-group">
            <label>Fixed Salary PKR</label>
            <input
              type="number"
              value={form.fixedSalary}
              onChange={(e) =>
                setForm({ ...form, fixedSalary: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Commission %</label>
            <input
              type="number"
              value={form.commission}
              onChange={(e) =>
                setForm({ ...form, commission: e.target.value })
              }
            />
          </div>

          <button type="submit">
            {editingId ? "Update Staff" : "Create Staff"}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </form>
      )}

      {selectedBranch && (
        <div className="employee-table">
          <h3>Staff List — {selectedBranch.branchName}</h3>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>CNIC</th>
                <th>Role</th>
                <th>Salary Type</th>
                <th>Fixed Salary</th>
                <th>Commission %</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{emp.phone || "-"}</td>
                  <td>{emp.email || "-"}</td>
                  <td>{emp.cnic || "-"}</td>
                  <td>{emp.role}</td>
                  <td>{emp.salaryType}</td>
                  <td>{Number(emp.fixedSalary || 0).toFixed(0)}</td>
                  <td>{Number(emp.commission || 0).toFixed(2)}</td>
                  {(canEdit || canDelete) && (
                    <td>
                      {canEdit && (
                        <button type="button" onClick={() => startEdit(emp)}>
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteEmployee(emp.id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}

              {employees.length === 0 && (
                <tr>
                  <td colSpan="9">No staff found for this branch.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

export default Employees;