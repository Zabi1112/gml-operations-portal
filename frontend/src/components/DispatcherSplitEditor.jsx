import "../Pages/Settlements.css";

function DispatcherSplitEditor({
  dispatchers,
  dispatcherType,
  dispatcherValue,
  onDispatcherTypeChange,
  onDispatcherValueChange,
  dispatcherAmount,
  splits,
  onSplitsChange,
  formatCurrency
}) {
  const allocatedTotal = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const remaining = dispatcherAmount - allocatedTotal;
  const overAllocated = allocatedTotal > dispatcherAmount + 1;

  const usedDispatcherIds = splits
    .map((s) => s.dispatcherId)
    .filter((id) => id !== "");

  const addRow = () => {
    onSplitsChange([...splits, { dispatcherId: "", amount: "" }]);
  };

  const updateRow = (index, key, value) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], [key]: value };
    onSplitsChange(updated);
  };

  const removeRow = (index) => {
    onSplitsChange(splits.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <input
            type="radio"
            name="dispatcherType"
            value="PERCENTAGE"
            checked={dispatcherType === "PERCENTAGE"}
            onChange={() => {
              onDispatcherTypeChange("PERCENTAGE");
              onDispatcherValueChange("");
            }}
          />
          Percentage (%)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <input
            type="radio"
            name="dispatcherType"
            value="ABSOLUTE"
            checked={dispatcherType === "ABSOLUTE"}
            onChange={() => {
              onDispatcherTypeChange("ABSOLUTE");
              onDispatcherValueChange("");
            }}
          />
          Absolute (PKR)
        </label>
      </div>

      <div className="form-group">
        <label>Dispatcher {dispatcherType === "PERCENTAGE" ? "(%)" : "(PKR)"} *</label>
        <input
          type="number"
          value={dispatcherValue}
          onChange={(e) => onDispatcherValueChange(e.target.value)}
          placeholder={
            dispatcherType === "PERCENTAGE" ? "Enter percentage" : "Enter amount given to dispatch"
          }
          step="0.01"
        />
        <div className="amount-preview">
          Calculated: {formatCurrency(dispatcherAmount)}
        </div>
      </div>

      <div style={{ marginTop: "15px" }}>
        <label style={{ fontWeight: 600, color: "#333", fontSize: "14px" }}>
          Dispatcher Splits (optional)
        </label>
        <p style={{ fontSize: "12px", color: "#777", margin: "4px 0 10px" }}>
          Assign how much of the dispatcher amount each dispatcher received.
        </p>

        {splits.map((split, index) => {
          const availableOptions = dispatchers.filter(
            (d) => d.id === Number(split.dispatcherId) || !usedDispatcherIds.includes(String(d.id))
          );
          return (
            <div
              key={index}
              style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}
            >
              <select
                value={split.dispatcherId}
                onChange={(e) => updateRow(index, "dispatcherId", e.target.value)}
                style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              >
                <option value="">Select Dispatcher</option>
                {availableOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount PKR"
                value={split.amount}
                onChange={(e) => updateRow(index, "amount", e.target.value)}
                style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              />
              <button type="button" className="btn-secondary" onClick={() => removeRow(index)}>
                Remove
              </button>
            </div>
          );
        })}

        <button
          type="button"
          className="btn-secondary"
          onClick={addRow}
          disabled={dispatchers.length === 0 || splits.length >= dispatchers.length}
        >
          + Add Dispatcher
        </button>

        {dispatchers.length === 0 && (
          <p style={{ fontSize: "12px", color: "#999", marginTop: "6px" }}>
            No dispatchers set up yet. Add them in Finance Settings.
          </p>
        )}

        {splits.length > 0 && (
          <div style={{ marginTop: "10px", fontSize: "13px", color: overAllocated ? "#dc2626" : "#555" }}>
            Allocated: {formatCurrency(allocatedTotal)} / Available: {formatCurrency(dispatcherAmount)}
            {overAllocated && (
              <strong> — exceeds the total dispatcher amount!</strong>
            )}
            {!overAllocated && remaining > 1 && (
              <span> ({formatCurrency(remaining)} unassigned)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DispatcherSplitEditor;
