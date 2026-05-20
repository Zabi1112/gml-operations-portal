import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import { BranchContext } from "../context/BranchContext.jsx";
import "./DailyReport.css";

function DailyReport() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const { selectedBranch } = useContext(BranchContext);

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";

  const emptyRow = {
    companyId: "",
    truckId: "",
    driverId: "",

    companyName: "",
    truckNumber: "",
    driverName: "",

    loadNumber: "",
    brokerNameCompany: "",
    pickupTime: "",
    deliveryTime: "",

    pickup: "",
    dropoff: "",
    ratePerMile: "",
    miles: "",
    grossAmount: "",

    pickupDate: "",
    dropoffDate: "",

    driverType: "SOLO DRIVER",
    bookedByTeam: "Team Alpha"
  };

  const [companies, setCompanies] = useState([]);
  const [rows, setRows] = useState([{ ...emptyRow }]);

  const loadCompanies = async () => {
    if (!selectedBranch?.id) {
      setCompanies([]);
      return;
    }

    const res = await axios.get(
      `${API}/companies?branchId=${selectedBranch.id}`,
      auth
    );

    setCompanies(res.data || []);
  };

  useEffect(() => {
    loadCompanies();
    setRows([{ ...emptyRow }]);
  }, [selectedBranch]);

  const getCompany = (companyId) => {
    return companies.find((c) => Number(c.id) === Number(companyId));
  };

  const updateRow = (index, key, value) => {
    const updated = [...rows];
    updated[index][key] = value;

    if (key === "companyId") {
      const company = getCompany(value);

      updated[index].companyName = company?.companyName || "";
      updated[index].truckId = "";
      updated[index].truckNumber = "";
      updated[index].driverId = "";
      updated[index].driverName = "";
    }

    if (key === "truckId") {
      const company = getCompany(updated[index].companyId);
      const truck = company?.trucks?.find((t) => Number(t.id) === Number(value));

      updated[index].truckNumber = truck?.truckNumber || "";
    }

    if (key === "driverId") {
      const company = getCompany(updated[index].companyId);
      const driver = company?.drivers?.find(
        (d) => Number(d.id) === Number(value)
      );

      updated[index].driverName = driver?.name || "";
    }

    if (key === "miles" || key === "ratePerMile") {
      const miles = Number(updated[index].miles || 0);
      const rate = Number(updated[index].ratePerMile || 0);

      if (miles > 0 && rate > 0) {
        updated[index].grossAmount = miles * rate;
      }
    }

    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { ...emptyRow }]);
  };

  const removeRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated.length ? updated : [{ ...emptyRow }]);
  };

  const saveLoads = async () => {
    if (!selectedBranch?.id) {
      alert("Please select branch first.");
      return;
    }

    if (!canEdit) {
      alert("Only admin and editor can save daily reports.");
      return;
    }

    const validRows = rows.filter(
      (row) =>
        row.companyId &&
        row.truckId &&
        row.pickup &&
        row.dropoff &&
        row.pickupDate &&
        Number(row.grossAmount || 0) > 0
    );

    if (validRows.length === 0) {
      alert("Please add at least one valid load row.");
      return;
    }

    try {
      for (const row of validRows) {
        await axios.post(
          `${API}/loads`,
          {
            branchId: selectedBranch.id,
            companyId: Number(row.companyId),
            truckId: Number(row.truckId),
            driverId: row.driverId ? Number(row.driverId) : null,

            companyName: row.companyName,
            truckNumber: row.truckNumber,
            driverName: row.driverName,

            loadNumber: row.loadNumber,
            brokerNameCompany: row.brokerNameCompany,
            pickupTime: row.pickupTime,
            deliveryTime: row.deliveryTime,

            driverType: row.driverType,
            bookedByTeam: row.bookedByTeam,

            loadDate: row.pickupDate,
            pickupDate: row.pickupDate,
            dropoffDate: row.dropoffDate || null,

            pickup: row.pickup,
            dropoff: row.dropoff,

            miles: Number(row.miles || 0),
            ratePerMile: Number(row.ratePerMile || 0),
            grossAmount: Number(row.grossAmount || 0),
            loadAmount: Number(row.grossAmount || 0),

            source: "DAILY_REPORT"
          },
          auth
        );
      }

      alert("Daily report loads saved successfully.");
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to save daily report.");
    }
  };

  const printReport = () => {
    window.print();
  };

  const totalGross = rows.reduce(
    (sum, row) => sum + Number(row.grossAmount || 0),
    0
  );

  const teams = ["Team Alpha", "Team Bravo", "Team Beta", "Team Delta"];

  return (
    <Layout title="Daily Report">
      {!selectedBranch && (
        <div className="warning-message">
          Please select a branch from Dashboard first.
        </div>
      )}

      {selectedBranch && !canEdit && (
        <div className="warning-message">
          You do not have permission to access Daily Report.
        </div>
      )}

      {selectedBranch && canEdit && (
        <div className="daily-report-page">
          <div className="daily-report-header no-print">
            <div>
              <h2>Daily Load Report</h2>
              <p>Add daily booked loads and save them into main loads database.</p>
            </div>

            <div className="daily-actions">
              <button type="button" onClick={addRow}>
                + Add Row
              </button>
              <button type="button" onClick={saveLoads}>
                Save Loads
              </button>
              <button type="button" onClick={printReport}>
                Print
              </button>
            </div>
          </div>

          <div className="daily-print-area">
            <div className="daily-print-header">
              <img src="/logo.jpeg" alt="GML Logo" />

              <div>
                <h1>Daily Load Report</h1>
                <p>{selectedBranch.branchName}</p>
              </div>

              <div>
                <strong>Date:</strong> {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="daily-card-list no-print">
              {rows.map((row, index) => {
                const company = getCompany(row.companyId);
                const trucks = company?.trucks || [];
                const drivers = company?.drivers || [];

                return (
                  <div className="daily-load-card" key={index}>
                    <div className="daily-card-top">
                      <h3>Load #{index + 1}</h3>

                      <button
                        type="button"
                        className="danger-mini"
                        onClick={() => removeRow(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="daily-card-grid">
                      <div>
                        <label>Company</label>
                        <select
                          value={row.companyId}
                          onChange={(e) =>
                            updateRow(index, "companyId", e.target.value)
                          }
                        >
                          <option value="">Company</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.companyName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Truck</label>
                        <select
                          value={row.truckId}
                          onChange={(e) =>
                            updateRow(index, "truckId", e.target.value)
                          }
                        >
                          <option value="">Truck</option>
                          {trucks.map((truck) => (
                            <option key={truck.id} value={truck.id}>
                              {truck.truckNumber}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Load Number</label>
                        <input
                          value={row.loadNumber}
                          onChange={(e) =>
                            updateRow(index, "loadNumber", e.target.value)
                          }
                          placeholder="Load #"
                        />
                      </div>

                      <div>
                        <label>Broker Name / Company</label>
                        <input
                          value={row.brokerNameCompany}
                          onChange={(e) =>
                            updateRow(
                              index,
                              "brokerNameCompany",
                              e.target.value
                            )
                          }
                          placeholder="Broker / Company"
                        />
                      </div>

                      <div>
                        <label>Pickup Location</label>
                        <input
                          value={row.pickup}
                          onChange={(e) =>
                            updateRow(index, "pickup", e.target.value)
                          }
                          placeholder="Pickup"
                        />
                      </div>

                      <div>
                        <label>Dropoff Location</label>
                        <input
                          value={row.dropoff}
                          onChange={(e) =>
                            updateRow(index, "dropoff", e.target.value)
                          }
                          placeholder="Dropoff"
                        />
                      </div>

                      <div>
                        <label>Rate</label>
                        <input
                          type="number"
                          value={row.ratePerMile}
                          onChange={(e) =>
                            updateRow(index, "ratePerMile", e.target.value)
                          }
                          placeholder="Rate"
                        />
                      </div>

                      <div>
                        <label>Miles</label>
                        <input
                          type="number"
                          value={row.miles}
                          onChange={(e) =>
                            updateRow(index, "miles", e.target.value)
                          }
                          placeholder="Miles"
                        />
                      </div>

                      <div>
                        <label>Gross Amount</label>
                        <input
                          type="number"
                          value={row.grossAmount}
                          onChange={(e) =>
                            updateRow(index, "grossAmount", e.target.value)
                          }
                          placeholder="Gross"
                        />
                      </div>

                      <div>
                        <label>Pickup Date</label>
                        <input
                          type="date"
                          value={row.pickupDate}
                          onChange={(e) =>
                            updateRow(index, "pickupDate", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label>Dropoff Date</label>
                        <input
                          type="date"
                          value={row.dropoffDate}
                          onChange={(e) =>
                            updateRow(index, "dropoffDate", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label>Delivery Time</label>
                        <input
                          type="time"
                          value={row.deliveryTime}
                          onChange={(e) =>
                            updateRow(index, "deliveryTime", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label>Pickup Time</label>
                        <input
                          type="time"
                          value={row.pickupTime}
                          onChange={(e) =>
                            updateRow(index, "pickupTime", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label>Driver</label>
                        <select
                          value={row.driverId}
                          onChange={(e) =>
                            updateRow(index, "driverId", e.target.value)
                          }
                        >
                          <option value="">Driver</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Driver Type</label>
                        <select
                          value={row.driverType}
                          onChange={(e) =>
                            updateRow(index, "driverType", e.target.value)
                          }
                        >
                          <option value="SOLO DRIVER">Solo Driver</option>
                          <option value="TEAM DRIVER">Team Driver</option>
                        </select>
                      </div>

                      <div>
                        <label>Booked By</label>
                        <select
                          value={row.bookedByTeam}
                          onChange={(e) =>
                            updateRow(index, "bookedByTeam", e.target.value)
                          }
                        >
                          {teams.map((team) => (
                            <option key={team} value={team}>
                              {team}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="daily-print-report">
              {teams.map((team) => {
                const teamRows = rows.filter(
                  (row) => row.bookedByTeam === team && row.companyName
                );

                const teamGross = teamRows.reduce(
                  (sum, row) => sum + Number(row.grossAmount || 0),
                  0
                );

                if (teamRows.length === 0) return null;

                return (
                  <div className="team-print-section" key={team}>
                    <h2>{team}</h2>

                    <table className="team-print-table">
                      <thead>
                        <tr>
                          <th>Load #</th>
                          <th>Company</th>
                          <th>Broker</th>
                          <th>Truck</th>
                          <th>Pickup</th>
                          <th>Dropoff</th>
                          <th>Rate</th>
                          <th>Miles</th>
                          <th>Gross</th>
                          <th>Pickup Date</th>
                          <th>Dropoff Date</th>
                          <th>Pickup Time</th>
                          <th>Delivery Time</th>
                          <th>Driver</th>
                          <th>Type</th>
                        </tr>
                      </thead>

                      <tbody>
                        {teamRows.map((row, index) => (
                          <tr key={index}>
                            <td>{row.loadNumber || "-"}</td>
                            <td>{row.companyName || "-"}</td>
                            <td>{row.brokerNameCompany || "-"}</td>
                            <td>{row.truckNumber || "-"}</td>
                            <td>{row.pickup || "-"}</td>
                            <td>{row.dropoff || "-"}</td>
                            <td>${Number(row.ratePerMile || 0).toFixed(2)}</td>
                            <td>{Number(row.miles || 0).toFixed(0)}</td>
                            <td>${Number(row.grossAmount || 0).toFixed(2)}</td>
                            <td>{row.pickupDate || "-"}</td>
                            <td>{row.dropoffDate || "-"}</td>
                            <td>{row.pickupTime || "-"}</td>
                            <td>{row.deliveryTime || "-"}</td>
                            <td>{row.driverName || "-"}</td>
                            <td>{row.driverType || "-"}</td>
                          </tr>
                        ))}

                        <tr className="team-total-row">
                          <td colSpan="8">
                            <strong>{team} Total</strong>
                          </td>
                          <td>
                            <strong>${teamGross.toFixed(2)}</strong>
                          </td>
                          <td colSpan="5"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}

              <div className="daily-grand-total">
                Grand Total: ${totalGross.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default DailyReport;