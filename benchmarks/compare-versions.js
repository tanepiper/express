#!/usr/bin/env node
/**
 * Compare Express 4 vs Express 5 performance
 * This script installs both versions and runs benchmarks
 * Matches benchmarks from: https://www.repoflow.io/blog/express-4-vs-express-5-benchmark-node-18-24
 */

const { spawn, execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const EXPRESS_4_VERSION = '4.21.2'; // Latest Express 4 (article used 4.18.2, 4.22.1)
const EXPRESS_5_VERSION = '5.2.1'; // Current Express 5 (article used 5.0.0, 5.1.0, 5.2.1)

/**
 * Generate a ~50 KB JSON payload for POST benchmarks
 */
function generateLargeJSONPayload() {
  const data = {
    timestamp: new Date().toISOString(),
    metadata: {
      version: '1.0',
      source: 'benchmark',
      user: 'test-user'
    },
    records: []
  };
  
  // Add enough records to reach ~50 KB
  for (let i = 0; i < 500; i++) {
    data.records.push({
      id: i,
      name: `Record ${i}`,
      email: `user${i}@example.com`,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      value: Math.random() * 1000,
      active: i % 2 === 0,
      tags: ['benchmark', 'test', 'data'],
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    });
  }
  
  return JSON.stringify(data);
}

console.log('\n' + '='.repeat(80));
console.log('EXPRESS 4 VS EXPRESS 5 PERFORMANCE COMPARISON');
console.log('='.repeat(80));

console.log(`\nExpress 4 version: ${EXPRESS_4_VERSION}`);
console.log(`Express 5 version: ${EXPRESS_5_VERSION}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`CPUs: ${os.cpus().length}x ${os.cpus()[0]?.model || 'Unknown'}`);

/**
 * Run benchmarks for a specific Express version
 */
async function runBenchmarksForVersion(version, label) {
  console.log('\n' + '='.repeat(80));
  console.log(`Installing Express ${label} (${version})`);
  console.log('='.repeat(80));

  const tempDir = path.join(__dirname, 'temp', label.toLowerCase().replace(/\s+/g, '-'));
  
  // Create temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Create package.json
  const packageJson = {
    name: `express-benchmark-${label.toLowerCase().replace(/\s+/g, '-')}`,
    version: '1.0.0',
    private: true,
    dependencies: {
      express: version
    }
  };

  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install --silent', {
    cwd: tempDir,
    stdio: 'inherit'
  });

  console.log(`\nExpress ${label} installed successfully!`);

  // Copy benchmark scripts to temp directory
  const benchmarkScripts = [
    'ping.js',
    'middleware-50.js',
    'json-body.js',
    'large-payload.js'
  ];

  benchmarkScripts.forEach(script => {
    const srcPath = path.join(__dirname, script);
    const destPath = path.join(tempDir, script);
    
    if (fs.existsSync(srcPath)) {
      let content = fs.readFileSync(srcPath, 'utf8');
      // Update require path to use installed express
      content = content.replace(/require\(['"]\.\.["']\)/g, "require('express')");
      fs.writeFileSync(destPath, content);
    }
  });

  // Run benchmarks matching the article
  const quickBenchmarks = [
    {
      name: 'ping',
      script: 'ping.js',
      url: 'http://localhost:3333/ping',
      description: 'Ping (GET /ping) - Simplest case',
      method: 'GET'
    },
    {
      name: 'middleware-50',
      script: 'middleware-50.js',
      url: 'http://localhost:3333/ping',
      description: 'Middleware x50 (GET /ping) - 50 middleware functions',
      method: 'GET'
    },
    {
      name: 'json-body',
      script: 'json-body.js',
      url: 'http://localhost:3333/json',
      description: 'JSON body ~50 KB (POST /json) - JSON parsing',
      method: 'POST',
      bodyGenerator: generateLargeJSONPayload
    },
    {
      name: 'large-payload',
      script: 'large-payload.js',
      url: 'http://localhost:3333/payload',
      description: 'Response payload 100 KB (GET /payload) - Large response',
      method: 'GET'
    }
  ];

  const results = [];

  for (const benchmark of quickBenchmarks) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running: ${benchmark.name} - ${benchmark.description}`);
    console.log('='.repeat(80));

    const result = await runBenchmark(tempDir, benchmark);
    results.push(result);
  }

  return { version, label, results };
}

