const express = require("express");
const router = express.Router();

const {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch
} = require("../controllers/branch.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", getBranches);
router.get("/:id", getBranch);
router.post("/", allowRoles("ADMIN"), createBranch);
router.patch("/:id", allowRoles("ADMIN"), updateBranch);
router.delete("/:id", allowRoles("ADMIN"), deleteBranch);

module.exports = router;
