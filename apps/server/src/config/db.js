const { initAerospike, disconnectAerospike } = require("./aerospike");

const connectDatabases = async () => {
    await initAerospike();
    console.log('  🚀 [AEROSPIKE DATABASE CONNECTED] High-Performance Real-Time Storage Active');
};

const disconnectDatabases = async () => {
    await disconnectAerospike();
    console.log('  🚀 [AEROSPIKE DATABASE DISCONNECTED]');
};

module.exports = {
    connectDatabases,
    disconnectDatabases
};
