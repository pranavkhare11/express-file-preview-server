const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middlewares/authMiddleware");
const {
    adminSignin,
    getStats,
    getSessions,
    revokeSession,
    purgeSystem,
    handleSseEvents
} = require("../controllers/adminController");

router.post("/signin", adminSignin);
router.get("/stats", authenticateToken, requireAdmin, getStats);
router.get("/sessions", authenticateToken, requireAdmin, getSessions);
router.post("/sessions/revoke", authenticateToken, requireAdmin, revokeSession);
router.post("/sessions/purge-system", authenticateToken, requireAdmin, purgeSystem);
router.get("/events/sse", handleSseEvents);

module.exports = router;
