const express = require("express");
const router = express.Router();

const {
  createInvoice,
  getInvoices
} = require("../controllers/invoice.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", getInvoices);
router.post("/", allowRoles("ADMIN", "EDITOR"), createInvoice);

module.exports = router;