import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import { BranchContext } from "../context/BranchContext.jsx";
import "./Companies.css";

function Companies() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const { selectedBranch } = useContext(BranchContext);

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

  const loadCompanies = async () => {
    if (!selectedBranch?.id) {
      setCompanies([]);
      return;
    }

    const res = await axios.get(
      `${API}/companies?branchId=${selectedBranch.id}`,
      auth
    );

    setCompanies(res.data);
  };

  useEffect(() => {
    loadCompanies();
    setCompanyForm(emptyCompany);
    setTruckForm(emptyTruck);
    setDriverForm(emptyDriver);
    setEditingCompanyId(null);
  }, [selectedBranch]);

  const saveCompany = async (e) => {
    e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    const payload = {
      ...companyForm,
      branchId: selectedBranch.id,
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
    if (!confirm("Delete this client company with its trucks and drivers?")) return;

    await axios.delete(`${API}/companies/${id}`, auth);
    loadCompanies();
  };

  const saveTruck = async (e) => {
    e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    await axios.post(
      `${API}/trucks`,
      {
        ...truckForm,
        branchId: selectedBranch.id,
        companyId: Number(truckForm.companyId)
      },
      auth
    );

    setTruckForm(emptyTruck);
    loadCompanies();
  };

  const saveDriver = async (e) => {
    e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    await axios.post(
      `${API}/drivers`,
      {
        ...driverForm,
        branchId: selectedBranch.id,
        companyId: Number(driverForm.companyId),
        truckId: driverForm.truckId ? Number(driverForm.truckId) : null
      },
      auth
    );

    setDriverForm(emptyDriver);
    loadCompanies();
  };

  const trucksForDriver =
    companies.find((c) => c.id === Number(driverForm.companyId))?.trucks || [];

  return (
    <Layout title="Client Companies">
      {!selectedBranch && (
        <div className="warning-message">
          Please select a GML branch from Dashboard first.
        </div>
      )}

      {selectedBranch && (
        <>
          {canEdit && (
            <form className="company-form" onSubmit={saveCompany}>
              <h3>
                {editingCompanyId ? "Edit Client Company" : "Create Client Company"}
              </h3>

              <div className="form-group">
                <label>Active GML Branch</label>
                <input value={selectedBranch.branchName} readOnly />
              </div>

              <div className="form-group">
                <label>Client Company Name</label>
                <input
                  value={companyForm.companyName}
                  onChange={(e) =>
                    setCompanyForm({
                      ...companyForm,
                      companyName: e.target.value
                    })
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
                    setCompanyForm({
                      ...companyForm,
                      billingType: e.target.value
                    })
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
                  <label>Client Company</label>
                  <select
                    value={truckForm.companyId}
                    onChange={(e) =>
                      setTruckForm({
                        ...truckForm,
                        companyId: e.target.value
                      })
                    }
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Truck Number</label>
                  <input
                    value={truckForm.truckNumber}
                    onChange={(e) =>
                      setTruckForm({
                        ...truckForm,
                        truckNumber: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Trailer Number</label>
                  <input
                    value={truckForm.trailerNumber}
                    onChange={(e) =>
                      setTruckForm({
                        ...truckForm,
                        trailerNumber: e.target.value
                      })
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

                <button type="submit">Add Truck</button>
              </form>

              <form className="mini-form" onSubmit={saveDriver}>
                <h3>Add Driver</h3>

                <div className="form-group">
                  <label>Client Company</label>
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
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.companyName}
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
                    <option value="">No Truck / Team Driver</option>
                    {trucksForDriver.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.truckNumber}
                        {truck.trailerNumber
                          ? ` / ${truck.trailerNumber}`
                          : ""}
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

                <button type="submit">Add Driver</button>
              </form>
            </div>
          )}

          <div className="company-list">
            {companies.map((company) => (
              <div className="company-card" key={company.id}>
                <div className="company-card-header">
                  <div>
                    <h3>{company.companyName}</h3>
                    <p>
                      Owner: {company.ownerName || "-"} | MC:{" "}
                      {company.mcNumber || "-"} | DOT: {company.dotNumber || "-"}
                    </p>
                    <p>
                      Billing: {company.billingType}
                      {company.billingType === "PERCENTAGE"
                        ? ` — ${company.dispatchPercent}%`
                        : ` — $${company.fixedMonthlyRate}/truck`}
                    </p>
                  </div>

                  <div className="card-actions">
                    {canEdit && (
                      <button onClick={() => editCompany(company)}>Edit</button>
                    )}
                    {canDelete && (
                      <button
                        className="danger"
                        onClick={() => deleteCompany(company.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="company-details">
                  <p>
                    <strong>Address:</strong> {company.address || "-"}
                  </p>
                  <p>
                    <strong>Phone:</strong> {company.contactNumber || "-"}
                  </p>
                  <p>
                    <strong>Email:</strong> {company.email || "-"}
                  </p>
                  <p>
                    <strong>Account:</strong> {company.accountTitle || "-"} /{" "}
                    {company.accountNumber || "-"}
                  </p>
                </div>

                <div className="nested-section">
                  <h4>Trucks</h4>
                  {company.trucks?.length ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Truck</th>
                          <th>Trailer</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {company.trucks.map((truck) => (
                          <tr key={truck.id}>
                            <td>{truck.truckNumber}</td>
                            <td>{truck.trailerNumber || "-"}</td>
                            <td>{truck.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No trucks added.</p>
                  )}
                </div>

                <div className="nested-section">
                  <h4>Drivers</h4>
                  {company.drivers?.length ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>Truck</th>
                        </tr>
                      </thead>
                      <tbody>
                        {company.drivers.map((driver) => (
                          <tr key={driver.id}>
                            <td>{driver.name}</td>
                            <td>{driver.phone || "-"}</td>
                            <td>{driver.email || "-"}</td>
                            <td>{driver.truck?.truckNumber || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No drivers added.</p>
                  )}
                </div>
              </div>
            ))}

            {companies.length === 0 && (
              <div className="warning-message">
                No client companies found for this branch.
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}

export default Companies;