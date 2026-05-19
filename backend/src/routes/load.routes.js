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

router.use(protect);

router.get("/", getLoads);
router.get("/reasons", getLoadReasons);
router.post("/", allowRoles("ADMIN", "EDITOR"), createLoad);
router.patch("/:id", allowRoles("ADMIN", "EDITOR"), updateLoad);
router.post("/reasons", allowRoles("ADMIN", "EDITOR"), createLoadReason);
router.delete("/reasons/:id", allowRoles("ADMIN", "EDITOR"), deleteLoadReason);
router.delete("/:id", allowRoles("ADMIN", "EDITOR"), deleteLoad);

module.exports = router;