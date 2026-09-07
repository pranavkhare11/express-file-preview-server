const authService = require("./auth.service");
const { COOKIE_OPTIONS } = require("../../config/constants");

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, COOKIE_OPTIONS.accessToken);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS.refreshToken);
};

const clearAuthCookies = (res) => {
    res.clearCookie('accessToken', { httpOnly: true, sameSite: 'lax' });
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', path: '/api/refresh' });
};

const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const result = await authService.registerUser(name, email, password, req);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(201).json({
            message: "User created successfully",
            token: result.accessToken,
            user: { id: result.user._id, name: result.user.name, email: result.user.email }
        });
    } catch (error) {
        next(error);
    }
};

const signin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.authenticateUser(email, password, req);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.json({
            message: "Login Success",
            token: result.accessToken,
            user: { id: result.user._id, name: result.user.name, email: result.user.email }
        });
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const oldRefreshToken = req.cookies ? req.cookies.refreshToken : (req.body ? req.body.refreshToken : null);
        const result = await authService.rotateRefreshToken(oldRefreshToken, req);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.json({
            message: "Token refreshed successfully",
            token: result.accessToken,
            user: { id: result.user._id, name: result.user.name, email: result.user.email }
        });
    } catch (error) {
        clearAuthCookies(res);
        res.status(401).json({ error: "Refresh token expired or invalid. Please sign in again." });
    }
};

const getProfile = async (req, res, next) => {
    try {
        const profile = await authService.getUserProfile(req.user.userId);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        if (req.user) {
            await authService.logoutUser(req.user.jti, req.user.exp);
        }
        clearAuthCookies(res);
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        clearAuthCookies(res);
        next(error);
    }
};

const deleteAccount = async (req, res, next) => {
    try {
        await authService.removeUserAccount(req.user.userId, req.user.jti, req.user.exp);
        clearAuthCookies(res);
        res.json({ message: "Account deleted successfully" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signup,
    signin,
    refreshToken,
    getProfile,
    logout,
    deleteAccount
};
