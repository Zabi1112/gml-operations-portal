const express = require("express");
const router = express.Router();

const {
  createDriver,
  getDrivers,
  updateDriver,
  deleteDriver
} = require("../controllers/driver.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

router.get("/", getDrivers);

router.post("/", allowRoles("ADMIN", "MANAGER", "EDITOR"), createDriver);
router.patch("/:id", allowRoles("ADMIN", "MANAGER", "EDITOR"), updateDriver);
router.delete("/:id", allowRoles("ADMIN"), deleteDriver);

module.exports = router;