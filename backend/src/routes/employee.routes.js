const express = require("express");
const router = express.Router();

const {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee
} = require("../controllers/employee.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

router.get("/", getEmployees);

router.post("/", allowRoles("ADMIN", "MANAGER", "EDITOR"), createEmployee);
router.patch("/:id", allowRoles("ADMIN", "MANAGER", "EDITOR"), updateEmployee);
router.delete("/:id", allowRoles("ADMIN"), deleteEmployee);

module.exports = router;