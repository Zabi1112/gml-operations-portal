import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import InvoiceView from "../components/InvoiceView.jsx";
import "./Invoices.css";

function Invoices() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";

  const emptyForm = {
    companyId: "",
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

    selectedTruckIds: [],
    selectedDriverIds: [],
    truckNumbers: "",
    driverNames: "",

    invoiceNumber: "",
    invoiceStart: "",
    invoiceEnd: "",
    dueDate: "",

    accountNumber: "",
    accountTitle: "",

    accountsFeeWeeks: 0,
    accountsFeeRate: 0,

    discountAmount: 0,
    referralBonus: 0,
    fineAmount: 0,
    fineReason: "",

    previousInvoiceAmount: 0,
    includePreviousInvoiceInNet: false,

    notes: "",

    loads: [
      {
        date: "",
        pickup: "",
        dropoff: "",
        loadAmount: 0
      }
    ]
  };

  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const loadCompanies = async () => {
    const res = await axios.get(`${API}/companies`, auth);
    setCompanies(res.data);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const selectedCompany = companies.find(
    (c) => c.id === Number(form.companyId)
  );

  const companyTrucks = selectedCompany?.trucks || [];
  const companyDrivers = selectedCompany?.drivers || [];

  const handleCompanySelect = (id) => {
    const company = companies.find((c) => c.id === Number(id));

    if (!company) {
      setForm(emptyForm);
      return;
    }

    setForm((prev) => ({
      ...prev,
      companyId: company.id,
      companyName: company.companyName || "",
      ownerName: company.ownerName || "",
      mcNumber: company.mcNumber || "",
      dotNumber: company.dotNumber || "",
      address: company.address || "",
      contactNumber: company.contactNumber || "",
      email: company.email || "",
      billingType: company.billingType || "PERCENTAGE",
      dispatchPercent: Number(company.dispatchPercent || 0),
      fixedMonthlyRate: Number(company.fixedMonthlyRate || 0),
      accountNumber: company.accountNumber || "",
      accountTitle: company.accountTitle || "",
      selectedTruckIds: [],
      selectedDriverIds: [],
      truckNumbers: "",
      driverNames: ""
    }));
  };

  const toggleTruck = (truck) => {
    const exists = form.selectedTruckIds.includes(truck.id);

    const selectedTruckIds = exists
      ? form.selectedTruckIds.filter((id) => id !== truck.id)
      : [...form.selectedTruckIds, truck.id];

    const selectedTrucks = companyTrucks.filter((t) =>
      selectedTruckIds.includes(t.id)
    );

    setForm({
      ...form,
      selectedTruckIds,
      truckNumbers: selectedTrucks.map((t) => t.truckNumber).join(", ")
    });
  };

  const toggleDriver = (driver) => {
    const exists = form.selectedDriverIds.includes(driver.id);

    const selectedDriverIds = exists
      ? form.selectedDriverIds.filter((id) => id !== driver.id)
      : [...form.selectedDriverIds, driver.id];

    const selectedDrivers = companyDrivers.filter((d) =>
      selectedDriverIds.includes(d.id)
    );

    setForm({
      ...form,
      selectedDriverIds,
      driverNames: selectedDrivers.map((d) => d.name).join(", ")
    });
  };

  const updateLoad = (index, key, value) => {
    const updated = [...form.loads];
    updated[index][key] = value;
    setForm({ ...form, loads: updated });
  };

  const addLoad = () => {
    setForm({
      ...form,
      loads: [
        ...form.loads,
        {
          date: "",
          pickup: "",
          dropoff: "",
          loadAmount: 0
        }
      ]
    });
  };

  const removeLoad = (index) => {
    const updated = form.loads.filter((_, i) => i !== index);
    setForm({ ...form, loads: updated.length ? updated : emptyForm.loads });
  };

  const validLoads = form.loads.filter(
    (load) =>
      load.date &&
      load.pickup &&
      load.dropoff &&
      Number(load.loadAmount || 0) > 0
  );

  const totalLoadsCount = validLoads.length;

  const totalLoadAmount = validLoads.reduce(
    (sum, load) => sum + Number(load.loadAmount || 0),
    0
  );

  const fixedBillingAmount =
    form.billingType === "FIXED"
      ? Number(form.fixedMonthlyRate || 0) * form.selectedTruckIds.length
      : 0;

  const totalDispatchAmount =
    form.billingType === "PERCENTAGE"
      ? (totalLoadAmount * Number(form.dispatchPercent || 0)) / 100
      : fixedBillingAmount;

  const accountsFeeTotal =
    Number(form.accountsFeeWeeks || 0) * Number(form.accountsFeeRate || 0);

  const grossAmount = totalDispatchAmount + accountsFeeTotal;

  const netPayable =
    grossAmount +
    (form.includePreviousInvoiceInNet
      ? Number(form.previousInvoiceAmount || 0)
      : 0) -
    Number(form.discountAmount || 0) -
    Number(form.referralBonus || 0) -
    Number(form.fineAmount || 0);

  const preview = (e) => {
    e.preventDefault();

    if (form.selectedTruckIds.length === 0) {
      alert("Please select at least one truck.");
      return;
    }

    if (form.billingType === "PERCENTAGE" && validLoads.length === 0) {
      alert("Please add at least one valid load.");
      return;
    }

    const invoice = {
      ...form,
      companyId: Number(form.companyId),
      selectedTruckCount: form.selectedTruckIds.length,

      dispatchPercent: Number(form.dispatchPercent || 0),
      fixedMonthlyRate: Number(form.fixedMonthlyRate || 0),

      accountsFeeWeeks: Number(form.accountsFeeWeeks || 0),
      accountsFeeRate: Number(form.accountsFeeRate || 0),
      accountsFeeTotal,

      totalLoadsCount,
      totalLoadAmount,
      totalDispatchAmount,
      fixedBillingAmount,
      grossAmount,

      discountAmount: Number(form.discountAmount || 0),
      referralBonus: Number(form.referralBonus || 0),
      fineAmount: Number(form.fineAmount || 0),
      previousInvoiceAmount: Number(form.previousInvoiceAmount || 0),
      netPayable,

      loads:
        form.billingType === "PERCENTAGE"
          ? validLoads.map((load) => ({
              ...load,
              loadAmount: Number(load.loadAmount || 0),
              dispatchPercent: Number(form.dispatchPercent || 0),
              dispatchAmount:
                (Number(load.loadAmount || 0) *
                  Number(form.dispatchPercent || 0)) /
                100
            }))
          : []
    };

    setPreviewInvoice(invoice);
  };

  const resetAfterSave = () => {
    setPreviewInvoice(null);
    setForm(emptyForm);
  };

  return (
    <Layout title="Invoice Generator">
      {canEdit && (
        <form className="invoice-form" onSubmit={preview}>
          <div className="form-group">
            <label>Select Company</label>
            <select
              value={form.companyId}
              onChange={(e) => handleCompanySelect(e.target.value)}
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
            <label>Company Name</label>
            <input value={form.companyName} readOnly />
          </div>

          <div className="form-group">
            <label>Owner Name</label>
            <input value={form.ownerName} readOnly />
          </div>

          <div className="form-group">
            <label>MC Number</label>
            <input value={form.mcNumber} readOnly />
          </div>

          <div className="form-group">
            <label>DOT Number</label>
            <input value={form.dotNumber} readOnly />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input value={form.contactNumber} readOnly />
          </div>

          <div className="form-group">
            <label>Billing Type</label>
            <input value={form.billingType} readOnly />
          </div>

          {form.billingType === "PERCENTAGE" && (
            <div className="form-group">
              <label>Dispatch Percentage %</label>
              <input value={form.dispatchPercent} readOnly />
            </div>
          )}

          {form.billingType === "FIXED" && (
            <div className="form-group">
              <label>Fixed Monthly Rate / Truck $</label>
              <input value={form.fixedMonthlyRate} readOnly />
            </div>
          )}

          <div className="form-group">
            <label>Invoice Number</label>
            <input
              value={form.invoiceNumber}
              onChange={(e) =>
                setForm({ ...form, invoiceNumber: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Invoice Start</label>
            <input
              type="date"
              value={form.invoiceStart}
              onChange={(e) =>
                setForm({ ...form, invoiceStart: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Invoice End</label>
            <input
              type="date"
              value={form.invoiceEnd}
              onChange={(e) =>
                setForm({ ...form, invoiceEnd: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Account Number</label>
            <input
              value={form.accountNumber}
              onChange={(e) =>
                setForm({ ...form, accountNumber: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Account Title</label>
            <input
              value={form.accountTitle}
              onChange={(e) =>
                setForm({ ...form, accountTitle: e.target.value })
              }
            />
          </div>

          <div className="invoice-loads">
            <h3>Select Trucks</h3>
            <div className="check-grid">
              {companyTrucks.map((truck) => (
                <label key={truck.id}>
                  <input
                    type="checkbox"
                    checked={form.selectedTruckIds.includes(truck.id)}
                    onChange={() => toggleTruck(truck)}
                  />
                  {truck.truckNumber}
                  {truck.trailerNumber ? ` / ${truck.trailerNumber}` : ""}
                </label>
              ))}
            </div>

            {companyTrucks.length === 0 && <p>No trucks found for company.</p>}
          </div>

          <div className="invoice-loads">
            <h3>Select Drivers</h3>
            <div className="check-grid">
              {companyDrivers.map((driver) => (
                <label key={driver.id}>
                  <input
                    type="checkbox"
                    checked={form.selectedDriverIds.includes(driver.id)}
                    onChange={() => toggleDriver(driver)}
                  />
                  {driver.name}{" "}
                  {driver.truck?.truckNumber
                    ? `(${driver.truck.truckNumber})`
                    : ""}
                </label>
              ))}
            </div>

            {companyDrivers.length === 0 && <p>No drivers found for company.</p>}
          </div>

          {form.billingType === "PERCENTAGE" && (
            <div className="invoice-loads">
              <h3>Loads</h3>

              {form.loads.map((load, index) => (
                <div className="load-row" key={index}>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={load.date}
                      onChange={(e) =>
                        updateLoad(index, "date", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Pickup</label>
                    <input
                      value={load.pickup}
                      onChange={(e) =>
                        updateLoad(index, "pickup", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Drop-off</label>
                    <input
                      value={load.dropoff}
                      onChange={(e) =>
                        updateLoad(index, "dropoff", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Load Amount $</label>
                    <input
                      type="number"
                      value={load.loadAmount}
                      onChange={(e) =>
                        updateLoad(index, "loadAmount", e.target.value)
                      }
                      required
                    />
                  </div>

                  <button type="button" onClick={() => removeLoad(index)}>
                    Remove
                  </button>
                </div>
              ))}

              <button type="button" onClick={addLoad}>
                Add Load
              </button>
            </div>
          )}

          <div className="form-group">
            <label>Accounts Fee Weeks</label>
            <input
              type="number"
              value={form.accountsFeeWeeks}
              onChange={(e) =>
                setForm({ ...form, accountsFeeWeeks: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Accounts Fee Rate / Week $</label>
            <input
              type="number"
              value={form.accountsFeeRate}
              onChange={(e) =>
                setForm({ ...form, accountsFeeRate: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Discount $</label>
            <input
              type="number"
              value={form.discountAmount}
              onChange={(e) =>
                setForm({ ...form, discountAmount: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Referral Bonus $</label>
            <input
              type="number"
              value={form.referralBonus}
              onChange={(e) =>
                setForm({ ...form, referralBonus: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Fine $</label>
            <input
              type="number"
              value={form.fineAmount}
              onChange={(e) =>
                setForm({ ...form, fineAmount: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Fine Reason</label>
            <input
              value={form.fineReason}
              onChange={(e) =>
                setForm({ ...form, fineReason: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Previous Invoice Amount $</label>
            <input
              type="number"
              value={form.previousInvoiceAmount}
              onChange={(e) =>
                setForm({ ...form, previousInvoiceAmount: e.target.value })
              }
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={form.includePreviousInvoiceInNet}
                onChange={(e) =>
                  setForm({
                    ...form,
                    includePreviousInvoiceInNet: e.target.checked
                  })
                }
              />
              Add Previous Invoice To Net
            </label>
          </div>

          <div className="invoice-preview-box">
            <strong>Selected Trucks:</strong> {form.truckNumbers || "-"}
            <br />
            <strong>Selected Drivers:</strong> {form.driverNames || "-"}
            <br />

            {form.billingType === "PERCENTAGE" && (
              <>
                <strong>Total Loads:</strong> {totalLoadsCount}
                <br />
                <strong>Total Load Amount:</strong> ${totalLoadAmount.toFixed(2)}
                <br />
                <strong>Total Dispatch:</strong> ${totalDispatchAmount.toFixed(2)}
                <br />
              </>
            )}

            {form.billingType === "FIXED" && (
              <>
                <strong>Fixed Monthly Rate:</strong> $
                {Number(form.fixedMonthlyRate || 0).toFixed(2)}
                <br />
                <strong>Selected Trucks Count:</strong>{" "}
                {form.selectedTruckIds.length}
                <br />
                <strong>Fixed Billing:</strong> $
                {fixedBillingAmount.toFixed(2)}
                <br />
              </>
            )}

            <strong>Accounts Fee:</strong> ${accountsFeeTotal.toFixed(2)}
            <br />
            <strong>Net Payable:</strong> ${netPayable.toFixed(2)}
          </div>

          <button type="submit">Preview Invoice</button>
        </form>
      )}

      {previewInvoice && (
        <InvoiceView
          invoice={previewInvoice}
          isPreview={true}
          onClose={() => setPreviewInvoice(null)}
          onSaved={resetAfterSave}
        />
      )}
    </Layout>
  );
}

export default Invoices;