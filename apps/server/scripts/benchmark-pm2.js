const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const autocannon = require('autocannon');

const TARGET_PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;
const APP_DIR = path.join(__dirname, '..');

// Helper to make HTTP JSON requests
const jsonRequest = (urlPath, options = {}) => {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE_URL);
        const req = http.request(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, headers: res.headers, body: parsed });
                } catch {
                    resolve({ status: res.statusCode, headers: res.headers, raw: data });
                }
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
};

const formatNumber = (num) => (typeof num === 'number' ? num.toLocaleString('en-US', { maximumFractionDigits: 2 }) : num);
const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

const waitForServerReady = async (maxAttempts = 30) => {
    for (let i = 1; i <= maxAttempts; i++) {
        try {
            const res = await jsonRequest('/api/user');
            if (res.status === 401 || res.status === 200) {
                return true;
            }
        } catch {
            // Still starting up
        }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Server cluster failed to respond in time.');
};

const runClusterBenchmark = async () => {
    console.log(`\n======================================================`);
    console.log(`⚡ STARTING PM2 CLUSTER AUTOCANNON LOAD TEST SUITE`);
    console.log(`======================================================\n`);

    console.log(`🛑 Ensuring any existing PM2 processes are stopped...`);
    try {
        execSync('npx pm2 delete all --silent', { cwd: APP_DIR, stdio: 'ignore' });
    } catch {}

    console.log(`🚀 Spawning PM2 Cluster across available CPU cores...`);
    execSync('npx pm2 start ecosystem.config.js', { cwd: APP_DIR, stdio: 'inherit' });

    console.log(`\n📋 PM2 Cluster Status:`);
    execSync('npx pm2 list', { cwd: APP_DIR, stdio: 'inherit' });

    console.log(`\n⏳ Waiting for all cluster workers to accept traffic at ${BASE_URL}...`);
    await waitForServerReady();
    console.log(`✅ PM2 Cluster is ready and listening!\n`);

    const adminEmail = process.env.ADMIN_EMAIL || 'khare.pranavmhs@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    console.log(`🔑 Authenticating test admin (${adminEmail}) to acquire JWT token...`);
    const authRes = await jsonRequest('/api/signin', {
        method: 'POST',
        body: { email: adminEmail, password: adminPassword }
    });

    if (authRes.status !== 200 || !authRes.body.token) {
        throw new Error(`Authentication failed with status ${authRes.status}: ${JSON.stringify(authRes.body)}`);
    }

    const token = authRes.body.token;
    console.log(`✅ JWT Token acquired successfully.\n`);

    const scenarios = [
        {
            name: '1. Unauthenticated 401 Baseline (/api/user)',
            description: 'Cluster middleware short-circuit & rejection throughput.',
            opts: {
                url: `${BASE_URL}/api/user`,
                connections: 100,
                duration: 5,
                pipelining: 1
            }
        },
        {
            name: '2. Authenticated Profile Fetch (/api/user)',
            description: 'JWT verification + Redis session revocation cluster load.',
            opts: {
                url: `${BASE_URL}/api/user`,
                connections: 100,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '3. Virtual File Explorer Contents (/api/files/explorer)',
            description: 'Clustered MongoDB queries + aggregation directory listing.',
            opts: {
                url: `${BASE_URL}/api/files/explorer`,
                connections: 60,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '4. Admin System Stats (/api/admin/stats)',
            description: 'Admin authorization + Redis active sessions count across cluster.',
            opts: {
                url: `${BASE_URL}/api/admin/stats`,
                connections: 60,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '5. Password Authentication & Bcrypt Verification (/api/signin)',
            description: 'CPU-intensive benchmark distributing bcrypt across multi-core workers.',
            opts: {
                url: `${BASE_URL}/api/signin`,
                method: 'POST',
                connections: 24,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: adminEmail,
                    password: adminPassword
                })
            }
        }
    ];

    const results = [];

    for (const scenario of scenarios) {
        console.log(`------------------------------------------------------`);
        console.log(`🔥 Running Benchmark: ${scenario.name}`);
        console.log(`ℹ️  ${scenario.description}`);
        console.log(`⚙️  Connections: ${scenario.opts.connections} | Duration: ${scenario.opts.duration}s`);
        console.log(`------------------------------------------------------`);

        const instance = autocannon(scenario.opts);
        autocannon.track(instance, { renderProgressBar: true });

        const result = await instance;
        results.push({ scenario, result });
        console.log(`\n`);
    }

    console.log(`======================================================`);
    console.log(`📊 PM2 CLUSTER BENCHMARK SUMMARY REPORT`);
    console.log(`======================================================\n`);

    const summaryTable = results.map(({ scenario, result }) => ({
        'Scenario': scenario.name.split(' (')[0],
        'Req/sec (Avg)': formatNumber(result.requests.average),
        'Total Req': formatNumber(result.requests.total),
        'Latency (p50)': `${result.latency.p50} ms`,
        'Latency (p99)': `${result.latency.p99} ms`,
        'Throughput/s': `${formatBytes(result.throughput.average)}/s`,
        '2xx Codes': formatNumber(result['2xx'] || 0),
        'Non-2xx': formatNumber(result.non2xx || 0),
        'Errors': formatNumber(result.errors || 0)
    }));

    console.table(summaryTable);

    console.log(`\n🛑 Stopping PM2 Cluster...`);
    try {
        execSync('npx pm2 delete all', { cwd: APP_DIR, stdio: 'inherit' });
    } catch {}

    console.log(`\n✅ PM2 Cluster load test suite completed successfully!\n`);
};

runClusterBenchmark().catch((err) => {
    console.error(`\n❌ [PM2 BENCHMARK FAILURE]`, err);
    try {
        execSync('npx pm2 delete all --silent', { cwd: APP_DIR, stdio: 'ignore' });
    } catch {}
    process.exit(1);
});
