const validateAdminSignin = (req, res, next) => {
    let { email, password } = req.body;
    email = email ? String(email).trim().toLowerCase() : '';

    if (!email || !password) {
        console.log(`  ⚠️ [ADMIN SIGNIN REJECTED] Missing email or password`);
        return res.status(400).json({ error: "Email and password are required" });
    }

    req.body.email = email;
    next();
};

const validateRevokeSession = (req, res, next) => {
    const { targetJti } = req.body;
    if (!targetJti) {
        return res.status(400).json({ error: "targetJti is required" });
    }
    next();
};

module.exports = {
    validateAdminSignin,
    validateRevokeSession
};
