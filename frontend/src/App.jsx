import { Routes, Route, Navigate } from "react-router-dom";
import { BranchProvider } from "./context/BranchContext.jsx";
import Login from "./Pages/Login.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import UserManagement from "./Pages/UserManagement.jsx";
import Employees from "./Pages/Employees.jsx";
import Drivers from "./Pages/Drivers.jsx";
import SalarySlips from "./Pages/SalarySlips.jsx";
import History from "./Pages/History.jsx";
import Invoices from "./Pages/Invoices.jsx";
import Companies from "./Pages/Companies.jsx";
import LoadReports from "./Pages/LoadReports.jsx";
import FinanceSettings from "./Pages/FinanceSettings.jsx";
import DailyReport from "./Pages/DailyReport.jsx";
import Settlements from "./Pages/Settlements.jsx";

function App() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <BranchProvider>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />

        <Route
          path="/users"
          element={token && user?.role === "ADMIN" ? <UserManagement /> : <Navigate to="/dashboard" />}
        />

        <Route
          path="/employees"
          element={token ? <Employees /> : <Navigate to="/login" />}
        />

        <Route
          path="/drivers"
          element={token ? <Drivers /> : <Navigate to="/login" />}
        />

        <Route
          path="/salary-slips"
          element={token ? <SalarySlips /> : <Navigate to="/login" />}
        />

        <Route
          path="/history"
          element={token ? <History /> : <Navigate to="/login" />}
        />

        <Route
          path="/invoices"
          element={token ? <Invoices /> : <Navigate to="/login" />}
        />

        <Route
          path="/companies"
          element={token ? <Companies /> : <Navigate to="/login" />}
        />

        <Route
          path="/load-reports"
          element={token ? <LoadReports /> : <Navigate to="/login" />}
        />

        <Route
          path="/finance-settings"
          element={token ? <FinanceSettings /> : <Navigate to="/login" />}
        />

        <Route
          path="/daily-report"
          element={token ? <DailyReport /> : <Navigate to="/login" />}
        />

        <Route
          path="/settlements"
          element={token ? <Settlements /> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </BranchProvider>
  );
}

export default App;