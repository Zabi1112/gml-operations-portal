import "./LoadReportView.css";

function LoadReportView({ report, onClose }) {
  const printReport = () => window.print();

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  };

  const dateOnly = (value) => String(value || "").slice(0, 10);

  const getInclusiveDays = (from, to) => {
    const start = new Date(from);
    const end = new Date(to);
    const diff = end - start;
    if (Number.isNaN(diff)) return 0;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getReasonClass = (type) => {
    if (type === "Team Holiday") return "badge-holiday";
    if (type === "Breakdown") return "badge-breakdown";
    if (type === "No Dispatch") return "badge-nodispatch";
    return "badge-custom";
  };

  const loads = report.loads || [];
  const reasons = report.reasons || [];

  const totalReportDays = getInclusiveDays(report.from, report.to);

  const reasonDateSet = new Set(
    reasons.map((r) => dateOnly(r.reasonDate)).filter(Boolean)
  );

  const reasonDays = reasonDateSet.size;
  const daysWorked = Math.max(totalReportDays - reasonDays, 0);

  const totalGross = loads.reduce(
    (sum, l) => sum + Number(l.grossAmount || l.loadAmount || 0),
    0
  );

  const totalMiles = loads.reduce((sum, l) => sum + Number(l.miles || 0), 0);
  const avgRatePerMile = totalMiles > 0 ? totalGross / totalMiles : 0;
  const perDayGross = daysWorked > 0 ? totalGross / daysWorked : 0;
  const expectedGross = perDayGross * reasonDays;

  const sortedLoads = [...loads].sort(
    (a, b) =>
      new Date(a.pickupDate || a.loadDate) -
      new Date(b.pickupDate || b.loadDate)
  );

  const sortedReasons = [...reasons].sort(
    (a, b) => new Date(a.reasonDate) - new Date(b.reasonDate)
  );

  return (
    <div className="report-modal">
      <div className="report-actions no-print">
        <button onClick={onClose}>Close</button>
        <button onClick={printReport}>Print / Save PDF</button>
      </div>

      <div className="dlr-report-print">
        <div className="dlr-header">
          <img src="/logo.jpeg" alt="GML Logo" />

          <div>
            <h1>{report.title}</h1>
            <p>Get Moving Logistics</p>
          </div>

          <div className="dlr-meta">
            <span>Period</span>
            <strong>
              {formatDate(report.from)} - {formatDate(report.to)}
            </strong>
          </div>
        </div>

        <div className="dlr-info">
          <div><span>Company</span><strong>{report.companyName}</strong></div>
          <div><span>Owner</span><strong>{report.ownerName || "-"}</strong></div>
          <div><span>MC</span><strong>{report.mcNumber || "-"}</strong></div>
          <div><span>DOT</span><strong>{report.dotNumber || "-"}</strong></div>
          <div><span>Truck</span><strong>{report.truckNumber}</strong></div>
          <div><span>Trailer</span><strong>{report.trailerNumber || "-"}</strong></div>
        </div>

        <div className="dlr-grid">
          <div className="dlr-grid-head">
            <div>Pickup Date</div>
            <div>Drop-off Date</div>
            <div>Pickup</div>
            <div>Drop-off</div>
            <div>Miles</div>
            <div>RPM</div>
            <div>Booking</div>
          </div>

          {sortedLoads.map((load) => {
            const gross = Number(load.grossAmount || load.loadAmount || 0);
            const miles = Number(load.miles || 0);
            const rpm =
              Number(load.ratePerMile || 0) || (miles > 0 ? gross / miles : 0);

            return (
              <div className="dlr-grid-row" key={`load-${load.id}`}>
                <div>{formatDate(load.pickupDate || load.loadDate)}</div>
                <div>{formatDate(load.dropoffDate)}</div>
                <div>{load.pickup || "-"}</div>
                <div>{load.dropoff || "-"}</div>
                <div className="num">{miles.toFixed(0)}</div>
                <div className="num">${rpm.toFixed(2)}</div>
                <div className="num">${gross.toFixed(2)}</div>
              </div>
            );
          })}

          {sortedReasons.map((reason) => (
            <div className="dlr-grid-row reason-row" key={`reason-${reason.id}`}>
              <div>{formatDate(reason.reasonDate)}</div>
              <div>-</div>
              <div className="reason-text">
                <span className={`badge-reason ${getReasonClass(reason.reasonType)}`}>
                  {reason.reasonType}
                </span>
              </div>
              <div className="reason-note">
                {reason.reasonNote || "No load added for this date."}
              </div>
              <div className="num">0</div>
              <div className="num">$0.00</div>
              <div className="num">$0.00</div>
            </div>
          ))}

          <div className="dlr-grid-row total-row">
            <div className="total-label">Totals</div>
            <div></div>
            <div></div>
            <div></div>
            <div className="num">{totalMiles.toFixed(0)}</div>
            <div className="num">${avgRatePerMile.toFixed(2)}</div>
            <div className="num gold">${totalGross.toFixed(2)}</div>
          </div>
        </div>

        <div className="dlr-summary">
          <div className="sum-card accent">
            <span>Total Company Gross</span>
            <strong>${totalGross.toFixed(2)}</strong>
            <small>All load bookings</small>
          </div>

          <div className="sum-card green">
            <span>Avg Rate / Mile</span>
            <strong>${avgRatePerMile.toFixed(2)}</strong>
            <small>Gross ÷ total miles</small>
          </div>

          <div className="sum-card gold">
            <span>Total Days</span>
            <strong>{totalReportDays}</strong>
            <small>Selected report period</small>
          </div>

          <div className="sum-card">
            <span>Days Worked</span>
            <strong>{daysWorked}</strong>
            <small>Total days - reason days</small>
          </div>

          <div className="sum-card">
            <span>Reason Days</span>
            <strong>{reasonDays}</strong>
            <small>No-load days with reason</small>
          </div>

          <div className="sum-card accent">
            <span>Per Day Gross</span>
            <strong>${perDayGross.toFixed(2)}</strong>
            <small>Total gross ÷ worked days</small>
          </div>

          <div className="sum-card green">
            <span>Expected Gross</span>
            <strong>${expectedGross.toFixed(2)}</strong>
            <small>Reason days × per day gross</small>
          </div>

          <div className="sum-card gold">
            <span>Loads</span>
            <strong>{loads.length}</strong>
            <small>Load entries</small>
          </div>
        </div>

        <div className="dlr-footer">
          <span>Generated by GML Portal</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default LoadReportView;