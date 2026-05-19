import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import { BranchContext } from "../context/BranchContext.jsx";
import "./Drivers.css";

function Drivers() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const { selectedBranch } = useContext(BranchContext);

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";
  const canDelete = user?.role === "ADMIN";

  const emptyForm = {
    companyId: "",
    truckId: "",
    name: "",
    phone: "",
    email: ""
  };

  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(emptyForm);

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

  const loadDrivers = async () => {
    if (!selectedBranch?.id) {
      setDrivers([]);
      return;
    }

    const res = await axios.get(
      `${API}/drivers?branchId=${selectedBranch.id}`,
      auth
    );

    setDrivers(res.data);
  };

  useEffect(() => {
    loadCompanies();
    loadDrivers();
    setForm(emptyForm);
  }, [selectedBranch]);

  const selectedCompany = companies.find(
    (c) => c.id === Number(form.companyId)
  );

  const trucks = selectedCompany?.trucks || [];

  const createDriver = async (e) => {
    e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    await axios.post(
      `${API}/drivers`,
      {
        branchId: selectedBranch.id,
        companyId: Number(form.companyId),
        truckId: form.truckId ? Number(form.truckId) : null,
        name: form.name,
        phone: form.phone,
        email: form.email
      },
      auth
    );

    setForm(emptyForm);
    loadDrivers();
    loadCompanies();
  };

  const deleteDriver = async (id) => {
    if (!confirm("Delete this driver?")) return;

    await axios.delete(`${API}/drivers/${id}`, auth);
    loadDrivers();
    loadCompanies();
  };

  return (
    <Layout title="Driver Management">
      {!selectedBranch && (
        <div className="warning-message">
          Please select a GML branch from Dashboard first.
        </div>
      )}

      {selectedBranch && canEdit && (
        <form className="driver-form" onSubmit={createDriver}>
          <select
            value={form.companyId}
            onChange={(e) =>
              setForm({ ...form, companyId: e.target.value, truckId: "" })
            }
            required
          >
            <option value="">Select Client Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.companyName}
              </option>
            ))}
          </select>

          <select
            value={form.truckId}
            onChange={(e) => setForm({ ...form, truckId: e.target.value })}
          >
            <option value="">No Truck / Team Driver</option>
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.truckNumber}
                {truck.trailerNumber ? ` / ${truck.trailerNumber}` : ""}
              </option>
            ))}
          </select>

          <input
            placeholder="Driver Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <button type="submit">Create Driver</button>
        </form>
      )}

      {selectedBranch && (
        <div className="driver-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Truck</th>
                <th>Phone</th>
                <th>Email</th>
                {canDelete && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td>{driver.name}</td>
                  <td>{driver.company?.companyName || "-"}</td>
                  <td>{driver.truck?.truckNumber || "-"}</td>
                  <td>{driver.phone || "-"}</td>
                  <td>{driver.email || "-"}</td>

                  {canDelete && (
                    <td>
                      <button
                        className="danger"
                        onClick={() => deleteDriver(driver.id)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {drivers.length === 0 && (
                <tr>
                  <td colSpan="6">No drivers found for this branch.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

export default Drivers;