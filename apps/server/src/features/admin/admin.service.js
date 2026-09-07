const bcrypt = require("bcryptjs");
const { User } = require("../auth/user.model");
const { generateUserToken } = require("../../services/jwtService");
const {
    registerSession,
    getSystemStats,
    getSessionsList,
    revokeSessionByJti,
    purgeAllSessions
} = require("../../services/sessionService");

const authenticateAdmin = async (email, password, req) => {
    const user = await User.findOne({ email, role: 'admin' });
    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const { token, jti, exp } = generateUserToken(user, 'admin');
    await registerSession(user._id, user.email, user.name, jti, exp, req);
    return { token };
};

const fetchAdminStats = async () => {
    return await getSystemStats();
};

const fetchAdminSessions = async () => {
    return await getSessionsList();
};

const revokeAdminSession = async (targetJti) => {
    await revokeSessionByJti(targetJti);
};

const purgeAdminSystem = async (currentAdminJti, adminEmail) => {
    await purgeAllSessions(currentAdminJti, adminEmail);
};

module.exports = {
    authenticateAdmin,
    fetchAdminStats,
    fetchAdminSessions,
    revokeAdminSession,
    purgeAdminSystem
};
