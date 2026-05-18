const express = require("express");
const router = express.Router();

const {
  register,
  login
} = require("../controllers/auth.controller");

const {
  protect,
  allowRoles
} = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, (req, res) => {
  res.json({
    message: "Current user fetched",
    user: req.user
  });
});

router.get("/admin-test", protect, allowRoles("ADMIN"), (req, res) => {
  res.json({
    message: "Admin access working"
  });
});

module.exports = router;