/**
 * Run a single benchmark using autocannon (matches article methodology)
 */
function runBenchmark(tempDir, benchmark) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ...(benchmark.env || {}) };
    const server = spawn('node', [path.join(tempDir, benchmark.script)], {
      env,
      cwd: tempDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    server.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    // Wait for server to start
    setTimeout(() => {
      // Use autocannon (matching the article's methodology)
      const autocannonArgs = [
        'autocannon',
        '-c', '100',           // 100 connections
        '-d', '5',             // 5 second duration
        benchmark.url
      ];

      // Add POST-specific options
      if (benchmark.method === 'POST' && benchmark.bodyGenerator) {
        const body = benchmark.bodyGenerator();
        autocannonArgs.push(
          '-m', 'POST',
          '-H', 'Content-Type=application/json',
          '-b', body
        );
      }

      const autocannon = spawn('npx', autocannonArgs, {
        cwd: tempDir
      });

      let autocannonOutput = '';
      autocannon.stdout.on('data', (data) => {
        autocannonOutput += data.toString();
        process.stdout.write(data);
      });

      autocannon.on('close', (code) => {
        server.kill('SIGTERM');

        if (code !== 0) {
          reject(new Error(`autocannon exited with code ${code}`));
          return;
        }

        // Parse autocannon results
        const reqSecMatch = autocannonOutput.match(/Req\/Sec[^\d]+(\d+)/);
        const latencyMatch = autocannonOutput.match(/Latency[^\d]+(\d+)/);

        const result = {
          benchmark: benchmark.name,
          description: benchmark.description,
          requests_per_sec: reqSecMatch ? parseFloat(reqSecMatch[1]) : 0,
          latency: latencyMatch ? parseFloat(latencyMatch[1]) : 0,
          latency_unit: 'ms'
        };

        console.log(`Requests/sec: ${result.requests_per_sec.toFixed(2)}`);
        console.log(`Latency: ${result.latency}ms`);

        resolve(result);
      });
    }, 2000);
  });
}

/**
 * Main comparison function
 */
async function runComparison() {
  const express4Results = await runBenchmarksForVersion(EXPRESS_4_VERSION, 'Express 4');
  const express5Results = await runBenchmarksForVersion(EXPRESS_5_VERSION, 'Express 5');

  // Generate comparison report
  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(80));

  const comparison = [];

  express4Results.results.forEach((e4Result, index) => {
    const e5Result = express5Results.results[index];
    
    const reqSecDiff = ((e5Result.requests_per_sec - e4Result.requests_per_sec) / e4Result.requests_per_sec * 100);
    const latencyDiff = ((e5Result.latency - e4Result.latency) / e4Result.latency * 100);

    const item = {
      benchmark: e4Result.benchmark,
      description: e4Result.description,
      express_4: {
        requests_per_sec: e4Result.requests_per_sec.toFixed(2),
        latency: `${e4Result.latency}${e4Result.latency_unit}`
      },
      express_5: {
        requests_per_sec: e5Result.requests_per_sec.toFixed(2),
        latency: `${e5Result.latency}${e5Result.latency_unit}`
      },
      difference: {
        requests_per_sec: `${reqSecDiff > 0 ? '+' : ''}${reqSecDiff.toFixed(2)}%`,
        latency: `${latencyDiff > 0 ? '+' : ''}${latencyDiff.toFixed(2)}%`
      }
    };

    comparison.push(item);

    console.log(`\n${e4Result.description}:`);
    console.log(`  Express 4: ${e4Result.requests_per_sec.toFixed(2)} req/s, ${e4Result.latency}${e4Result.latency_unit}`);
    console.log(`  Express 5: ${e5Result.requests_per_sec.toFixed(2)} req/s, ${e5Result.latency}${e5Result.latency_unit}`);
    console.log(`  Difference: ${item.difference.requests_per_sec} req/s, ${item.difference.latency} latency`);
  });

  // Save results
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = path.join(resultsDir, `comparison_${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    cpu_model: os.cpus()[0]?.model || 'Unknown',
    express_4_version: EXPRESS_4_VERSION,
    express_5_version: EXPRESS_5_VERSION,
    comparison
  };

  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n\nComparison report saved to: ${filename}`);

  // Cleanup
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Run comparison
runComparison().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
