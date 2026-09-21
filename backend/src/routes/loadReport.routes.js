const express = require("express");
const router = express.Router();

const {
  createLoadReport,
  getLoadReports,
  deleteLoadReport
} = require("../controllers/loadReport.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

router.get("/", getLoadReports);
router.post("/", allowRoles("ADMIN", "MANAGER", "EDITOR"), createLoadReport);
router.delete("/:id", allowRoles("ADMIN"), deleteLoadReport);

module.exports = router;