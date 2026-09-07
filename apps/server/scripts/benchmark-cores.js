const path = require('path');
const { execSync } = require('child_process');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const autocannon = require('autocannon');

const TARGET_PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;
const APP_DIR = path.join(__dirname, '..');

const execEnv = {
    ...process.env,
    SILENT_LOGS: 'true',
    NODE_ENV: 'production',
    PORT: String(TARGET_PORT)
};

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

const formatNumber = (num) => (typeof num === 'number' ? num.toLocaleString('en-US', { maximumFractionDigits: 1 }) : num);
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
            // Worker spin-up delay
        }
        await new Promise(r => setTimeout(r, 400));
    }
    throw new Error('Server cluster failed to respond in time.');
};

const runMultiCoreScalingBenchmark = async () => {
    console.log(`\n========================================================================================`);
    console.log(`🔥 PM2 CLUSTER MULTI-CORE SCALING BENCHMARK (1 TO 10 CORES)`);
    console.log(`========================================================================================\n`);

    const adminEmail = process.env.ADMIN_EMAIL || 'khare.pranavmhs@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    console.log(`🛑 Ensuring clean PM2 state...`);
    try {
        execSync('npx pm2 delete all', { cwd: APP_DIR, stdio: 'ignore', env: execEnv });
    } catch {}

    console.log(`🚀 Starting cluster base with 1 instance...`);
    execSync('npx pm2 start server.js --name cluster-app -i 1', {
        cwd: APP_DIR,
        stdio: 'ignore',
        env: execEnv
    });

    await waitForServerReady();

    // Authenticate once to get JWT token
    const authRes = await jsonRequest('/api/signin', {
        method: 'POST',
        body: { email: adminEmail, password: adminPassword }
    });

    if (authRes.status !== 200 || !authRes.body.token) {
        throw new Error(`Authentication failed: ${JSON.stringify(authRes.body)}`);
    }

    const token = authRes.body.token;
    console.log(`🔑 Test admin JWT token acquired.\n`);

    const coreCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const scalingResults = [];

    for (const cores of coreCounts) {
        if (cores > 1) {
            console.log(`⚙️  [SCALING] Scaling PM2 Cluster to ${cores} Cores...`);
            execSync(`npx pm2 scale cluster-app ${cores}`, {
                cwd: APP_DIR,
                stdio: 'ignore',
                env: execEnv
            });
            await new Promise(r => setTimeout(r, 1000));
            await waitForServerReady();
        }

        console.log(`----------------------------------------------------------------------------------------`);
        console.log(`⚡ BENCHMARKING ON ${cores} ${cores === 1 ? 'CORE' : 'CORES'}`);
        console.log(`----------------------------------------------------------------------------------------`);

        // 1. Authenticated Profile Fetch Benchmark
        const profileResult = await autocannon({
            url: `${BASE_URL}/api/user`,
            connections: 80,
            duration: 3,
            pipelining: 1,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // 2. Virtual File Explorer Aggregation Benchmark
        const explorerResult = await autocannon({
            url: `${BASE_URL}/api/files/explorer`,
            connections: 60,
            duration: 3,
            pipelining: 1,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // 3. Raw Baseline 401 Throughput
        const baselineResult = await autocannon({
            url: `${BASE_URL}/api/user`,
            connections: 100,
            duration: 3,
            pipelining: 1
        });

        scalingResults.push({
            cores,
            profile: {
                reqPerSec: profileResult.requests.average,
                total: profileResult.requests.total,
                p50: profileResult.latency.p50,
                p99: profileResult.latency.p99,
                throughput: profileResult.throughput.average
            },
            explorer: {
                reqPerSec: explorerResult.requests.average,
                total: explorerResult.requests.total,
                p50: explorerResult.latency.p50,
                p99: explorerResult.latency.p99,
                throughput: explorerResult.throughput.average
            },
            baseline: {
                reqPerSec: baselineResult.requests.average,
                total: baselineResult.requests.total,
                p50: baselineResult.latency.p50,
                p99: baselineResult.latency.p99,
                throughput: baselineResult.throughput.average
            }
        });

        console.log(`  ➡️  Profile: ${formatNumber(profileResult.requests.average)} req/s (p50: ${profileResult.latency.p50}ms) | Explorer: ${formatNumber(explorerResult.requests.average)} req/s | Baseline: ${formatNumber(baselineResult.requests.average)} req/s\n`);
    }

    // Clean up PM2
    console.log(`🛑 Stopping and cleaning up PM2 Cluster...`);
    try {
        execSync('npx pm2 delete all', { cwd: APP_DIR, stdio: 'ignore', env: execEnv });
    } catch {}

    console.log(`\n========================================================================================`);
    console.log(`📊 FINAL MULTI-CORE SCALING REPORT (1 TO 10 CORES)`);
    console.log(`========================================================================================\n`);

    const baseProfileRps = scalingResults[0].profile.reqPerSec;
    const baseExplorerRps = scalingResults[0].explorer.reqPerSec;
    const baseBaselineRps = scalingResults[0].baseline.reqPerSec;

    console.log(`--- [1] AUTHENTICATED PROFILE FETCH (/api/user) SCALING ---`);
    const profileTable = scalingResults.map(r => ({
        'Cores': `${r.cores} Core${r.cores > 1 ? 's' : ' '}`,
        'Req/Sec': formatNumber(r.profile.reqPerSec),
        'Speedup': `${(r.profile.reqPerSec / baseProfileRps).toFixed(2)}x`,
        'p50 Latency': `${r.profile.p50} ms`,
        'p99 Latency': `${r.profile.p99} ms`,
        'Throughput': `${formatBytes(r.profile.throughput)}/s`,
        'Total Req': formatNumber(r.profile.total)
    }));
    console.table(profileTable);

    console.log(`\n--- [2] VIRTUAL FILE EXPLORER (/api/files/explorer) SCALING ---`);
    const explorerTable = scalingResults.map(r => ({
        'Cores': `${r.cores} Core${r.cores > 1 ? 's' : ' '}`,
        'Req/Sec': formatNumber(r.explorer.reqPerSec),
        'Speedup': `${(r.explorer.reqPerSec / baseExplorerRps).toFixed(2)}x`,
        'p50 Latency': `${r.explorer.p50} ms`,
        'p99 Latency': `${r.explorer.p99} ms`,
        'Throughput': `${formatBytes(r.explorer.throughput)}/s`,
        'Total Req': formatNumber(r.explorer.total)
    }));
    console.table(explorerTable);

    console.log(`\n--- [3] RAW ROUTING BASELINE (/api/user 401) SCALING ---`);
    const baselineTable = scalingResults.map(r => ({
        'Cores': `${r.cores} Core${r.cores > 1 ? 's' : ' '}`,
        'Req/Sec': formatNumber(r.baseline.reqPerSec),
        'Speedup': `${(r.baseline.reqPerSec / baseBaselineRps).toFixed(2)}x`,
        'p50 Latency': `${r.baseline.p50} ms`,
        'p99 Latency': `${r.baseline.p99} ms`,
        'Throughput': `${formatBytes(r.baseline.throughput)}/s`,
        'Total Req': formatNumber(r.baseline.total)
    }));
    console.table(baselineTable);

    console.log(`\n========================================================================================`);
    console.log(`🏁 SCALING BENCHMARK COMPLETE! All PM2 instances cleanly stopped.`);
    console.log(`========================================================================================\n`);
};

runMultiCoreScalingBenchmark().catch((err) => {
    console.error(`\n❌ [SCALING BENCHMARK FAILED]`, err);
    try {
        execSync('npx pm2 delete all', { cwd: APP_DIR, stdio: 'ignore', env: execEnv });
    } catch {}
    process.exit(1);
});
