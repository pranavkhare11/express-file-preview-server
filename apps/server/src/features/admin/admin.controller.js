const adminService = require("./admin.service");
const { getSystemState, eventBus } = require("../../services/sessionService");

const adminSignin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { token } = await adminService.authenticateAdmin(email, password, req);
        res.json({ message: "Admin authenticated successfully", token });
    } catch (error) {
        next(error);
    }
};

const getStats = async (req, res, next) => {
    try {
        const stats = await adminService.fetchAdminStats();
        res.json(stats);
    } catch (error) {
        next(error);
    }
};

const getSessions = async (req, res, next) => {
    try {
        const sessions = await adminService.fetchAdminSessions();
        res.json({ sessions });
    } catch (error) {
        next(error);
    }
};

const revokeSession = async (req, res, next) => {
    try {
        const { targetJti } = req.body;
        await adminService.revokeAdminSession(targetJti);
        res.json({ message: `Session ${targetJti} successfully revoked` });
    } catch (error) {
        next(error);
    }
};

const purgeSystem = async (req, res, next) => {
    try {
        await adminService.purgeAdminSystem(req.user.jti, req.user.email);
        res.json({ message: "Emergency system purge complete. All user sessions invalidated." });
    } catch (error) {
        next(error);
    }
};

const handleSseEvents = async (req, res, next) => {
    let isSubscribed = false;
    const listener = (message) => {
        if (!res.writableEnded) {
            res.write(`data: ${message}\n\n`);
        }
    };

    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const initialState = await getSystemState();
        res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', state: initialState })}\n\n`);

        eventBus.on('admin_events', listener);
        isSubscribed = true;

        req.on('close', () => {
            if (isSubscribed) {
                isSubscribed = false;
                eventBus.removeListener('admin_events', listener);
            }
        });
    } catch (error) {
        if (isSubscribed) {
            eventBus.removeListener('admin_events', listener);
        }
        next(error);
    }
};

module.exports = {
    adminSignin,
    getStats,
    getSessions,
    revokeSession,
    purgeSystem,
    handleSseEvents
};
