const { PASSWORD_MIN_LENGTH } = require('../../config/constants');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateSignup = (req, res, next) => {
    let { name, email, password } = req.body;
    const rawEmail = email ? String(email).trim().toLowerCase() : '';
    name = name ? String(name).trim() : '';

    if (!name || !rawEmail || !password) {
        console.log(`  ⚠️ [SIGNUP REJECTED] Missing required fields`);
        return res.status(400).json({ error: "All fields are required" });
    }

    if (!EMAIL_REGEX.test(rawEmail)) {
        console.log(`  ⚠️ [SIGNUP REJECTED] Invalid email format: ${rawEmail}`);
        return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        console.log(`  ⚠️ [SIGNUP REJECTED] Password too short`);
        return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` });
    }

    req.body.name = name;
    req.body.email = rawEmail;
    next();
};

const validateSignin = (req, res, next) => {
    let { email, password } = req.body;
    email = email ? String(email).trim().toLowerCase() : '';

    if (!email || !password) {
        console.log(`  ⚠️ [SIGNIN REJECTED] Missing email or password`);
        return res.status(400).json({ error: "Email and password are required" });
    }

    req.body.email = email;
    next();
};

module.exports = {
    validateSignup,
    validateSignin
};
