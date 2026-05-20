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
  const [settlements, setSettlements] = useState([]);

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

  const loadSettlements = async () => {
    if (!canEdit || !selectedBranch?.id) {
      setSettlements([]);
      return;
    }

    try {
      const res = await axios.get(
        `${API}/finance/settlements?branchId=${selectedBranch.id}`,
        auth
      );

      setSettlements(res.data || []);
    } catch (error) {
      console.log(error);
      setSettlements([]);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadSettlements();
  }, [selectedBranch]);

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

  const totalGeneratedPKR = settlements.reduce(
    (sum, item) => sum + Number(item.invoiceAmountPKR || 0),
    0
  );

  const totalAccountsPKR = settlements.reduce(
    (sum, item) => sum + Number(item.accountsAmountPKR || 0),
    0
  );

  const partnerTotals = {};

  settlements.forEach((settlement) => {
    const splits = Array.isArray(settlement.partnerSplits)
      ? settlement.partnerSplits
      : [];

    splits.forEach((partner) => {
      const name = partner.name || "Unknown Partner";

      if (!partnerTotals[name]) {
        partnerTotals[name] = 0;
      }

      partnerTotals[name] += Number(partner.amountPKR || 0);
    });
  });

  const partnerRows = Object.entries(partnerTotals).map(([name, amount]) => ({
    name,
    amount
  }));

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
            <>
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

              {canEdit && (
                <div className="finance-summary-section">
                  <div className="finance-summary-header">
                    <div>
                      <h2>Company Finance Summary</h2>
                      <p>
                        Based on cleared invoice settlements for this branch.
                      </p>
                    </div>
                  </div>

                  <div className="finance-summary-cards">
                    <div className="finance-summary-card">
                      <span>Total Generated</span>
                      <strong>
                        PKR {totalGeneratedPKR.toLocaleString()}
                      </strong>
                    </div>

                    <div className="finance-summary-card accounts-card">
                      <span>Total Accounts Money</span>
                      <strong>
                        PKR {totalAccountsPKR.toLocaleString()}
                      </strong>
                    </div>

                    <div className="finance-summary-card">
                      <span>Total Settlements</span>
                      <strong>{settlements.length}</strong>
                    </div>
                  </div>

                  <div className="partner-earning-box">
                    <h3>Partner Earnings</h3>

                    <table className="partner-earning-table">
                      <thead>
                        <tr>
                          <th>Partner Name</th>
                          <th>Total Amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {partnerRows.map((partner) => (
                          <tr key={partner.name}>
                            <td>{partner.name}</td>
                            <td>PKR {partner.amount.toLocaleString()}</td>
                          </tr>
                        ))}

                        {partnerRows.length === 0 && (
                          <tr>
                            <td colSpan="2">No partner earnings found yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
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