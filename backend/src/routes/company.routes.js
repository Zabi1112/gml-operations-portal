const express = require("express");
const router = express.Router();

const {
  createCompany,
  getCompanies,
  updateCompany,
  deleteCompany
} = require("../controllers/company.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", getCompanies);
router.post("/", allowRoles("ADMIN", "EDITOR"), createCompany);
router.patch("/:id", allowRoles("ADMIN", "EDITOR"), updateCompany);
router.delete("/:id", allowRoles("ADMIN"), deleteCompany);

module.exports = router;