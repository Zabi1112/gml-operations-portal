const express = require("express");
const router = express.Router();

const {
  reopenForCorrection,getInvoiceRevisions,
  getOutstanding,
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

router.get("/outstanding", getOutstanding);
router.get("/", getInvoices);
router.post("/", allowRoles("ADMIN", "MANAGER", "EDITOR"), createInvoice);
router.post("/:id/reopen", allowRoles("ADMIN"), reopenForCorrection);
router.get("/:id/revisions", allowRoles("ADMIN"), getInvoiceRevisions);
router.put("/:id", allowRoles("ADMIN"), updateInvoice);
router.delete("/:id", allowRoles("ADMIN"), deleteInvoice);

module.exports = router;