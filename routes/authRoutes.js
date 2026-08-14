const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const {
    signup,
    signin,
    getProfile,
    logout,
    deleteAccount
} = require("../controllers/authController");

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/user", authenticateToken, getProfile);
router.post("/logout", authenticateToken, logout);
router.delete("/user", authenticateToken, deleteAccount);

module.exports = router;
