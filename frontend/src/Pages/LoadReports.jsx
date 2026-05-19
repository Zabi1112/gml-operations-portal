import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import LoadReportView from "../components/LoadReportView.jsx";
import { BranchContext } from "../context/BranchContext.jsx";
import "./LoadReports.css";

function LoadReports() {
  const token = localStorage.getItem("token");
  const { selectedBranch } = useContext(BranchContext);

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const [companies, setCompanies] = useState([]);
  const [loads, setLoads] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [report, setReport] = useState(null);

  const [form, setForm] = useState({
    companyId: "",
    truckId: "",
    from: "",
    to: "",
    reportTitle: "Driver Load Report"
  });

  const [manualLoad, setManualLoad] = useState({
    pickupDate: "",
    dropoffDate: "",
    pickup: "",
    dropoff: "",
    miles: 0,
    ratePerMile: 0,
    grossAmount: 0
  });

  const [reasonForm, setReasonForm] = useState({
    reasonDate: "",
    reasonType: "No Dispatch",
    reasonNote: ""
  });

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
    setLoads([]);
    setReasons([]);
    setReport(null);
    setForm({
      companyId: "",
      truckId: "",
      from: "",
      to: "",
      reportTitle: "Driver Load Report"
    });
  }, [selectedBranch]);

  const selectedCompany = companies.find(
    (c) => c.id === Number(form.companyId)
  );

  const trucks = selectedCompany?.trucks || [];
  const selectedTruck = trucks.find((t) => t.id === Number(form.truckId));

  const fetchReportData = async (e) => {
    if (e) e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    if (!form.companyId || !form.truckId || !form.from || !form.to) {
      alert("Please select company, truck, from date, and to date.");
      return;
    }

    const params = new URLSearchParams();
    params.append("branchId", selectedBranch.id);
    params.append("companyId", form.companyId);
    params.append("truckId", form.truckId);
    params.append("from", form.from);
    params.append("to", form.to);

    const loadRes = await axios.get(`${API}/loads?${params.toString()}`, auth);
    const reasonRes = await axios.get(
      `${API}/loads/reasons?${params.toString()}`,
      auth
    );

    setLoads(loadRes.data);
    setReasons(reasonRes.data);
  };

  const calculateGross = (miles, ratePerMile, grossAmount) => {
    const manualGross = Number(grossAmount || 0);
    if (manualGross > 0) return manualGross;

    return Number(miles || 0) * Number(ratePerMile || 0);
  };

  const updateLocalLoad = (id, key, value) => {
    setLoads((prev) =>
      prev.map((load) => {
        if (load.id !== id) return load;

        const updated = { ...load, [key]: value };

        if (key === "miles" || key === "grossAmount") {
          const miles = Number(updated.miles || 0);
          const gross = Number(updated.grossAmount || updated.loadAmount || 0);

          updated.ratePerMile = miles > 0 ? gross / miles : 0;
          updated.loadAmount = gross;
        }

        if (key === "ratePerMile") {
          const miles = Number(updated.miles || 0);
          const rpm = Number(updated.ratePerMile || 0);

          updated.grossAmount = miles * rpm;
          updated.loadAmount = updated.grossAmount;
        }

        if (key === "grossAmount") {
          updated.loadAmount = Number(value || 0);
        }

        return updated;
      })
    );
  };

  const saveEditedLoad = async (load) => {
    const grossAmount = calculateGross(
      load.miles,
      load.ratePerMile,
      load.grossAmount
    );

    await axios.patch(
      `${API}/loads/${load.id}`,
      {
        pickupDate: load.pickupDate,
        dropoffDate: load.dropoffDate,
        pickup: load.pickup,
        dropoff: load.dropoff,
        miles: Number(load.miles || 0),
        ratePerMile: Number(load.ratePerMile || 0),
        grossAmount
      },
      auth
    );

    fetchReportData();
  };

  const saveManualLoad = async (e) => {
    e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    if (!selectedCompany || !selectedTruck) {
      alert("Select company and truck first.");
      return;
    }

    const miles = Number(manualLoad.miles || 0);
    const ratePerMile = Number(manualLoad.ratePerMile || 0);
    const grossAmount = calculateGross(
      miles,
      ratePerMile,
      manualLoad.grossAmount
    );

    await axios.post(
      `${API}/loads`,
      {
        branchId: selectedBranch.id,
        companyId: Number(form.companyId),
        truckId: Number(form.truckId),

        companyName: selectedCompany.companyName,
        truckNumber: selectedTruck.truckNumber,

        loadDate: manualLoad.pickupDate,
        pickupDate: manualLoad.pickupDate,
        dropoffDate: manualLoad.dropoffDate,

        pickup: manualLoad.pickup,
        dropoff: manualLoad.dropoff,

        miles,
        ratePerMile,
        grossAmount,
        loadAmount: grossAmount,

        source: "MANUAL"
      },
      auth
    );

    setManualLoad({
      pickupDate: "",
      dropoffDate: "",
      pickup: "",
      dropoff: "",
      miles: 0,
      ratePerMile: 0,
      grossAmount: 0
    });

    fetchReportData();
  };

  const deleteLoad = async (id) => {
    if (!confirm("Delete this load?")) return;
    await axios.delete(`${API}/loads/${id}`, auth);
    fetchReportData();
  };

  const deleteReason = async (id) => {
    if (!confirm("Delete this reason?")) return;
    await axios.delete(`${API}/loads/reasons/${id}`, auth);
    fetchReportData();
  };

  const saveReason = async (e) => {
    e.preventDefault();

    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    if (!selectedCompany || !selectedTruck) {
      alert("Select company and truck first.");
      return;
    }

    await axios.post(
      `${API}/loads/reasons`,
      {
        branchId: selectedBranch.id,
        companyId: Number(form.companyId),
        truckId: Number(form.truckId),

        companyName: selectedCompany.companyName,
        truckNumber: selectedTruck.truckNumber,

        reasonDate: reasonForm.reasonDate,
        reasonType: reasonForm.reasonType,
        reasonNote: reasonForm.reasonNote
      },
      auth
    );

    setReasonForm({
      reasonDate: "",
      reasonType: "No Dispatch",
      reasonNote: ""
    });

    fetchReportData();
  };

  const generateReport = () => {
    if (!selectedBranch?.id) {
      alert("Please select a branch first.");
      return;
    }

    if (!selectedCompany || !selectedTruck) {
      alert("Select company and truck first.");
      return;
    }

    const totalGross = loads.reduce(
      (sum, l) => sum + Number(l.grossAmount || l.loadAmount || 0),
      0
    );

    const totalMiles = loads.reduce((sum, l) => sum + Number(l.miles || 0), 0);
    const avgRatePerMile = totalMiles > 0 ? totalGross / totalMiles : 0;

    setReport({
      branchId: selectedBranch.id,
      companyId: Number(form.companyId),
      truckId: Number(form.truckId),

      title: form.reportTitle,
      companyName: selectedCompany.companyName,
      ownerName: selectedCompany.ownerName,
      mcNumber: selectedCompany.mcNumber,
      dotNumber: selectedCompany.dotNumber,
      truckNumber: selectedTruck.truckNumber,
      trailerNumber: selectedTruck.trailerNumber,
      from: form.from,
      to: form.to,
      loads,
      reasons,
      totalLoads: loads.length,
      totalGross,
      totalMiles,
      avgRatePerMile,
      reasonDays: reasons.length
    });
  };

  return (
    <Layout title="Load Reports">
      {!selectedBranch && (
        <div className="warning-message">
          Please select a GML branch from Dashboard first.
        </div>
      )}

      {selectedBranch && (
        <>
          <form className="load-config" onSubmit={fetchReportData}>
            <div className="form-group">
              <label>Active GML Branch</label>
              <input value={selectedBranch.branchName} readOnly />
            </div>

            <div className="form-group">
              <label>Client Company</label>
              <select
                value={form.companyId}
                onChange={(e) =>
                  setForm({ ...form, companyId: e.target.value, truckId: "" })
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
                value={form.truckId}
                onChange={(e) => setForm({ ...form, truckId: e.target.value })}
                required
              >
                <option value="">Select Truck</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.truckNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>From Date</label>
              <input
                type="date"
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>To Date</label>
              <input
                type="date"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Report Title</label>
              <input
                value={form.reportTitle}
                onChange={(e) =>
                  setForm({ ...form, reportTitle: e.target.value })
                }
              />
            </div>

            <button type="submit">Fetch Loads</button>
            <button type="button" onClick={generateReport}>
              Generate Report
            </button>
          </form>

          <div className="load-sections">
            <form className="load-mini-form" onSubmit={saveManualLoad}>
              <h3>Add Manual Load</h3>

              <div className="form-group">
                <label>Pickup Date</label>
                <input
                  type="date"
                  value={manualLoad.pickupDate}
                  onChange={(e) =>
                    setManualLoad({
                      ...manualLoad,
                      pickupDate: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Drop-off Date</label>
                <input
                  type="date"
                  value={manualLoad.dropoffDate}
                  onChange={(e) =>
                    setManualLoad({
                      ...manualLoad,
                      dropoffDate: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Pickup</label>
                <input
                  value={manualLoad.pickup}
                  onChange={(e) =>
                    setManualLoad({ ...manualLoad, pickup: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Drop-off</label>
                <input
                  value={manualLoad.dropoff}
                  onChange={(e) =>
                    setManualLoad({ ...manualLoad, dropoff: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Miles</label>
                <input
                  type="number"
                  value={manualLoad.miles}
                  onChange={(e) =>
                    setManualLoad({ ...manualLoad, miles: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>RPM / Rate Per Mile</label>
                <input
                  type="number"
                  value={manualLoad.ratePerMile}
                  onChange={(e) =>
                    setManualLoad({
                      ...manualLoad,
                      ratePerMile: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Gross Amount</label>
                <input
                  type="number"
                  value={
                    manualLoad.grossAmount ||
                    Number(manualLoad.miles || 0) *
                      Number(manualLoad.ratePerMile || 0)
                  }
                  onChange={(e) =>
                    setManualLoad({
                      ...manualLoad,
                      grossAmount: e.target.value
                    })
                  }
                />
              </div>

              <button>Add Load</button>
            </form>

            <form className="load-mini-form" onSubmit={saveReason}>
              <h3>Add No-Load Reason</h3>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={reasonForm.reasonDate}
                  onChange={(e) =>
                    setReasonForm({
                      ...reasonForm,
                      reasonDate: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason Type</label>
                <select
                  value={reasonForm.reasonType}
                  onChange={(e) =>
                    setReasonForm({
                      ...reasonForm,
                      reasonType: e.target.value
                    })
                  }
                >
                  <option value="Team Holiday">Team Holiday</option>
                  <option value="Breakdown">Breakdown</option>
                  <option value="No Dispatch">No Dispatch</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason Note</label>
                <input
                  value={reasonForm.reasonNote}
                  onChange={(e) =>
                    setReasonForm({
                      ...reasonForm,
                      reasonNote: e.target.value
                    })
                  }
                />
              </div>

              <button>Add Reason</button>
            </form>
          </div>

          <div className="load-table">
            <h3>Fetched / Editable Loads</h3>

            <table>
              <thead>
                <tr>
                  <th>Pickup Date</th>
                  <th>Drop-off Date</th>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Miles</th>
                  <th>RPM</th>
                  <th>Gross</th>
                  <th>Source</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loads.map((load) => (
                  <tr key={load.id}>
                    <td>
                      <input
                        type="date"
                        value={
                          load.pickupDate
                            ? String(load.pickupDate).slice(0, 10)
                            : String(load.loadDate).slice(0, 10)
                        }
                        onChange={(e) =>
                          updateLocalLoad(load.id, "pickupDate", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="date"
                        value={
                          load.dropoffDate
                            ? String(load.dropoffDate).slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          updateLocalLoad(
                            load.id,
                            "dropoffDate",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={load.pickup || ""}
                        onChange={(e) =>
                          updateLocalLoad(load.id, "pickup", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={load.dropoff || ""}
                        onChange={(e) =>
                          updateLocalLoad(load.id, "dropoff", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={load.miles || 0}
                        onChange={(e) =>
                          updateLocalLoad(load.id, "miles", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={load.ratePerMile || 0}
                        onChange={(e) =>
                          updateLocalLoad(
                            load.id,
                            "ratePerMile",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={Number(load.grossAmount || load.loadAmount || 0)}
                        onChange={(e) =>
                          updateLocalLoad(
                            load.id,
                            "grossAmount",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>{load.source}</td>

                    <td>
                      <button type="button" onClick={() => saveEditedLoad(load)}>
                        Save
                      </button>
                      <button type="button" onClick={() => deleteLoad(load.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {loads.length === 0 && (
                  <tr>
                    <td colSpan="9">No loads found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h3>No-Load Reasons</h3>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {reasons.map((reason) => (
                  <tr key={reason.id}>
                    <td>{new Date(reason.reasonDate).toLocaleDateString()}</td>
                    <td>{reason.reasonType}</td>
                    <td>{reason.reasonNote || "-"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteReason(reason.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {reasons.length === 0 && (
                  <tr>
                    <td colSpan="4">No reasons added.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {report && (
            <LoadReportView report={report} onClose={() => setReport(null)} />
          )}
        </>
      )}
    </Layout>
  );
}

export default LoadReports;