const express = require("express");
const router = express.Router();

const {
  getFinanceSettings,
  updateFinanceSettings,
  createPartner,
  deletePartner,
  createDispatcher,
  deleteDispatcher,
  clearInvoice,
  createManualSettlement,
  getSettlements,
  updateSettlement,
  deleteSettlement
} = require("../controllers/finance.controller");

const loanController = require("../controllers/loanController");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

// Finance Settings — ADMIN only
router.get("/settings/:branchId", allowRoles("ADMIN"), getFinanceSettings);
router.patch("/settings/:branchId", allowRoles("ADMIN"), updateFinanceSettings);

// Partners — ADMIN only
router.post("/partners", allowRoles("ADMIN"), createPartner);
router.delete("/partners/:id", allowRoles("ADMIN"), deletePartner);

// Dispatchers — ADMIN only
router.post("/dispatchers", allowRoles("ADMIN"), createDispatcher);
router.delete("/dispatchers/:id", allowRoles("ADMIN"), deleteDispatcher);

// Settlements — settle/clear/edit/delete stay ADMIN only, list is viewable by MANAGER
router.post("/clear-invoice/:invoiceId", allowRoles("ADMIN"), clearInvoice);
router.post("/manual-settlement", allowRoles("ADMIN"), createManualSettlement);
router.get("/settlements", allowRoles("ADMIN", "MANAGER"), getSettlements);
router.patch("/settlements/:id", allowRoles("ADMIN"), updateSettlement);
router.delete("/settlements/:id", allowRoles("ADMIN"), deleteSettlement);

// Partner Loans — ADMIN only
router.get("/loans", allowRoles("ADMIN"), loanController.getLoans);
router.post("/loans", allowRoles("ADMIN"), loanController.createLoan);
router.patch("/loans/:id", allowRoles("ADMIN"), loanController.updateLoan);
router.delete("/loans/:id", allowRoles("ADMIN"), loanController.deleteLoan);

// Loan Repayments — ADMIN only
router.post("/loans/repayment", allowRoles("ADMIN"), loanController.addRepayment);
router.patch("/loans/repayment/:id", allowRoles("ADMIN"), loanController.updateRepayment);
router.delete("/loans/repayment/:id", allowRoles("ADMIN"), loanController.deleteRepayment);

module.exports = router;