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
    console.log(`🔥 FULL RESOURCE NGINX LOAD-BALANCED CLUSTER BENCHMARK`);
    console.log(`   (Nginx Edge Proxy + 6 Load-Balanced Express Nodes + Scaled MongoDB + Scaled Redis)`);
    console.log(`========================================================================================\n`);

    const adminEmail = 'khare.pranavmhs@gmail.com';
    const adminPassword = 'Admin@12345';

    console.log(`🔑 Authenticating test admin via Nginx (http://localhost/api/signin)...`);
    const authRes = await jsonRequest('/api/signin', {
        method: 'POST',
        body: { email: adminEmail, password: adminPassword }
    });

    if (authRes.status !== 200 || !authRes.body.token) {
        throw new Error(`Authentication via Nginx failed: ${JSON.stringify(authRes.body)}`);
    }

    const token = authRes.body.token;
    console.log(`✅ Admin JWT Token acquired successfully via Nginx.\n`);

    const scenarios = [
        {
            name: '1. Nginx Edge Routing Baseline (/api/user 401)',
            description: 'Measures Nginx reverse-proxy throughput & connection pooling ceiling.',
            opts: {
                url: `${BASE_URL}/api/user`,
                connections: 150,
                duration: 5,
                pipelining: 1
            }
        },
        {
            name: '2. Authenticated Profile Fetch (/api/user)',
            description: 'JWT verification + Redis session revocation check distributed across 6 nodes.',
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
            description: 'Authenticated MongoDB directory aggregation across 6 load-balanced nodes.',
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
            name: '4. Admin System Stats (/api/admin/stats)',
            description: 'Admin authorization + Redis session counts + MongoDB metrics via Nginx.',
            opts: {
                url: `${BASE_URL}/api/admin/stats`,
                connections: 100,
                duration: 5,
                pipelining: 1,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        },
        {
            name: '5. Frontend Static Asset Delivery (/)',
            description: 'Nginx zero-copy static caching and gzip asset serving.',
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
    console.log(`📊 FULL RESOURCE NGINX CLUSTER BENCHMARK REPORT`);
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
