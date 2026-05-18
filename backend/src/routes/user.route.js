const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  updateUserStatus,
  deleteUser
} = require("../controllers/user.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.post("/", createUser);
router.get("/", getUsers);
router.patch("/:id/status", updateUserStatus);
router.delete("/:id", deleteUser);
module.exports = router;