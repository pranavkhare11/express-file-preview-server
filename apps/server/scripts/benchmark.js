const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.SILENT_LOGS = 'true'; // Suppress per-request console logs during high-throughput benchmark

const autocannon = require('autocannon');
const http = require('http');
const app = require('../src/app');
const { connectDatabases, disconnectDatabases } = require('../src/config/db');
const { seedAdmin, User } = require('../src/features/auth/user.model');

const TEST_PORT = process.env.BENCHMARK_PORT || 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

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

const runBenchmark = async () => {
    console.log(`\n======================================================`);
    console.log(`🚀 STARTING AUTOCANNON LOAD TEST & BENCHMARK SUITE`);
    console.log(`======================================================\n`);

    console.log(`🔌 Connecting to MongoDB & Redis...`);
    await connectDatabases();
    await seedAdmin();

    console.log(`📡 Starting isolated test HTTP server on port ${TEST_PORT}...`);
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));
    console.log(`✅ Test server listening at ${BASE_URL}\n`);

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
            description: 'Measures middleware short-circuit latency & rejection throughput without auth token.',
            opts: {
                url: `${BASE_URL}/api/user`,
                connections: 50,
                duration: 5,
                pipelining: 1
            }
        },
        {
            name: '2. Authenticated Profile Fetch (/api/user)',
            description: 'Measures JWT token verification + Redis session revocation lookup throughput.',
            opts: {
                url: `${BASE_URL}/api/user`,
                connections: 50,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '3. Virtual File Explorer Contents (/api/files/explorer)',
            description: 'Measures authenticated database aggregation & directory listing performance.',
            opts: {
                url: `${BASE_URL}/api/files/explorer`,
                connections: 30,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '4. Admin System Stats (/api/admin/stats)',
            description: 'Measures admin authorization + Redis active sessions count + Mongo stats query.',
            opts: {
                url: `${BASE_URL}/api/admin/stats`,
                connections: 30,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '5. Password Authentication & Bcrypt Verification (/api/signin)',
            description: 'CPU-intensive benchmark for user sign-in and bcrypt password hashing.',
            opts: {
                url: `${BASE_URL}/api/signin`,
                method: 'POST',
                connections: 10,
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
    console.log(`📊 BENCHMARK SUMMARY & PERFORMANCE REPORT`);
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

    console.log(`\n🧹 Shutting down test server and closing database connections...`);
    await new Promise((resolve) => server.close(resolve));
    server.closeAllConnections && server.closeAllConnections();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await disconnectDatabases();
    console.log(`✅ Benchmark completed cleanly!\n`);
};

runBenchmark().catch(async (err) => {
    console.error(`\n❌ [BENCHMARK FAILURE]`, err);
    try {
        await disconnectDatabases();
    } catch {}
    process.exit(1);
});
