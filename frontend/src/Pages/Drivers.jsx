import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import "./Drivers.css";

const API = "http://localhost:5000/api";

function Drivers() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    mcNumber: "",
    dotNumber: "",
    truckNumber: "",
    trailer: "",
    carrierName: "",
    ratePercent: 0
  });

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";
  const canDelete = user?.role === "ADMIN";

  const loadDrivers = async () => {
    const res = await axios.get(`${API}/drivers`, auth);
    setDrivers(res.data);
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const createDriver = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        `${API}/drivers`,
        {
          ...form,
          ratePercent: Number(form.ratePercent)
        },
        auth
      );

      setForm({
        name: "",
        phone: "",
        email: "",
        mcNumber: "",
        dotNumber: "",
        truckNumber: "",
        trailer: "",
        carrierName: "",
        ratePercent: 0
      });

      loadDrivers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create driver");
    }
  };

  const deleteDriver = async (id) => {
    if (!confirm("Delete this driver?")) return;

    try {
      await axios.delete(`${API}/drivers/${id}`, auth);
      loadDrivers();
    } catch (error) {
      alert("Failed to delete driver");
    }
  };

  return (
    <Layout title="Driver Management">
      {canEdit && (
        <form className="driver-form" onSubmit={createDriver}>
          <input placeholder="Driver Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="MC Number" value={form.mcNumber} onChange={(e) => setForm({ ...form, mcNumber: e.target.value })} />
          <input placeholder="DOT Number" value={form.dotNumber} onChange={(e) => setForm({ ...form, dotNumber: e.target.value })} />
          <input placeholder="Truck Number" value={form.truckNumber} onChange={(e) => setForm({ ...form, truckNumber: e.target.value })} />
          <input placeholder="Trailer" value={form.trailer} onChange={(e) => setForm({ ...form, trailer: e.target.value })} />
          <input placeholder="Carrier Name" value={form.carrierName} onChange={(e) => setForm({ ...form, carrierName: e.target.value })} />
          <input type="number" placeholder="Rate %" value={form.ratePercent} onChange={(e) => setForm({ ...form, ratePercent: e.target.value })} />

          <button type="submit">Create Driver</button>
        </form>
      )}

      <div className="driver-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>MC</th>
              <th>DOT</th>
              <th>Truck</th>
              <th>Trailer</th>
              <th>Carrier</th>
              <th>Rate %</th>
              {canDelete && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.name}</td>
                <td>{driver.phone || "-"}</td>
                <td>{driver.email || "-"}</td>
                <td>{driver.mcNumber || "-"}</td>
                <td>{driver.dotNumber || "-"}</td>
                <td>{driver.truckNumber || "-"}</td>
                <td>{driver.trailer || "-"}</td>
                <td>{driver.carrierName || "-"}</td>
                <td>{driver.ratePercent}%</td>

                {canDelete && (
                  <td>
                    <button className="danger" onClick={() => deleteDriver(driver.id)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default Drivers;