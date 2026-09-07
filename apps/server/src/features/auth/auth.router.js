const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/authMiddleware");
const { validateSignup, validateSignin } = require("./auth.validation");
const {
    signup,
    signin,
    refreshToken,
    getProfile,
    logout,
    deleteAccount
} = require("./auth.controller");

router.post("/signup", validateSignup, signup);
router.post("/signin", validateSignin, signin);
router.post("/refresh", refreshToken);
router.get("/user", authenticateToken, getProfile);
router.post("/logout", authenticateToken, logout);
router.delete("/user", authenticateToken, deleteAccount);

module.exports = router;
