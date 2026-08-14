require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { connectDatabases } = require("./config/db");
const { seedAdmin } = require("./models/User");
const { requestLogger } = require("./middlewares/loggerMiddleware");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const fileRoutes = require('./routes/fileRoutes');

const app = express();
app.disable("x-powered-by");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));
app.use(requestLogger);

app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/files", fileRoutes);

async function startServer() {
    try {
        await connectDatabases();
        await seedAdmin();

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`========================================`);
            console.log(`🚀 Server running on port ${port}`);
            console.log(`🌐 Local URL: http://localhost:${port}`);
            console.log(`========================================`);
        });
    } catch (err) {
        console.error('  ❌ [CRITICAL STARTUP ERROR] Failed to connect to databases:', err.message);
        process.exit(1);
    }
}

startServer();