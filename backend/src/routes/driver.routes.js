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

router.use(protect);

router.get("/", getDrivers);

router.post("/", allowRoles("ADMIN", "EDITOR"), createDriver);
router.patch("/:id", allowRoles("ADMIN", "EDITOR"), updateDriver);
router.delete("/:id", allowRoles("ADMIN"), deleteDriver);

module.exports = router;