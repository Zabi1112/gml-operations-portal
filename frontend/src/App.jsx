import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import Employees from "./pages/Employees";
import SalarySlips from "./pages/SalarySlips";
import History from "./pages/History";
import Invoices from "./pages/Invoices";
import Companies from "./pages/Companies";
import LoadReports from "./pages/LoadReports";

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