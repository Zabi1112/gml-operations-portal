const express = require("express");
const router = express.Router();

const {
  createTruck,
  getTrucks,
  updateTruck,
  deleteTruck
} = require("../controllers/truck.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

router.get("/", getTrucks);
router.post("/", allowRoles("ADMIN", "MANAGER", "EDITOR"), createTruck);
router.patch("/:id", allowRoles("ADMIN", "MANAGER", "EDITOR"), updateTruck);
router.delete("/:id", allowRoles("ADMIN"), deleteTruck);

module.exports = router;