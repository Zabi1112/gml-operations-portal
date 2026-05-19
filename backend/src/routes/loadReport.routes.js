const express = require("express");
const router = express.Router();

const {
  createLoadReport,
  getLoadReports
} = require("../controllers/loadReport.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", getLoadReports);
router.post("/", allowRoles("ADMIN", "EDITOR"), createLoadReport);

module.exports = router;