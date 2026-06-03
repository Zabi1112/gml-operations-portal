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
router.use(allowRoles("ADMIN"));

// Finance Settings
router.get("/settings/:branchId", getFinanceSettings);
router.patch("/settings/:branchId", updateFinanceSettings);

// Partners
router.post("/partners", createPartner);
router.delete("/partners/:id", deletePartner);

// Settlements
router.post("/clear-invoice/:invoiceId", clearInvoice);
router.post("/manual-settlement", createManualSettlement);
router.get("/settlements", getSettlements);
router.delete("/settlements/:id", deleteSettlement);

// Partner Loans
router.get("/loans", loanController.getLoans);
router.post("/loans", loanController.createLoan);
router.delete("/loans/:id", loanController.deleteLoan);

// Loan Repayments
router.post("/loans/repayment", loanController.addRepayment);
router.delete("/loans/repayment/:id", loanController.deleteRepayment);

module.exports = router;