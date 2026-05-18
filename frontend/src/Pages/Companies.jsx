import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import "./Companies.css";

const API = "http://localhost:5000/api";

function Companies() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";
  const canDelete = user?.role === "ADMIN";

  const emptyCompany = {
    companyName: "",
    ownerName: "",
    mcNumber: "",
    dotNumber: "",
    address: "",
    contactNumber: "",
    email: "",
    billingType: "PERCENTAGE",
    dispatchPercent: 0,
    fixedMonthlyRate: 0,
    accountNumber: "",
    accountTitle: "",
    notes: ""
  };

  const emptyTruck = {
    companyId: "",
    truckNumber: "",
    trailerNumber: "",
    notes: ""
  };

  const emptyDriver = {
    companyId: "",
    truckId: "",
    name: "",
    phone: "",
    email: ""
  };

  const [companies, setCompanies] = useState([]);
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [truckForm, setTruckForm] = useState(emptyTruck);
  const [driverForm, setDriverForm] = useState(emptyDriver);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const loadCompanies = async () => {
    const res = await axios.get(`${API}/companies`, auth);
    setCompanies(res.data);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const saveCompany = async (e) => {
    e.preventDefault();

    const payload = {
      ...companyForm,
      dispatchPercent: Number(companyForm.dispatchPercent || 0),
      fixedMonthlyRate: Number(companyForm.fixedMonthlyRate || 0)
    };

    if (editingCompanyId) {
      await axios.patch(`${API}/companies/${editingCompanyId}`, payload, auth);
    } else {
      await axios.post(`${API}/companies`, payload, auth);
    }

    setCompanyForm(emptyCompany);
    setEditingCompanyId(null);
    loadCompanies();
  };

  const editCompany = (company) => {
    setEditingCompanyId(company.id);
    setCompanyForm({
      companyName: company.companyName || "",
      ownerName: company.ownerName || "",
      mcNumber: company.mcNumber || "",
      dotNumber: company.dotNumber || "",
      address: company.address || "",
      contactNumber: company.contactNumber || "",
      email: company.email || "",
      billingType: company.billingType || "PERCENTAGE",
      dispatchPercent: company.dispatchPercent || 0,
      fixedMonthlyRate: company.fixedMonthlyRate || 0,
      accountNumber: company.accountNumber || "",
      accountTitle: company.accountTitle || "",
      notes: company.notes || ""
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCompany = async (id) => {
    if (!confirm("Delete this company with its trucks and drivers?")) return;
    await axios.delete(`${API}/companies/${id}`, auth);
    loadCompanies();
  };

  const saveTruck = async (e) => {
    e.preventDefault();

    await axios.post(
      `${API}/trucks`,
      {
        ...truckForm,
        companyId: Number(truckForm.companyId)
      },
      auth
    );

    setTruckForm(emptyTruck);
    loadCompanies();
  };

  const saveDriver = async (e) => {
    e.preventDefault();

    await axios.post(
      `${API}/drivers`,
      {
        ...driverForm,
        companyId: Number(driverForm.companyId),
        truckId: driverForm.truckId ? Number(driverForm.truckId) : null
      },
      auth
    );

    setDriverForm(emptyDriver);
    loadCompanies();
  };

  const selectedCompany = companies.find(
    (c) => c.id === Number(selectedCompanyId)
  );

  const trucksForDriver = companies
    .find((c) => c.id === Number(driverForm.companyId))
    ?.trucks || [];

  return (
    <Layout title="Companies">
      {canEdit && (
        <form className="company-form" onSubmit={saveCompany}>
          <h3>{editingCompanyId ? "Edit Company" : "Create Company"}</h3>

          <div className="form-group">
            <label>Company Name</label>
            <input
              value={companyForm.companyName}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, companyName: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Owner Name</label>
            <input
              value={companyForm.ownerName}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, ownerName: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>MC Number</label>
            <input
              value={companyForm.mcNumber}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, mcNumber: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>DOT Number</label>
            <input
              value={companyForm.dotNumber}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, dotNumber: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              value={companyForm.address}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, address: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              value={companyForm.contactNumber}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  contactNumber: e.target.value
                })
              }
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              value={companyForm.email}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, email: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Billing Type</label>
            <select
              value={companyForm.billingType}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, billingType: e.target.value })
              }
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Monthly Per Truck</option>
            </select>
          </div>

          {companyForm.billingType === "PERCENTAGE" && (
            <div className="form-group">
              <label>Dispatch Percentage %</label>
              <input
                type="number"
                value={companyForm.dispatchPercent}
                onChange={(e) =>
                  setCompanyForm({
                    ...companyForm,
                    dispatchPercent: e.target.value
                  })
                }
              />
            </div>
          )}

          {companyForm.billingType === "FIXED" && (
            <div className="form-group">
              <label>Fixed Monthly Rate Per Truck $</label>
              <input
                type="number"
                value={companyForm.fixedMonthlyRate}
                onChange={(e) =>
                  setCompanyForm({
                    ...companyForm,
                    fixedMonthlyRate: e.target.value
                  })
                }
              />
            </div>
          )}

          <div className="form-group">
            <label>Account Number</label>
            <input
              value={companyForm.accountNumber}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  accountNumber: e.target.value
                })
              }
            />
          </div>

          <div className="form-group">
            <label>Account Title</label>
            <input
              value={companyForm.accountTitle}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  accountTitle: e.target.value
                })
              }
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <input
              value={companyForm.notes}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, notes: e.target.value })
              }
            />
          </div>

          <button type="submit">
            {editingCompanyId ? "Update Company" : "Create Company"}
          </button>

          {editingCompanyId && (
            <button
              type="button"
              onClick={() => {
                setCompanyForm(emptyCompany);
                setEditingCompanyId(null);
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>
      )}

      {canEdit && (
        <div className="sub-forms">
          <form className="mini-form" onSubmit={saveTruck}>
            <h3>Add Truck</h3>

            <div className="form-group">
              <label>Company</label>
              <select
                value={truckForm.companyId}
                onChange={(e) =>
                  setTruckForm({ ...truckForm, companyId: e.target.value })
                }
                required
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Truck Number</label>
              <input
                value={truckForm.truckNumber}
                onChange={(e) =>
                  setTruckForm({ ...truckForm, truckNumber: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Trailer Number</label>
              <input
                value={truckForm.trailerNumber}
                onChange={(e) =>
                  setTruckForm({ ...truckForm, trailerNumber: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <input
                value={truckForm.notes}
                onChange={(e) =>
                  setTruckForm({ ...truckForm, notes: e.target.value })
                }
              />
            </div>

            <button>Add Truck</button>
          </form>

          <form className="mini-form" onSubmit={saveDriver}>
            <h3>Add Driver</h3>

            <div className="form-group">
              <label>Company</label>
              <select
                value={driverForm.companyId}
                onChange={(e) =>
                  setDriverForm({
                    ...driverForm,
                    companyId: e.target.value,
                    truckId: ""
                  })
                }
                required
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Truck</label>
              <select
                value={driverForm.truckId}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, truckId: e.target.value })
                }
              >
                <option value="">Select Truck</option>
                {trucksForDriver.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.truckNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Driver Name</label>
              <input
                value={driverForm.name}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, name: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                value={driverForm.phone}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, phone: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                value={driverForm.email}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, email: e.target.value })
                }
              />
            </div>

            <button>Add Driver</button>
          </form>
        </div>
      )}

      <div className="company-browser">
        <div className="form-group">
          <label>View Company Details</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            <option value="">Select Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.companyName}
              </option>
            ))}
          </select>
        </div>

        {selectedCompany && (
          <div className="company-card">
            <div className="company-card-head">
              <div>
                <h2>{selectedCompany.companyName}</h2>
                <p>Owner: {selectedCompany.ownerName || "-"}</p>
                <p>MC: {selectedCompany.mcNumber || "-"} | DOT: {selectedCompany.dotNumber || "-"}</p>
                <p>
                  Billing: {selectedCompany.billingType}
                  {selectedCompany.billingType === "PERCENTAGE"
                    ? ` — ${selectedCompany.dispatchPercent}%`
                    : ` — $${selectedCompany.fixedMonthlyRate}/truck/month`}
                </p>
              </div>

              <div>
                {canEdit && (
                  <button onClick={() => editCompany(selectedCompany)}>
                    Edit
                  </button>
                )}

                {canDelete && (
                  <button
                    className="danger"
                    onClick={() => deleteCompany(selectedCompany.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <h3>Trucks</h3>
            <div className="nested-list">
              {selectedCompany.trucks?.length > 0 ? (
                selectedCompany.trucks.map((truck) => (
                  <div className="nested-item" key={truck.id}>
                    <strong>{truck.truckNumber}</strong>
                    <span>Trailer: {truck.trailerNumber || "-"}</span>
                  </div>
                ))
              ) : (
                <p>No trucks added.</p>
              )}
            </div>

            <h3>Drivers</h3>
            <div className="nested-list">
              {selectedCompany.drivers?.length > 0 ? (
                selectedCompany.drivers.map((driver) => (
                  <div className="nested-item" key={driver.id}>
                    <strong>{driver.name}</strong>
                    <span>
                      Truck: {driver.truck?.truckNumber || "-"} | Phone:{" "}
                      {driver.phone || "-"}
                    </span>
                  </div>
                ))
              ) : (
                <p>No drivers added.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Companies;