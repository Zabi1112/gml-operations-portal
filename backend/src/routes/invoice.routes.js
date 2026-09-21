const express = require("express");
const router = express.Router();

const {
  createInvoice,
  getInvoices,
  updateInvoice,
  deleteInvoice
} = require("../controllers/invoice.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

router.get("/", getInvoices);
router.post("/", allowRoles("ADMIN", "MANAGER", "EDITOR"), createInvoice);
router.put("/:id", allowRoles("ADMIN"), updateInvoice);
router.delete("/:id", allowRoles("ADMIN"), deleteInvoice);

module.exports = router;