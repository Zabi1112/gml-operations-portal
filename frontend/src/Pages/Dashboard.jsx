import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import { BranchContext } from "../context/BranchContext.jsx";
import "./Dashboard.css";

function Dashboard() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const { branches, setBranches, selectedBranch, selectBranch } =
    useContext(BranchContext);

  const [showForm, setShowForm] = useState(false);

  const [branchForm, setBranchForm] = useState({
    branchName: "",
    location: "",
    phone: "",
    email: ""
  });

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const canEdit = user?.role === "ADMIN";

  const loadBranches = async () => {
    try {
      const res = await axios.get(`${API}/branches`, auth);
      setBranches(res.data);

      const savedId = localStorage.getItem("branchId");
      if (savedId && !selectedBranch) {
        const found = res.data.find((b) => b.id === Number(savedId));
        if (found) selectBranch(found);
      }
    } catch (error) {
      console.log(error);
      alert("Failed to load branches");
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const createBranch = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${API}/branches`, branchForm, auth);

      setBranchForm({
        branchName: "",
        location: "",
        phone: "",
        email: ""
      });

      setShowForm(false);
      await loadBranches();
      selectBranch(res.data.branch);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to create branch");
    }
  };

  const deleteBranch = async (id) => {
    if (
      !confirm(
        "Delete this branch? This will delete all staff, companies, trucks, drivers, invoices, loads, salary slips, and reports under this branch."
      )
    ) {
      return;
    }

    try {
      await axios.delete(`${API}/branches/${id}`, auth);

      if (selectedBranch?.id === id) {
        selectBranch(null);
      }

      loadBranches();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to delete branch");
    }
  };

  return (
    <Layout title="Dashboard">
      <div className="dashboard-container">
        <div className="branch-section">
          <div className="branch-header">
            <div>
              <h2>GML Branch Management</h2>
              <p>
                Select your office branch before managing staff, companies,
                invoices, and reports.
              </p>
            </div>

            {canEdit && (
              <button
                className="btn-add-branch"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? "Cancel" : "+ Add New Branch"}
              </button>
            )}
          </div>

          {showForm && canEdit && (
            <form className="branch-form" onSubmit={createBranch}>
              <div className="form-group">
                <label>Branch Name *</label>
                <input
                  value={branchForm.branchName}
                  onChange={(e) =>
                    setBranchForm({
                      ...branchForm,
                      branchName: e.target.value
                    })
                  }
                  placeholder="Example: Lahore Office"
                  required
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  value={branchForm.location}
                  onChange={(e) =>
                    setBranchForm({
                      ...branchForm,
                      location: e.target.value
                    })
                  }
                  placeholder="Example: Lahore"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  value={branchForm.phone}
                  onChange={(e) =>
                    setBranchForm({
                      ...branchForm,
                      phone: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={branchForm.email}
                  onChange={(e) =>
                    setBranchForm({
                      ...branchForm,
                      email: e.target.value
                    })
                  }
                />
              </div>

              <button type="submit">Create Branch</button>
            </form>
          )}

          <div className="branch-select-box">
            <label>Current Branch</label>

            <select
              value={selectedBranch?.id || ""}
              onChange={(e) => {
                const branch = branches.find(
                  (b) => b.id === Number(e.target.value)
                );
                selectBranch(branch || null);
              }}
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branchName}
                </option>
              ))}
            </select>
          </div>

          {selectedBranch ? (
            <div className="branch-info">
              <h3>Active Branch: {selectedBranch.branchName}</h3>

              <div className="info-grid">
                <div>
                  <strong>Location:</strong>{" "}
                  {selectedBranch.location || "N/A"}
                </div>

                <div>
                  <strong>Phone:</strong> {selectedBranch.phone || "N/A"}
                </div>

                <div>
                  <strong>Email:</strong> {selectedBranch.email || "N/A"}
                </div>

                <div>
                  <strong>Status:</strong>{" "}
                  {selectedBranch.isActive ? "Active" : "Inactive"}
                </div>
              </div>

              {canEdit && (
                <button
                  className="danger"
                  onClick={() => deleteBranch(selectedBranch.id)}
                >
                  Delete This Branch
                </button>
              )}
            </div>
          ) : (
            <div className="warning-message">
              No branch selected. Please select or create a branch to continue.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;