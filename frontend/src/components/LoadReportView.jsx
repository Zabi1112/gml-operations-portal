import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { API } from "../api";
import "./LoadReportView.css";

function LoadReportView({ report, onClose }) {
  const token = localStorage.getItem("token");

  const auth = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const printReport = async () => {
    const element = document.querySelector(".dlr-report-print");
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0
    });

    const imgData = canvas.toDataURL("image/png");

    const pdfWidth = 297; // landscape
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: "l",
      unit: "mm",
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`load-report-${report.companyName || "report"}.pdf`);
  };

  const saveToHistory = async () => {
    try {
      await axios.post(`${API}/load-reports`, report, auth);
      alert("Load report saved in history");
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to save load report");
    }
  };

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

  const mergedRows = [
    ...loads.map((l) => ({
      ...l,
      _type: "load",
      _sortDate: new Date(l.pickupDate || l.loadDate)
    })),
    ...reasons.map((r) => ({
      ...r,
      _type: "reason",
      _sortDate: new Date(r.reasonDate)
    }))
  ].sort((a, b) => a._sortDate - b._sortDate);

  return (
    <div className="report-modal">
      <div className="report-actions no-print">
        <button onClick={onClose}>Close</button>
        <button onClick={saveToHistory}>Save to History</button>
        <button onClick={printReport}>Download PDF</button>
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
          <div>
            <span>Company</span>
            <strong>{report.companyName}</strong>
          </div>
          <div>
            <span>Owner</span>
            <strong>{report.ownerName || "-"}</strong>
          </div>
          <div>
            <span>MC</span>
            <strong>{report.mcNumber || "-"}</strong>
          </div>
          <div>
            <span>DOT</span>
            <strong>{report.dotNumber || "-"}</strong>
          </div>
          <div>
            <span>Truck</span>
            <strong>{report.truckNumber}</strong>
          </div>
          <div>
            <span>Trailer</span>
            <strong>{report.trailerNumber || "-"}</strong>
          </div>
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

          {mergedRows.map((row) => {
            if (row._type === "reason") {
              return (
                <div className="dlr-grid-row reason-row" key={`reason-${row.id}`}>
                  <div>{formatDate(row.reasonDate)}</div>
                  <div>-</div>
                  <div className="reason-text">
                    <span className={`badge-reason ${getReasonClass(row.reasonType)}`}>
                      {row.reasonType}
                    </span>
                  </div>
                  <div className="reason-note">
                    {row.reasonNote || "No load added for this date."}
                  </div>
                  <div className="num">0</div>
                  <div className="num">$0.00</div>
                  <div className="num">$0.00</div>
                </div>
              );
            }

            const gross = Number(row.grossAmount || row.loadAmount || 0);
            const miles = Number(row.miles || 0);
            const rpm =
              Number(row.ratePerMile || 0) || (miles > 0 ? gross / miles : 0);

            return (
              <div className="dlr-grid-row" key={`load-${row.id}`}>
                <div>{formatDate(row.pickupDate || row.loadDate)}</div>
                <div>{formatDate(row.dropoffDate)}</div>
                <div>{row.pickup || "-"}</div>
                <div>{row.dropoff || "-"}</div>
                <div className="num">{miles.toFixed(0)}</div>
                <div className="num">${rpm.toFixed(2)}</div>
                <div className="num">${gross.toFixed(2)}</div>
              </div>
            );
          })}

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