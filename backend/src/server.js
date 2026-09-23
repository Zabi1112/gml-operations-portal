const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.route");
const employeeRoutes = require("./routes/employee.routes");
const driverRoutes = require("./routes/driver.routes");
const salaryRoutes = require("./routes/salary.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const companyRoutes = require("./routes/company.routes");
const branchRoutes = require("./routes/branch.routes");
const truckRoutes = require("./routes/truck.routes");
const loadRoutes = require("./routes/load.routes");
const loadReportRoutes = require("./routes/loadReport.routes");
const financeRoutes = require("./routes/finance.routes");

const contractRoutes = require("./routes/contract.routes");

const payStatementRoutes = require("./routes/payStatement.routes");

const app = express();

app.use(cors());
app.use(["/pay-statements", "/api/pay-statements"], express.json({ limit: "256kb" }));
app.use(express.json());

app.get(["/", "/api"], (req, res) => {
  res.json({ message: "EAST WEST LOGISTICS LLC Portal Backend Running" });
});

console.log("ROUTES CHECK", {
  authRoutes: typeof authRoutes,
  userRoutes: typeof userRoutes,
  employeeRoutes: typeof employeeRoutes,
  driverRoutes: typeof driverRoutes,
  salaryRoutes: typeof salaryRoutes,
  invoiceRoutes: typeof invoiceRoutes,
  companyRoutes: typeof companyRoutes,
  branchRoutes: typeof branchRoutes,
  truckRoutes: typeof truckRoutes,
  loadRoutes: typeof loadRoutes,
  loadReportRoutes: typeof loadReportRoutes,
  financeRoutes: typeof financeRoutes
});

const registerRoutes = (prefix = "") => {
  app.use(`${prefix}/pay-statements`, payStatementRoutes);
  app.use(`${prefix}/contracts`, contractRoutes);
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/employees`, employeeRoutes);
  app.use(`${prefix}/drivers`, driverRoutes);
  app.use(`${prefix}/salary-slips`, salaryRoutes);
  app.use(`${prefix}/invoices`, invoiceRoutes);
  app.use(`${prefix}/branches`, branchRoutes);
  app.use(`${prefix}/companies`, companyRoutes);
  app.use(`${prefix}/trucks`, truckRoutes);
  app.use(`${prefix}/load-reports`, loadReportRoutes);
  app.use(`${prefix}/loads`, loadRoutes);
  app.use(`${prefix}/finance`, financeRoutes);
};

registerRoutes("");      // production Vercel
registerRoutes("/api");  // local frontend
const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;