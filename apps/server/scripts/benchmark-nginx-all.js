const http = require('http');
const autocannon = require('autocannon');

const BASE_URL = 'http://localhost';

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

const runAllResourcesBenchmark = async () => {
    console.log(`\n========================================================================================`);
    console.log(`🔥 CLIENT-FACING NGINX LOAD-BALANCED CLUSTER BENCHMARK`);
    console.log(`   (Nginx Edge Proxy + 6 Load-Balanced Express Nodes + Scaled MongoDB + Aerospike Hot KV)`);
    console.log(`========================================================================================\n`);

    const clientEmail = `benchmark_user_${Date.now()}@example.com`;
    const clientPassword = 'ClientUser@12345';
    const clientName = 'Benchmark Client';

    console.log(`🔑 Registering & Authenticating test client via Nginx (http://localhost/api/signup)...`);
    const signupRes = await jsonRequest('/api/signup', {
        method: 'POST',
        body: { name: clientName, email: clientEmail, password: clientPassword }
    });

    let token = null;
    if (signupRes.status === 201 && signupRes.body.token) {
        token = signupRes.body.token;
    } else {
        const signinRes = await jsonRequest('/api/signin', {
            method: 'POST',
            body: { email: clientEmail, password: clientPassword }
        });
        if (signinRes.status !== 200 || !signinRes.body.token) {
            throw new Error(`Authentication via Nginx failed: ${JSON.stringify(signinRes.body)}`);
        }
        token = signinRes.body.token;
    }

    console.log(`✅ Client JWT Token acquired successfully via Nginx.\n`);

    const scenarios = [
        {
            name: '1. Nginx Edge Routing Baseline (/api/user 401)',
            description: 'Measures Nginx reverse-proxy routing throughput & connection pooling ceiling.',
            opts: {
                url: `${BASE_URL}/api/user`,
                connections: 150,
                duration: 5,
                pipelining: 1
            }
        },
        {
            name: '2. Authenticated Profile Fetch (/api/user)',
            description: 'JWT verification + Aerospike hot KV session/denylist check across 6 nodes.',
            opts: {
                url: `${BASE_URL}/api/user`,
                connections: 120,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '3. Virtual File Explorer Contents (/api/files/explorer)',
            description: 'Authenticated MongoDB Virtual File System directory tree aggregation.',
            opts: {
                url: `${BASE_URL}/api/files/explorer`,
                connections: 100,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '4. Frontend Static Asset Delivery (/)',
            description: 'Nginx zero-copy static asset caching and gzip bundle delivery.',
            opts: {
                url: `${BASE_URL}/`,
                connections: 100,
                duration: 5,
                pipelining: 1
            }
        }
    ];

    const results = [];

    for (const scenario of scenarios) {
        console.log(`----------------------------------------------------------------------------------------`);
        console.log(`⚡ Running Scenario: ${scenario.name}`);
        console.log(`ℹ️  ${scenario.description}`);
        console.log(`⚙️  Connections: ${scenario.opts.connections} | Duration: ${scenario.opts.duration}s`);
        console.log(`----------------------------------------------------------------------------------------`);

        const instance = autocannon(scenario.opts);
        autocannon.track(instance, { renderProgressBar: true });

        const result = await instance;
        results.push({ scenario, result });
        console.log(`\n`);
    }

    console.log(`========================================================================================`);
    console.log(`📊 CLIENT-FACING NGINX + AEROSPIKE + MONGODB BENCHMARK REPORT`);
    console.log(`========================================================================================\n`);

    const summaryTable = results.map(({ scenario, result }) => ({
        'Scenario': scenario.name.split(' (')[0],
        'Req/sec (Avg)': formatNumber(result.requests.average),
        'Total Req (5s)': formatNumber(result.requests.total),
        'Latency (p50)': `${result.latency.p50} ms`,
        'Latency (p99)': `${result.latency.p99} ms`,
        'Throughput/s': `${formatBytes(result.throughput.average)}/s`,
        '2xx Responses': formatNumber(result['2xx'] || 0),
        'Non-2xx': formatNumber(result.non2xx || 0),
        'Errors': formatNumber(result.errors || 0)
    }));

    console.table(summaryTable);
    console.log(`\n========================================================================================\n`);
};

runAllResourcesBenchmark().catch((err) => {
    console.error(`\n❌ [BENCHMARK FAILURE]`, err);
    process.exit(1);
});
