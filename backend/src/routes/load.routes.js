const express = require("express");
const router = express.Router();

const {
  createLoad,
  getLoads,
  updateLoad,
  deleteLoad,
  deleteLoadReason,
  createLoadReason,
  getLoadReasons
} = require("../controllers/load.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

const { branchWriteGuard } = require("../middleware/branchWriteGuard");

router.use(protect, branchWriteGuard);

router.get("/", getLoads);
router.get("/reasons", getLoadReasons);
router.post("/", allowRoles("ADMIN", "MANAGER", "EDITOR"), createLoad);
router.patch("/:id", allowRoles("ADMIN", "MANAGER", "EDITOR"), updateLoad);
router.post("/reasons", allowRoles("ADMIN", "MANAGER", "EDITOR"), createLoadReason);
router.delete("/reasons/:id", allowRoles("ADMIN", "MANAGER", "EDITOR"), deleteLoadReason);
router.delete("/:id", allowRoles("ADMIN", "MANAGER", "EDITOR"), deleteLoad);

module.exports = router;