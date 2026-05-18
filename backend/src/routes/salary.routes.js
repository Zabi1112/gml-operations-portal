const express = require("express");
const router = express.Router();

const {
  createSalarySlip,
  getSalarySlips
} = require("../controllers/salary.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", getSalarySlips);
router.post("/", allowRoles("ADMIN", "EDITOR"), createSalarySlip);

module.exports = router;