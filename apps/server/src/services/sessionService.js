const { getAerospikeClient, isAerospikeEnabled, aerospikeNamespace } = require("../config/aerospike");

// High-speed fallback memory maps for local offline dev
const memorySessions = new Map();
const memoryDenylist = new Map();

/**
 * Aerospike Fast Session & Denylist Engine
 * Eliminates Redis completely — all sessions and denylisted tokens are stored
 * with native hardware-level self-expiring TTLs.
 */

const registerSession = async (userId, email, name, jti, exp, req) => {
    if (!jti || !exp) return;
    const remainingSeconds = exp - Math.floor(Date.now() / 1000);
    if (remainingSeconds <= 0) return;

    const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : 'Unknown';
    const ip = req ? (req.ip || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';

    const sessionData = {
        jti,
        userId: String(userId),
        email,
        name,
        ip,
        userAgent,
        signinAt: new Date().toISOString(),
        exp
    };

    // 1. Aerospike Hot KV Write with Native Hardware TTL
    if (isAerospikeEnabled()) {
        try {
            const Aerospike = require('aerospike');
            const asClient = getAerospikeClient();
            const key = new Aerospike.Key(aerospikeNamespace, 'sessions', jti);
            await asClient.put(key, sessionData, { ttl: remainingSeconds });
        } catch (e) {}
    }

    // 2. Memory Fallback
    memorySessions.set(jti, sessionData);
    setTimeout(() => memorySessions.delete(jti), remainingSeconds * 1000).unref();
};

const destroySession = async (jti) => {
    if (!jti) return;
    memorySessions.delete(jti);

    if (isAerospikeEnabled()) {
        try {
            const Aerospike = require('aerospike');
            const asClient = getAerospikeClient();
            const key = new Aerospike.Key(aerospikeNamespace, 'sessions', jti);
            await asClient.remove(key);
        } catch (e) {}
    }
};

const revokeToken = async (jti, exp) => {
    if (!jti || !exp) return;
    const remainingSeconds = exp - Math.floor(Date.now() / 1000);
    if (remainingSeconds > 0) {
        if (process.env.SILENT_LOGS !== 'true') console.log(`  ⏳ [LOGOUT REVOKE] Revoking token in Aerospike for ${remainingSeconds}s`);

        // Aerospike Denylist Record with Hardware-Level Self-Destruct TTL
        if (isAerospikeEnabled()) {
            try {
                const Aerospike = require('aerospike');
                const asClient = getAerospikeClient();
                const key = new Aerospike.Key(aerospikeNamespace, 'denylist', jti);
                await asClient.put(key, { jti, revokedAt: Date.now() }, { ttl: remainingSeconds });
            } catch (e) {}
        }

        memoryDenylist.set(jti, true);
        setTimeout(() => memoryDenylist.delete(jti), remainingSeconds * 1000).unref();
        await destroySession(jti);
    }
};

const isTokenRevoked = async (jti) => {
    if (!jti) return false;

    // Aerospike Sub-Millisecond (<0.5ms) Denylist Check
    if (isAerospikeEnabled()) {
        try {
            const Aerospike = require('aerospike');
            const asClient = getAerospikeClient();
            const key = new Aerospike.Key(aerospikeNamespace, 'denylist', jti);
            const record = await asClient.get(key);
            return Boolean(record && record.bins);
        } catch (err) {
            if (err.code === 2) return false; // Aerospike ERR_RECORD_NOT_FOUND (Valid Token)
        }
    }

    return memoryDenylist.has(jti);
};

module.exports = {
    registerSession,
    destroySession,
    revokeToken,
    isTokenRevoked
};

