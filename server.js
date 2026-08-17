require('dotenv').config();
const express = require("express");
const cors = require("cors");
const os = require("os");
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

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                ips.push(net.address);
            }
        }
    }
    return ips;
}

async function startServer() {
    try {
        await connectDatabases();
        await seedAdmin();

        const port = process.env.PORT || 3000;
        const host = process.env.HOST || '0.0.0.0';
        
        app.listen(port, host, () => {
            const networkIps = getLocalIpAddresses();
            console.log(`========================================`);
            console.log(`🚀 Server running on port ${port}`);
            console.log(`🌐 Local URL:   http://localhost:${port}`);
            networkIps.forEach(ip => {
                console.log(`🌐 Network URL: http://${ip}:${port}`);
            });
            console.log(`========================================`);
        });
    } catch (err) {
        console.error('  ❌ [CRITICAL STARTUP ERROR] Failed to connect to databases:', err.message);
        process.exit(1);
    }
}

// Server initialization
startServer();