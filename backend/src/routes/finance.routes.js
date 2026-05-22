const express = require("express");
const router = express.Router();

const {
  getFinanceSettings,
  updateFinanceSettings,
  createPartner,
  deletePartner,
  clearInvoice,
  createManualSettlement,
  getSettlements
} = require("../controllers/finance.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.get("/settings/:branchId", getFinanceSettings);
router.patch("/settings/:branchId", updateFinanceSettings);

router.post("/partners", createPartner);
router.delete("/partners/:id", deletePartner);

router.post("/clear-invoice/:invoiceId", clearInvoice);
router.post("/manual-settlement", createManualSettlement);
router.get("/settlements", getSettlements);

module.exports = router;