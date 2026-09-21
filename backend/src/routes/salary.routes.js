const express = require("express");
const router = express.Router();

const {
  createSalarySlip,
  getSalarySlips,
  deleteSalarySlip
} = require("../controllers/salary.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

router.get("/", allowRoles("ADMIN", "EDITOR"), getSalarySlips);
router.post("/", allowRoles("ADMIN", "EDITOR"), createSalarySlip);
router.delete("/:id", allowRoles("ADMIN"), deleteSalarySlip);

module.exports = router;