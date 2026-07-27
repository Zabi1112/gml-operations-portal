const express = require("express");
const router = express.Router();

const {
  getFinanceSettings,
  updateFinanceSettings,
  createPartner,
  deletePartner,
  clearInvoice,
  createManualSettlement,
  getSettlements,
  deleteSettlement
} = require("../controllers/finance.controller");

const loanController = require("../controllers/loanController");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.use(protect);

// Finance Settings — ADMIN only
router.get("/settings/:branchId", allowRoles("ADMIN"), getFinanceSettings);
router.patch("/settings/:branchId", allowRoles("ADMIN"), updateFinanceSettings);

// Partners — ADMIN only
router.post("/partners", allowRoles("ADMIN"), createPartner);
router.delete("/partners/:id", allowRoles("ADMIN"), deletePartner);

// Settlements — settle/clear/delete stay ADMIN only, list is viewable by MANAGER
router.post("/clear-invoice/:invoiceId", allowRoles("ADMIN"), clearInvoice);
router.post("/manual-settlement", allowRoles("ADMIN"), createManualSettlement);
router.get("/settlements", allowRoles("ADMIN", "MANAGER"), getSettlements);
router.delete("/settlements/:id", allowRoles("ADMIN"), deleteSettlement);

// Partner Loans — ADMIN only
router.get("/loans", allowRoles("ADMIN"), loanController.getLoans);
router.post("/loans", allowRoles("ADMIN"), loanController.createLoan);
router.delete("/loans/:id", allowRoles("ADMIN"), loanController.deleteLoan);

// Loan Repayments — ADMIN only
router.post("/loans/repayment", allowRoles("ADMIN"), loanController.addRepayment);
router.delete("/loans/repayment/:id", allowRoles("ADMIN"), loanController.deleteRepayment);

module.exports = router;