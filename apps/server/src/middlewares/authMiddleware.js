const { verifyToken } = require("../services/jwtService");
const { isTokenRevoked } = require("../services/sessionService");

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        let token = req.cookies ? req.cookies.accessToken : null;

        if (!token && authHeader && authHeader.startsWith('Bearer ')) {
            const parts = authHeader.split(' ');
            if (parts.length === 2) token = parts[1];
        } else if (!token && req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            console.log(`  🚫 [AUTH FAILED] Authorization token missing`);
            return res.status(401).json({ error: "Access denied. Valid token required." });
        }

        const decodedUser = verifyToken(token);
        
        if (decodedUser && decodedUser.jti) {
            const revoked = await isTokenRevoked(decodedUser.jti);
            if (revoked) {
                console.log(`  🚫 [AUTH FAILED] Token is revoked`);
                return res.status(401).json({ error: "Session has been revoked. Please sign in again." });
            }
        }
        
        req.user = decodedUser;
        next();
    } catch (err) {
        console.log(`  🚫 [AUTH FAILED] JWT error: ${err.message}`);
        return res.status(401).json({ error: "Token is expired or invalid. Please sign in again." });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        console.log(`  🚫 [ADMIN DENIED] Unauthorized access attempt by ${req.user ? req.user.email : 'Unknown'}`);
        return res.status(403).json({ error: "Access denied. Administrator privilege required." });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin
};
