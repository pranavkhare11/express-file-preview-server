const jwt = require("jsonwebtoken");
const { redisClient } = require("../config/db");

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ')) 
        ? authHeader.split(' ')[1] 
        : req.query.token;

    if (!token) {
        console.log(`  🚫 [AUTH FAILED] Authorization token missing`);
        return res.status(401).json({ error: "Access denied. Bearer token required." });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedUser) => {
        try {
            if (err) {
                console.log(`  🚫 [AUTH FAILED] JWT error: ${err.message}`);
                return res.status(401).json({ error: "Token expired or invalid. Please sign in again." });
            }
            if (decodedUser.jti) {
                const isRevoked = await redisClient.get(`denylist:${decodedUser.jti}`);
                if (isRevoked) {
                    console.log(`  🚫 [AUTH FAILED] Token is revoked`);
                    return res.status(401).json({ error: "session revoked. Please sign in again." });
                }
            }
            req.user = decodedUser;
            next();
        } catch (error) {
            console.error("  ❌ [AUTH ERROR]", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        console.log(`  🚫 [ADMIN DENIED] Unauthorized access attempt by ${req.user ? req.user.email : 'Unknown'}`);
        return res.status(403).json({ error: "Access denied. Administrator privilege required." });
    }
    next();
}

module.exports = {
    authenticateToken,
    requireAdmin
};
