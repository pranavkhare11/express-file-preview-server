const mongoose = require("mongoose");
const { createClient } = require("redis");

const redisClient = createClient({ url: process.env.REDIS_URI });
redisClient.on('error', (err) => console.error('  ⚠️ [REDIS ERROR]', err.message));

const redisSubClient = redisClient.duplicate();
redisSubClient.on('error', (err) => console.error('  ⚠️ [REDIS SUB ERROR]', err.message));

async function connectDatabases() {
    await Promise.all([
        mongoose.connect(process.env.MONGO_URI),
        redisClient.connect(),
        redisSubClient.connect()
    ]);
    console.log('  🍃 [MONGO CONNECTED]');
    console.log('  🔴 [REDIS CONNECTED]');
}

module.exports = {
    redisClient,
    redisSubClient,
    connectDatabases
};
