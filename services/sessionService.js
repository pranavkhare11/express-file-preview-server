const { redisClient } = require("../config/db");
const { User } = require("../models/User");

async function registerSession(userId, email, name, jti, exp, req) {
    if (!jti || !exp) return;
    const remainingSeconds = exp - Math.floor(Date.now() / 1000);
    if (remainingSeconds <= 0) return;

    const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : 'Unknown';
    const ip = req ? (req.ip || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';

    const sessionData = JSON.stringify({
        jti,
        userId: String(userId),
        email,
        name,
        ip,
        userAgent,
        signinAt: new Date().toISOString(),
        exp
    });
    // Add to global sessions set & store metadata
    await redisClient.sAdd('global_sessions', jti);
    await redisClient.setEx(`session_meta:${jti}`, remainingSeconds, sessionData);
    // Broadcast SSE real-time event
    await broadcastSystemState('SESSION_CREATED', { email, jti });
}

async function destroySession(jti) {
    if (!jti) return;
    const metaJson = await redisClient.get(`session_meta:${jti}`);
    let email = 'Unknown';
    if (metaJson) {
        try { email = JSON.parse(metaJson).email; } catch (e) { }
    }
    await redisClient.sRem('global_sessions', jti);
    await redisClient.del(`session_meta:${jti}`);
    // Broadcast SSE real-time event
    await broadcastSystemState('SESSION_REVOKED', { email, jti });
}

async function revokeToken(jti, exp) {
    if (!jti || !exp) return;
    const remainingSeconds = exp - Math.floor(Date.now() / 1000);
    if (remainingSeconds > 0) {
        console.log(`  ⏳ [LOGOUT REVOKE] Revoking token for ${remainingSeconds} seconds`);
        await redisClient.setEx(`denylist:${jti}`, remainingSeconds, 'revoked');
        await destroySession(jti);
    }
}

async function getSystemState() {
    const totalUsers = await User.countDocuments();
    const jtis = await redisClient.sMembers('global_sessions');
    const sessions = [];
    for (const jti of jtis) {
        const metaJson = await redisClient.get(`session_meta:${jti}`);
        if (metaJson) {
            try { sessions.push(JSON.parse(metaJson)); } catch (e) { }
        } else {
            await redisClient.sRem('global_sessions', jti);
        }
    }
    const denylistKeys = await redisClient.keys('denylist:*');
    return {
        totalUsers,
        activeSessions: sessions.length,
        revokedTokensCount: denylistKeys.length,
        sessions
    };
}

async function broadcastSystemState(eventType, extraData = {}) {
    const state = await getSystemState();
    await redisClient.publish('admin_events', JSON.stringify({
        type: eventType,
        timestamp: new Date().toISOString(),
        ...extraData,
        state
    }));
}

module.exports = {
    registerSession,
    destroySession,
    revokeToken,
    getSystemState,
    broadcastSystemState
};
