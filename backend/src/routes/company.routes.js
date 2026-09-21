const express = require("express");
const router = express.Router();

const {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany
} = require("../controllers/company.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

router.get("/", getCompanies);
router.get("/:id", getCompany);
router.post("/", allowRoles("ADMIN", "MANAGER", "EDITOR"), createCompany);
router.patch("/:id", allowRoles("ADMIN", "MANAGER", "EDITOR"), updateCompany);
router.delete("/:id", allowRoles("ADMIN"), deleteCompany);

module.exports = router;