import { useContext, useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout.jsx";
import { API } from "../api";
import { BranchContext } from "../context/BranchContext.jsx";
import "./FinanceSettings.css";

function FinanceSettings() {
  const token = localStorage.getItem("token");
  const { selectedBranch } = useContext(BranchContext);

  const auth = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  const [settings, setSettings] = useState({
    dispatcherPercent: 25,
    accountsPercent: 10
  });

  const [partners, setPartners] = useState([]);

  const [partnerForm, setPartnerForm] = useState({
    name: "",
    percent: "",
    phone: "",
    notes: ""
  });

  const loadSettings = async () => {
    if (!selectedBranch?.id) return;

    const res = await axios.get(
      `${API}/finance/settings/${selectedBranch.id}`,
      auth
    );

    setSettings({
      dispatcherPercent: res.data.dispatcherPercent || 25,
      accountsPercent: res.data.accountsPercent || 10
    });

    setPartners(res.data.partners || []);
  };

  useEffect(() => {
    loadSettings();
  }, [selectedBranch]);

  const saveSettings = async () => {
    await axios.patch(
      `${API}/finance/settings/${selectedBranch.id}`,
      settings,
      auth
    );

    alert("Settings updated");
    loadSettings();
  };

  const addPartner = async (e) => {
    e.preventDefault();

    await axios.post(
      `${API}/finance/partners`,
      {
        branchId: selectedBranch.id,
        ...partnerForm
      },
      auth
    );

    setPartnerForm({
      name: "",
      percent: "",
      phone: "",
      notes: ""
    });

    loadSettings();
  };

  const deletePartner = async (id) => {
    if (!confirm("Delete partner?")) return;

    await axios.delete(`${API}/finance/partners/${id}`, auth);

    loadSettings();
  };

  const totalPercent = partners.reduce(
    (sum, p) => sum + Number(p.percent || 0),
    0
  );

  return (
    <Layout title="Finance Settings">
      {!selectedBranch && (
        <div className="warning-message">Please select a branch first.</div>
      )}

      {selectedBranch && (
        <div className="finance-page">
          <div className="finance-header">
            <div>
              <h2>Finance Settings</h2>
              <p>{selectedBranch.branchName}</p>
            </div>

            <div className="finance-badge">
              Partner Total: <strong>{totalPercent}%</strong>
            </div>
          </div>

          <div className="finance-grid">
            <div className="finance-card">
              <h3>Default Percentages</h3>
              <p className="finance-muted">
                These values will be used while clearing invoices.
              </p>

              <div className="finance-form-group">
                <label>Dispatcher %</label>
                <input
                  type="number"
                  value={settings.dispatcherPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dispatcherPercent: e.target.value
                    })
                  }
                />
              </div>

              <div className="finance-form-group">
                <label>Accounts %</label>
                <input
                  type="number"
                  value={settings.accountsPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      accountsPercent: e.target.value
                    })
                  }
                />
              </div>

              <button className="primary-btn" onClick={saveSettings}>
                Save Settings
              </button>
            </div>

            <div className="finance-card">
              <h3>Add Partner</h3>
              <p className="finance-muted">
                Partner split will be calculated from remaining profit.
              </p>

              <form className="partner-form" onSubmit={addPartner}>
                <div className="finance-form-group">
                  <label>Partner Name</label>
                  <input
                    placeholder="Enter partner name"
                    value={partnerForm.name}
                    onChange={(e) =>
                      setPartnerForm({
                        ...partnerForm,
                        name: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div className="finance-form-group">
                  <label>Percentage %</label>
                  <input
                    type="number"
                    placeholder="Example: 50"
                    value={partnerForm.percent}
                    onChange={(e) =>
                      setPartnerForm({
                        ...partnerForm,
                        percent: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div className="finance-form-group">
                  <label>Phone</label>
                  <input
                    placeholder="Phone number"
                    value={partnerForm.phone}
                    onChange={(e) =>
                      setPartnerForm({
                        ...partnerForm,
                        phone: e.target.value
                      })
                    }
                  />
                </div>

                <div className="finance-form-group">
                  <label>Notes</label>
                  <input
                    placeholder="Optional notes"
                    value={partnerForm.notes}
                    onChange={(e) =>
                      setPartnerForm({
                        ...partnerForm,
                        notes: e.target.value
                      })
                    }
                  />
                </div>

                <button className="primary-btn" type="submit">
                  Add Partner
                </button>
              </form>
            </div>
          </div>

          <div className="finance-card partners-card">
            <div className="partners-title">
              <div>
                <h3>Partners</h3>
                <p className="finance-muted">
                  Total partner percentage should usually be 100%.
                </p>
              </div>

              <span
                className={
                  totalPercent === 100
                    ? "percent-good"
                    : totalPercent > 100
                    ? "percent-danger"
                    : "percent-warning"
                }
              >
                {totalPercent}%
              </span>
            </div>

            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Percentage</th>
                    <th>Phone</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {partners.map((partner) => (
                    <tr key={partner.id}>
                      <td>{partner.name}</td>
                      <td>{partner.percent}%</td>
                      <td>{partner.phone || "-"}</td>
                      <td>{partner.notes || "-"}</td>
                      <td>
                        <button
                          className="danger-btn"
                          onClick={() => deletePartner(partner.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {partners.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-row">
                        No partners added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default FinanceSettings;