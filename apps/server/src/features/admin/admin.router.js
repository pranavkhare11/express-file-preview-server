const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../../middlewares/authMiddleware");
const { validateAdminSignin, validateRevokeSession } = require("./admin.validation");
const {
    adminSignin,
    getStats,
    getSessions,
    revokeSession,
    purgeSystem,
    handleSseEvents
} = require("./admin.controller");

router.post("/signin", validateAdminSignin, adminSignin);
router.get("/stats", authenticateToken, requireAdmin, getStats);
router.get("/sessions", authenticateToken, requireAdmin, getSessions);
router.post("/sessions/revoke", authenticateToken, requireAdmin, validateRevokeSession, revokeSession);
router.post("/sessions/purge-system", authenticateToken, requireAdmin, purgeSystem);
router.get("/events/sse", authenticateToken, requireAdmin, handleSseEvents);

module.exports = router;
