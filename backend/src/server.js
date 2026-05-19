const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutesModule = require("./routes/auth.routes");
const authRoutes = authRoutesModule.default || authRoutesModule.router || authRoutesModule;
const userRoutes = require("./routes/user.route");
const employeeRoutes = require("./routes/employee.routes");
const driverRoutes = require("./routes/driver.routes");
const salaryRoutes = require("./routes/salary.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const companyRoutes = require("./routes/company.routes");
const truckRoutes = require("./routes/truck.routes");
const loadRoutes = require("./routes/load.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "GML Portal Backend Running" });
});

console.log("ROUTES CHECK", {
  authRoutes: typeof authRoutes,
  userRoutes: typeof userRoutes,
  employeeRoutes: typeof employeeRoutes,
  driverRoutes: typeof driverRoutes,
  salaryRoutes: typeof salaryRoutes,
  invoiceRoutes: typeof invoiceRoutes,
  companyRoutes: typeof companyRoutes,
  truckRoutes: typeof truckRoutes,
  loadRoutes: typeof loadRoutes
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/salary-slips", salaryRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/loads", loadRoutes);
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