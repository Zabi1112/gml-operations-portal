import { useContext, useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout.jsx";
import { API } from "../api";
import { BranchContext } from "../context/BranchContext.jsx";

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

    await axios.delete(
      `${API}/finance/partners/${id}`,
      auth
    );

    loadSettings();
  };

  const totalPercent = partners.reduce(
    (sum, p) => sum + Number(p.percent || 0),
    0
  );

  return (
    <Layout title="Finance Settings">
      {!selectedBranch && (
        <div className="warning-message">
          Please select a branch first.
        </div>
      )}

      {selectedBranch && (
        <>
          <div className="card">
            <h2>
              Finance Settings — {selectedBranch.branchName}
            </h2>

            <div className="form-group">
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

            <div className="form-group">
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

            <button onClick={saveSettings}>
              Save Settings
            </button>
          </div>

          <div className="card">
            <h2>Add Partner</h2>

            <form onSubmit={addPartner}>
              <input
                placeholder="Partner Name"
                value={partnerForm.name}
                onChange={(e) =>
                  setPartnerForm({
                    ...partnerForm,
                    name: e.target.value
                  })
                }
                required
              />

              <input
                type="number"
                placeholder="Percentage"
                value={partnerForm.percent}
                onChange={(e) =>
                  setPartnerForm({
                    ...partnerForm,
                    percent: e.target.value
                  })
                }
                required
              />

              <input
                placeholder="Phone"
                value={partnerForm.phone}
                onChange={(e) =>
                  setPartnerForm({
                    ...partnerForm,
                    phone: e.target.value
                  })
                }
              />

              <input
                placeholder="Notes"
                value={partnerForm.notes}
                onChange={(e) =>
                  setPartnerForm({
                    ...partnerForm,
                    notes: e.target.value
                  })
                }
              />

              <button type="submit">
                Add Partner
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Partners</h2>

            <p>
              Total Percentage: <b>{totalPercent}%</b>
            </p>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>%</th>
                  <th>Phone</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {partners.map((partner) => (
                  <tr key={partner.id}>
                    <td>{partner.name}</td>
                    <td>{partner.percent}%</td>
                    <td>{partner.phone || "-"}</td>

                    <td>
                      <button
                        className="danger"
                        onClick={() =>
                          deletePartner(partner.id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}

export default FinanceSettings;