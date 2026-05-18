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

router.use(protect);

router.get("/", getTrucks);
router.post("/", allowRoles("ADMIN", "EDITOR"), createTruck);
router.patch("/:id", allowRoles("ADMIN", "EDITOR"), updateTruck);
router.delete("/:id", allowRoles("ADMIN"), deleteTruck);

module.exports = router;