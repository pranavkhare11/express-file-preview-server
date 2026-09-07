const mongoose = require("mongoose");
const { initAerospike, disconnectAerospike } = require("./aerospike");

const connectDatabases = async () => {
    await Promise.all([
        mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 150,
            minPoolSize: 20,
            maxConnecting: 20,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        }),
        initAerospike()
    ]);
    console.log('  🍃 [MONGO CONNECTED (Pooled maxPoolSize=150)]');
};

const disconnectDatabases = async () => {
    await Promise.allSettled([
        mongoose.disconnect(),
        disconnectAerospike()
    ]);
    console.log('  🍃 [DATABASES DISCONNECTED]');
};

module.exports = {
    connectDatabases,
    disconnectDatabases
};
