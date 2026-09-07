const { redisClient } = require("../config/db");
const { REDIS_KEYS } = require("../config/constants");

const getSystemState = async () => {
    const { User } = require("../features/auth/user.model");
    const totalUsers = await User.countDocuments();
    const jtis = await redisClient.sMembers(REDIS_KEYS.GLOBAL_SESSIONS);
    const sessions = [];
    for (const jti of jtis) {
        const metaJson = await redisClient.get(`${REDIS_KEYS.SESSION_META_PREFIX}${jti}`);
        if (metaJson) {
            try { sessions.push(JSON.parse(metaJson)); } catch (e) { }
        } else {
            await redisClient.sRem(REDIS_KEYS.GLOBAL_SESSIONS, jti);
        }
    }
    const denylistKeys = await redisClient.keys(`${REDIS_KEYS.DENYLIST_PREFIX}*`);
    return {
        totalUsers,
        activeSessions: sessions.length,
        revokedTokensCount: denylistKeys.length,
        sessions
    };
};

const broadcastSystemState = async (eventType, extraData = {}) => {
    const state = await getSystemState();
    await redisClient.publish(REDIS_KEYS.ADMIN_EVENTS_CHANNEL, JSON.stringify({
        type: eventType,
        timestamp: new Date().toISOString(),
        ...extraData,
        state
    }));
};

const registerSession = async (userId, email, name, jti, exp, req) => {
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

    await redisClient.sAdd(REDIS_KEYS.GLOBAL_SESSIONS, jti);
    await redisClient.setEx(`${REDIS_KEYS.SESSION_META_PREFIX}${jti}`, remainingSeconds, sessionData);
    await broadcastSystemState('SESSION_CREATED', { email, jti });
};

const destroySession = async (jti) => {
    if (!jti) return;
    const metaJson = await redisClient.get(`${REDIS_KEYS.SESSION_META_PREFIX}${jti}`);
    let email = 'Unknown';
    if (metaJson) {
        try { email = JSON.parse(metaJson).email; } catch (e) { }
    }
    await redisClient.sRem(REDIS_KEYS.GLOBAL_SESSIONS, jti);
    await redisClient.del(`${REDIS_KEYS.SESSION_META_PREFIX}${jti}`);
    await broadcastSystemState('SESSION_REVOKED', { email, jti });
};

const revokeToken = async (jti, exp) => {
    if (!jti || !exp) return;
    const remainingSeconds = exp - Math.floor(Date.now() / 1000);
    if (remainingSeconds > 0) {
        console.log(`  ⏳ [LOGOUT REVOKE] Revoking token for ${remainingSeconds} seconds`);
        await redisClient.setEx(`${REDIS_KEYS.DENYLIST_PREFIX}${jti}`, remainingSeconds, 'revoked');
        await destroySession(jti);
    }
};

const isTokenRevoked = async (jti) => {
    if (!jti) return false;
    const isRevoked = await redisClient.get(`${REDIS_KEYS.DENYLIST_PREFIX}${jti}`);
    return Boolean(isRevoked);
};

const getSystemStats = async () => {
    const { User } = require("../features/auth/user.model");
    const totalUsers = await User.countDocuments();
    const activeSessions = await redisClient.sCard(REDIS_KEYS.GLOBAL_SESSIONS);
    const denylistKeys = await redisClient.keys(`${REDIS_KEYS.DENYLIST_PREFIX}*`);
    return {
        totalUsers,
        activeSessions,
        revokedTokensCount: denylistKeys.length
    };
};

const getSessionsList = async () => {
    const jtis = await redisClient.sMembers(REDIS_KEYS.GLOBAL_SESSIONS);
    const sessions = [];
    for (const jti of jtis) {
        const metaJson = await redisClient.get(`${REDIS_KEYS.SESSION_META_PREFIX}${jti}`);
        if (metaJson) {
            sessions.push(JSON.parse(metaJson));
        } else {
            await redisClient.sRem(REDIS_KEYS.GLOBAL_SESSIONS, jti);
        }
    }
    return sessions;
};

const revokeSessionByJti = async (targetJti) => {
    const metaJson = await redisClient.get(`${REDIS_KEYS.SESSION_META_PREFIX}${targetJti}`);
    if (metaJson) {
        const { exp } = JSON.parse(metaJson);
        await revokeToken(targetJti, exp);
    } else {
        await redisClient.setEx(`${REDIS_KEYS.DENYLIST_PREFIX}${targetJti}`, 3600, 'revoked');
        await destroySession(targetJti);
    }
};

const purgeAllSessions = async (currentAdminJti, adminEmail) => {
    const globalJtis = await redisClient.sMembers(REDIS_KEYS.GLOBAL_SESSIONS);

    for (const jti of globalJtis) {
        if (jti === currentAdminJti) continue;

        const metaJson = await redisClient.get(`${REDIS_KEYS.SESSION_META_PREFIX}${jti}`);
        if (metaJson) {
            const { exp } = JSON.parse(metaJson);
            await revokeToken(jti, exp);
        } else {
            await redisClient.setEx(`${REDIS_KEYS.DENYLIST_PREFIX}${jti}`, 3600, 'revoked');
            await destroySession(jti);
        }
    }
    await broadcastSystemState('SYSTEM_PURGED', { performedBy: adminEmail });
};

module.exports = {
    registerSession,
    destroySession,
    revokeToken,
    isTokenRevoked,
    getSystemStats,
    getSessionsList,
    revokeSessionByJti,
    purgeAllSessions,
    getSystemState,
    broadcastSystemState
};
