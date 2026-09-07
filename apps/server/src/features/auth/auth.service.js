const bcrypt = require("bcryptjs");
const { User } = require("./user.model");
const { generateTokens, verifyRefreshToken, decodeToken } = require("../../services/jwtService");
const { registerSession, revokeToken } = require("../../services/sessionService");
const { SALT_ROUNDS } = require("../../config/constants");

const registerUser = async (name, email, password, req) => {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({ name, email, hashedPassword });
    const { accessToken, refreshToken, jti, accessExp } = generateTokens(user);
    await registerSession(user._id, user.email, user.name, jti, accessExp, req);

    console.log(`  ✅ [SIGNUP SUCCESS] Created User ID: ${user.id} (${user.name})`);
    return { user, accessToken, refreshToken };
};

const authenticateUser = async (email, password, req) => {
    const user = await User.findOne({ email });

    if (!user) {
        console.log(`  ❌ [SIGNIN FAILED] User not found: ${email}`);
        throw new Error('INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
        console.log(`  ❌ [SIGNIN FAILED] Incorrect password for user: ${email}`);
        throw new Error('INVALID_CREDENTIALS');
    }

    const { accessToken, refreshToken, jti, accessExp } = generateTokens(user);
    await registerSession(user._id, user.email, user.name, jti, accessExp, req);

    console.log(`  🔑 [SIGNIN SUCCESS] User logged in: ${user.email} (ID: ${user._id})`);
    return { user, accessToken, refreshToken };
};

const rotateRefreshToken = async (oldRefreshToken, req) => {
    if (!oldRefreshToken) throw new Error('REFRESH_TOKEN_REQUIRED');

    const decoded = verifyRefreshToken(oldRefreshToken);
    if (!decoded || !decoded.userId) throw new Error('INVALID_REFRESH_TOKEN');

    const user = await User.findById(decoded.userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    if (decoded.jti) {
        await revokeToken(decoded.jti, decoded.exp);
    }

    const { accessToken, refreshToken, jti, accessExp } = generateTokens(user);
    await registerSession(user._id, user.email, user.name, jti, accessExp, req);

    console.log(`  🔄 [TOKEN ROTATION] Refreshed tokens for user: ${user.email}`);
    return { user, accessToken, refreshToken };
};

const getUserProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        console.log(`  ❌ [PROFILE FAILED] User ID ${userId} no longer exists in database`);
        throw new Error('USER_NOT_FOUND');
    }

    console.log(`  👤 [PROFILE FETCHED] ${user.name} <${user.email}> (ID: ${user.id})`);
    return { id: user._id, name: user.name, email: user.email, role: user.role };
};

const logoutUser = async (jti, exp) => {
    await revokeToken(jti, exp);
};

const removeUserAccount = async (userId, jti, exp) => {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
        console.log(`  ❌ [DELETE FAILED] User ID ${userId} no longer exists in database`);
        throw new Error('USER_NOT_FOUND');
    }

    await revokeToken(jti, exp);
    console.log(`  🗑️ [ACCOUNT DELETED] Permanently removed user ID: ${userId} (${user.email})`);
    return user;
};

module.exports = {
    registerUser,
    authenticateUser,
    rotateRefreshToken,
    getUserProfile,
    logoutUser,
    removeUserAccount
};
