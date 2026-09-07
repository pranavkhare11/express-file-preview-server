require('dotenv').config();
const os = require("os");
const app = require("./src/app");
const { connectDatabases, disconnectDatabases } = require("./src/config/db");
const { sweepStaleUploads } = require("./src/features/files/file.service");
const { PORT, HOST } = require("./src/config/constants");

let serverInstance = null;

const getLocalIpAddresses = () => {
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
};

const startServer = async () => {
    try {
        await connectDatabases();
        await sweepStaleUploads();

        serverInstance = app.listen(PORT, HOST, () => {
            const networkIps = getLocalIpAddresses();
            console.log(`========================================`);
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌐 Local URL:   http://localhost:${PORT}`);
            networkIps.forEach(ip => {
                console.log(`🌐 Network URL: http://${ip}:${PORT}`);
            });
            console.log(`========================================`);
        });
    } catch (err) {
        console.error('  ❌ [CRITICAL STARTUP ERROR] Failed to connect to databases:', err.message);
        process.exit(1);
    }
};

const gracefulShutdown = async (signal) => {
    console.log(`\n  🛑 [SYSTEM] ${signal} signal received. Closing HTTP server and database handles...`);
    if (serverInstance) {
        serverInstance.close(() => {
            console.log('  🌐 [HTTP] Server listening handle closed.');
        });
    }
    try {
        await disconnectDatabases();
        console.log('  🍃 [SYSTEM] Database handles cleanly closed. Exiting process.');
        process.exit(0);
    } catch (err) {
        console.error('  ❌ [SYSTEM] Error during graceful shutdown:', err.message);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();