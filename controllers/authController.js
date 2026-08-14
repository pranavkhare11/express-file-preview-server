const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User } = require("../models/User");
const { registerSession, revokeToken } = require("../services/sessionService");

async function signup(req, res) {
    const rawEmail = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
    try {
        let { name, password } = req.body;
        name = name ? String(name).trim() : '';

        if (!name || !rawEmail || !password) {
            console.log(`  ⚠️ [SIGNUP REJECTED] Missing required fields`);
            return res.status(400).json({ error: "All fields are required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rawEmail)) {
            console.log(`  ⚠️ [SIGNUP REJECTED] Invalid email format: ${rawEmail}`);
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (password.length < 6) {
            console.log(`  ⚠️ [SIGNUP REJECTED] Password too short`);
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({ name, email: rawEmail, hashedPassword });
        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h', jwtid: jti }
        );
        const decoded = jwt.decode(token);
        await registerSession(user._id, user.email, user.name, jti, decoded.exp, req);

        console.log(`  ✅ [SIGNUP SUCCESS] Created User ID: ${user.id} (${user.name})`);
        res.status(201).json({ message: "User created successfully", token });
    } catch (error) {
        if (error.code === 11000) {
            console.log(`  ⚠️ [SIGNUP REJECTED] Email already registered: ${rawEmail}`);
            return res.status(400).json({ error: "Email is already registered" });
        }
        console.error("  ❌ [SIGNUP ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function signin(req, res) {
    try {
        let { email, password } = req.body;
        email = email ? String(email).trim().toLowerCase() : '';

        if (!email || !password) {
            console.log(`  ⚠️ [SIGNIN REJECTED] Missing email or password`);
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            console.log(`  ❌ [SIGNIN FAILED] User not found: ${email}`);
            return res.status(401).json({ error: "User Not Registered. plz Signup" });
        }

        const isMatch = await bcrypt.compare(password, user.hashedPassword);
        if (!isMatch) {
            console.log(`  ❌ [SIGNIN FAILED] Incorrect password for user: ${email}`);
            return res.status(401).json({ error: "Incorrect Password" });
        }

        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h', jwtid: jti }
        );
        const decoded = jwt.decode(token);
        await registerSession(user._id, user.email, user.name, jti, decoded.exp, req);

        console.log(`  🔑 [SIGNIN SUCCESS] User logged in: ${user.email} (ID: ${user._id})`);
        res.json({ message: "Login Success", token });

    } catch (error) {
        console.error("  ❌ [SIGNIN ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getProfile(req, res) {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            console.log(`  ❌ [PROFILE FAILED] User ID ${req.user.userId} no longer exists in database`);
            return res.status(401).json({ error: "User profile not found" });
        }

        console.log(`  👤 [PROFILE FETCHED] ${user.name} <${user.email}> (ID: ${user.id})`);
        res.json({ name: user.name, email: user.email });
    } catch (error) {
        console.error("  ❌ [PROFILE ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function logout(req, res) {
    try {
        await revokeToken(req.user.jti, req.user.exp);
        console.log(`  ✅ [LOGOUT SUCCESS] User ${req.user.email} logged out`);
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("  ❌ [LOGOUT ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function deleteAccount(req, res) {
    try {
        const user = await User.findByIdAndDelete(req.user.userId);
        if (!user) {
            console.log(`  ❌ [DELETE FAILED] User ID ${req.user.userId} no longer exists in database`);
            return res.status(404).json({ error: "User account not found" });
        }

        await revokeToken(req.user.jti, req.user.exp);
        console.log(`  🗑️ [ACCOUNT DELETED] Permanently removed user ID: ${req.user.userId} (${req.user.email})`);
        res.json({ message: "Account deleted successfully" });
    } catch (error) {
        console.error("  ❌ [DELETE ERROR]", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    signup,
    signin,
    getProfile,
    logout,
    deleteAccount
};
