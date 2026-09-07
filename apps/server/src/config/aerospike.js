/**
 * Aerospike Database Configuration & Client Adapter
 * Optimized for Ultra-High-Throughput Sub-Millisecond Key-Value Sessions & Denylist
 */
const aerospikeHost = process.env.AEROSPIKE_HOST || 'aerospike';
const aerospikePort = parseInt(process.env.AEROSPIKE_PORT || '3000', 10);
const aerospikeNamespace = process.env.AEROSPIKE_NAMESPACE || 'test';

let aerospikeClient = null;
let isAerospikeEnabled = false;

// Dynamic loader for environments with Aerospike native driver installed
const initAerospike = async () => {
    if (process.env.ENABLE_AEROSPIKE !== 'true') {
        return null;
    }

    try {
        const Aerospike = require('aerospike');
        aerospikeClient = await Aerospike.connect({
            hosts: [{ addr: aerospikeHost, port: aerospikePort }],
            policies: {
                read: new Aerospike.policy.ReadPolicy({ totalTimeout: 500 }),
                write: new Aerospike.policy.WritePolicy({ totalTimeout: 1000 }),
                remove: new Aerospike.policy.RemovePolicy({ totalTimeout: 1000 })
            }
        });
        isAerospikeEnabled = true;
        console.log(`  🚀 [AEROSPIKE CONNECTED] Hot Session & Denylist Tier active on ${aerospikeHost}:${aerospikePort}`);
        return aerospikeClient;
    } catch (err) {
        console.warn(`  ℹ️ [AEROSPIKE NOTE] Aerospike driver not active, falling back to Redis Hot Tier: ${err.message}`);
        isAerospikeEnabled = false;
        return null;
    }
};

const disconnectAerospike = async () => {
    if (aerospikeClient) {
        try {
            aerospikeClient.close();
            console.log('  🚀 [AEROSPIKE DISCONNECTED]');
        } catch (e) {}
    }
};

module.exports = {
    aerospikeNamespace,
    initAerospike,
    disconnectAerospike,
    getAerospikeClient: () => aerospikeClient,
    isAerospikeEnabled: () => isAerospikeEnabled
};
