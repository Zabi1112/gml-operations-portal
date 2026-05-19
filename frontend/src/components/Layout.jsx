import { useContext } from "react";
import { BranchContext } from "../context/BranchContext.jsx";
import "../Pages/Dashboard.css";

function Layout({ title, children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const { selectedBranch } = useContext(BranchContext);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedBranch");
    localStorage.removeItem("branchId");
    window.location.href = "/login";
  };

  const go = (path) => {
    window.location.href = path;
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <img src="/logo.jpeg" className="sidebar-logo" />

        <button onClick={() => go("/dashboard")}>Dashboard</button>
        <button onClick={() => go("/salary-slips")}>Salary Slips</button>
        <button onClick={() => go("/load-reports")}>Load Reports</button>
        <button onClick={() => go("/invoices")}>Invoices</button>
        <button>Attendance</button>
        <button onClick={() => go("/employees")}>Staff</button>
        <button onClick={() => go("/companies")}>Companies</button>

        {user?.role === "ADMIN" && (
          <button onClick={() => go("/users")}>User Management</button>
        )}

        <button onClick={() => go("/history")}>History</button>
      </aside>

      <main className="content">
        <div className="topbar">
          <div>
            <h2>{title}</h2>
            <p>
              Welcome, {user?.name} — {user?.role}
              {selectedBranch && (
                <>
                  {" "} | Branch: <strong>{selectedBranch.branchName}</strong>
                </>
              )}
            </p>
          </div>

          <button className="logout" onClick={logout}>Logout</button>
        </div>

        {!selectedBranch && title !== "Dashboard" ? (
          <div className="warning-message">
            Please select a branch from Dashboard first.
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export default Layout;