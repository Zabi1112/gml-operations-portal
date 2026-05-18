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

router.use(protect);

router.get("/", getEmployees);

router.post("/", allowRoles("ADMIN", "EDITOR"), createEmployee);
router.patch("/:id", allowRoles("ADMIN", "EDITOR"), updateEmployee);
router.delete("/:id", allowRoles("ADMIN"), deleteEmployee);

module.exports = router;