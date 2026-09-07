const mongoose = require("mongoose");
const { createClient } = require("redis");

const redisClient = createClient({ url: process.env.REDIS_URI });
redisClient.on('error', (err) => console.error('  ⚠️ [REDIS ERROR]', err.message));

const redisSubClient = redisClient.duplicate();
redisSubClient.on('error', (err) => console.error('  ⚠️ [REDIS SUB ERROR]', err.message));

const connectDatabases = async () => {
    await Promise.all([
        mongoose.connect(process.env.MONGO_URI),
        redisClient.connect(),
        redisSubClient.connect()
    ]);
    console.log('  🍃 [MONGO CONNECTED]');
    console.log('  🔴 [REDIS CONNECTED]');
};

const disconnectDatabases = async () => {
    await Promise.allSettled([
        mongoose.disconnect(),
        redisClient.quit(),
        redisSubClient.quit()
    ]);
    console.log('  🍃 [MONGO DISCONNECTED]');
    console.log('  🔴 [REDIS DISCONNECTED]');
};

module.exports = {
    redisClient,
    redisSubClient,
    connectDatabases,
    disconnectDatabases
};
