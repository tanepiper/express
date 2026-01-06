#!/usr/bin/env node
/**
 * Compare Express 4 vs Express 5 performance
 * This script installs both versions and runs benchmarks
 */

const { spawn, execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const EXPRESS_4_VERSION = '4.21.2'; // Latest Express 4
const EXPRESS_5_VERSION = '5.2.1'; // Current Express 5

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
    'hello-world.js',
    'middleware.js',
    'query-parsing.js',
    'routing.js',
    'json-response.js',
    'request-parsing.js',
    'config.js'
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

  // Run a subset of benchmarks (to save time)
  const quickBenchmarks = [
    {
      name: 'hello-world',
      script: 'hello-world.js',
      url: 'http://localhost:3333/',
      description: 'Basic Hello World'
    },
    {
      name: 'middleware-1',
      script: 'middleware.js',
      url: 'http://localhost:3333/?foo[bar]=baz',
      env: { MW: '1' },
      description: '1 middleware'
    },
    {
      name: 'middleware-10',
      script: 'middleware.js',
      url: 'http://localhost:3333/?foo[bar]=baz',
      env: { MW: '10' },
      description: '10 middleware'
    },
    {
      name: 'query-parsing',
      script: 'query-parsing.js',
      url: 'http://localhost:3333/?foo=bar&baz=qux&test[nested][deep]=value&array[]=1&array[]=2',
      description: 'Query parsing'
    },
    {
      name: 'json-response',
      script: 'json-response.js',
      url: 'http://localhost:3333/',
      description: 'JSON response'
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
 * Run a single benchmark
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
      const wrkArgs = [
        benchmark.url,
        '-d', '5',
        '-c', '100',
        '-t', '4',
        '--latency'
      ];

      const wrk = spawn('wrk', wrkArgs);

      let wrkOutput = '';
      wrk.stdout.on('data', (data) => {
        wrkOutput += data.toString();
        process.stdout.write(data);
      });

      wrk.on('close', (code) => {
        server.kill('SIGTERM');

        if (code !== 0) {
          reject(new Error(`wrk exited with code ${code}`));
          return;
        }

        // Parse results
        const reqSecMatch = wrkOutput.match(/Requests\/sec:\s+(\d+\.\d+)/);
        const latencyMatch = wrkOutput.match(/Latency\s+(\d+\.\d+)(\w+)/);

        const result = {
          benchmark: benchmark.name,
          description: benchmark.description,
          requests_per_sec: reqSecMatch ? parseFloat(reqSecMatch[1]) : 0,
          latency: latencyMatch ? parseFloat(latencyMatch[1]) : 0,
          latency_unit: latencyMatch ? latencyMatch[2] : 'ms'
        };

        console.log(`Requests/sec: ${result.requests_per_sec.toFixed(2)}`);
        console.log(`Latency: ${result.latency}${result.latency_unit}`);

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
