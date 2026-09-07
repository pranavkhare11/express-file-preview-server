const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } = require("../config/constants");

const getAccessSecret = () => process.env.JWT_SECRET || 'access_secret_fallback';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET + '_refresh');

const signAccessToken = (payload, options = {}) => {
    return jwt.sign(payload, getAccessSecret(), {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        ...options
    });
};

const signRefreshToken = (payload, options = {}) => {
    return jwt.sign(payload, getRefreshSecret(), {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        ...options
    });
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, getAccessSecret());
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, getRefreshSecret());
};

const decodeToken = (token) => {
    return jwt.decode(token);
};

const generateTokens = (user, roleOverride = null) => {
    const jti = crypto.randomUUID();
    const role = roleOverride || user.role || 'user';
    const payload = { userId: user._id, email: user.email, name: user.name, role };

    const accessToken = signAccessToken(payload, { jwtid: jti });
    const refreshToken = signRefreshToken({ userId: user._id, jti });

    const decodedAccess = decodeToken(accessToken);
    const decodedRefresh = decodeToken(refreshToken);

    return {
        accessToken,
        refreshToken,
        jti,
        accessExp: decodedAccess.exp,
        refreshExp: decodedRefresh.exp
    };
};

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    verifyToken: verifyAccessToken, // Backwards compatibility alias
    decodeToken,
    generateTokens,
    generateUserToken: generateTokens // Backwards compatibility alias
};
