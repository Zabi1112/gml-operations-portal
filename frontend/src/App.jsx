import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import Employees from "./pages/Employees.jsx";
import SalarySlips from "./pages/SalarySlips.jsx";
import History from "./pages/History.jsx";
import Invoices from "./pages/Invoices.jsx";
import Companies from "./pages/Companies.jsx";
import LoadReports from "./pages/LoadReports.jsx";

function App() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  return (
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

      <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

export default App;