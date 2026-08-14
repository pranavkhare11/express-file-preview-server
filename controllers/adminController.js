const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User } = require("../models/User");
const { redisClient, redisSubClient } = require("../config/db");
const {
    registerSession,
    revokeToken,
    destroySession,
    getSystemState,
    broadcastSystemState
} = require("../services/sessionService");

async function adminSignin(req, res) {
    try {
        let { email, password } = req.body;
        email = email ? String(email).trim().toLowerCase() : '';
        const user = await User.findOne({ email, role: 'admin' });
        if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
            return res.status(401).json({ error: "Invalid admin credentials" });
        }
        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '1h', jwtid: jti }
        );
        const decoded = jwt.decode(token);
        await registerSession(user._id, user.email, user.name, jti, decoded.exp, req);
        res.json({ message: "Admin authenticated successfully", token });
    } catch (error) {
        console.error("  ❌ [ADMIN SIGNIN ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getStats(req, res) {
    try {
        const totalUsers = await User.countDocuments();
        const activeSessions = await redisClient.sCard('global_sessions');
        const denylistKeys = await redisClient.keys('denylist:*');

        res.json({
            totalUsers,
            activeSessions,
            revokedTokensCount: denylistKeys.length
        });
    } catch (error) {
        console.error("  ❌ [ADMIN STATS ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getSessions(req, res) {
    try {
        const jtis = await redisClient.sMembers('global_sessions');
        const sessions = [];
        for (const jti of jtis) {
            const metaJson = await redisClient.get(`session_meta:${jti}`);
            if (metaJson) {
                sessions.push(JSON.parse(metaJson));
            } else {
                // Cleanup stale key if meta expired naturally
                await redisClient.sRem('global_sessions', jti);
            }
        }
        res.json({ sessions });
    } catch (error) {
        console.error("  ❌ [ADMIN SESSIONS ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function revokeSession(req, res) {
    try {
        const { targetJti } = req.body;
        if (!targetJti) return res.status(400).json({ error: "targetJti is required" });
        const metaJson = await redisClient.get(`session_meta:${targetJti}`);
        if (metaJson) {
            const { exp } = JSON.parse(metaJson);
            await revokeToken(targetJti, exp);
        } else {
            // Force denylist for 1 hour fallback
            await redisClient.setEx(`denylist:${targetJti}`, 3600, 'revoked');
            await destroySession(targetJti);
        }
        res.json({ message: `Session ${targetJti} successfully revoked` });
    } catch (error) {
        console.error("  ❌ [ADMIN REVOKE ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function purgeSystem(req, res) {
    try {
        const currentAdminJti = req.user.jti;
        const globalJtis = await redisClient.sMembers('global_sessions');

        for (const jti of globalJtis) {
            // Keep the active admin performing the purge logged in!
            if (jti === currentAdminJti) continue;

            const metaJson = await redisClient.get(`session_meta:${jti}`);
            if (metaJson) {
                const { exp } = JSON.parse(metaJson);
                await revokeToken(jti, exp);
            } else {
                await redisClient.setEx(`denylist:${jti}`, 3600, 'revoked');
                await destroySession(jti);
            }
        }
        await broadcastSystemState('SYSTEM_PURGED', { performedBy: req.user.email });
        res.json({ message: "Emergency system purge complete. All user sessions invalidated." });
    } catch (error) {
        console.error("  ❌ [ADMIN PURGE ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function handleSseEvents(req, res) {
    const token = req.query.token || (req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : null);
    if (!token) return res.status(401).end("Unauthorized");

    try {
        const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
        if (decodedUser.role !== 'admin') return res.status(403).end("Forbidden");
    } catch (e) {
        return res.status(401).end("Invalid token");
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial system state immediately upon connection
    const initialState = await getSystemState();
    res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', state: initialState })}\n\n`);

    const listener = (message) => {
        res.write(`data: ${message}\n\n`);
    };

    await redisSubClient.subscribe('admin_events', listener);

    req.on('close', () => {
        redisSubClient.unsubscribe('admin_events', listener);
    });
}

module.exports = {
    adminSignin,
    getStats,
    getSessions,
    revokeSession,
    purgeSystem,
    handleSseEvents
};
