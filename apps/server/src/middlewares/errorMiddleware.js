const errorHandler = (err, req, res, next) => {
    console.error(`  [${new Date().toISOString()}] ❌ [ERROR] [${req.method} ${req.url}]:`, err.stack || err.message);

    // Mongoose Unique Constraint error
    if (err.code === 11000) {
        return res.status(409).json({ error: "The provided email is already registered." });
    }

    // Mongoose Validation error
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }

    // Domain / Custom exceptions
    if (err.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ error: "Invalid email or password." });
    }

    if (err.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: "User profile not found." });
    }

    if (err.message === 'FILE_NOT_FOUND') {
        return res.status(404).json({ error: "File not found." });
    }

    // Default internal server error protection
    const statusCode = err.statusCode || 500;
    const responseError = process.env.NODE_ENV === 'production' 
        ? "Internal server error" 
        : (err.message || "Internal server error");

    res.status(statusCode).json({ error: responseError });
};

module.exports = { errorHandler };
