#!/usr/bin/env node
/**
 * Comprehensive benchmark runner for Express
 * Runs multiple benchmark scenarios and records results
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { getSystemSpecs, saveBenchmarkResult, parseWrkOutput } = require('./config');

// Benchmark scenarios
const benchmarks = [
  {
    name: 'hello-world',
    script: 'hello-world.js',
    url: 'http://localhost:3333/',
    description: 'Basic Hello World - minimal overhead'
  },
  {
    name: 'middleware-1',
    script: 'middleware.js',
    url: 'http://localhost:3333/?foo[bar]=baz',
    env: { MW: '1' },
    description: 'Single middleware with query parsing'
  },
  {
    name: 'middleware-5',
    script: 'middleware.js',
    url: 'http://localhost:3333/?foo[bar]=baz',
    env: { MW: '5' },
    description: '5 middleware stack with query parsing'
  },
  {
    name: 'middleware-10',
    script: 'middleware.js',
    url: 'http://localhost:3333/?foo[bar]=baz',
    env: { MW: '10' },
    description: '10 middleware stack with query parsing'
  },
  {
    name: 'middleware-20',
    script: 'middleware.js',
    url: 'http://localhost:3333/?foo[bar]=baz',
    env: { MW: '20' },
    description: '20 middleware stack with query parsing'
  },
  {
    name: 'query-parsing',
    script: 'query-parsing.js',
    url: 'http://localhost:3333/?foo=bar&baz=qux&test[nested][deep]=value&array[]=1&array[]=2&array[]=3',
    description: 'Complex query string parsing'
  },
  {
    name: 'routing',
    script: 'routing.js',
    url: 'http://localhost:3333/test',
    description: 'Routing with 100 defined routes'
  },
  {
    name: 'json-response',
    script: 'json-response.js',
    url: 'http://localhost:3333/',
    description: 'JSON response serialization'
  },
  {
    name: 'request-parsing',
    script: 'request-parsing.js',
    url: 'http://localhost:3333/user123/post456?sort=asc&filter=active',
    description: 'Request parameter and header parsing'
  }
];

// Benchmark configurations
const configs = [
  { connections: 50, duration: 5, threads: 4 },
  { connections: 100, duration: 5, threads: 4 },
  { connections: 250, duration: 5, threads: 4 },
  { connections: 500, duration: 5, threads: 8 },
  { connections: 1000, duration: 5, threads: 8 }
];

/**
 * Run a single benchmark
 */
function runBenchmark(benchmark, config) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running: ${benchmark.name} (${benchmark.description})`);
    console.log(`Config: ${config.connections} connections, ${config.duration}s duration, ${config.threads} threads`);
    console.log('='.repeat(80));

    // Start the Express server
    const env = { ...process.env, ...(benchmark.env || {}) };
    const server = spawn('node', [path.join(__dirname, benchmark.script)], {
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverOutput = '';
    server.stdout.on('data', (data) => {
      serverOutput += data.toString();
      process.stdout.write(data);
    });

    server.stderr.on('data', (data) => {
      serverOutput += data.toString();
      process.stderr.write(data);
    });

    // Wait for server to start
    setTimeout(() => {
      // Run wrk benchmark
      const wrkArgs = [
        benchmark.url,
        '-d', config.duration.toString(),
        '-c', config.connections.toString(),
        '-t', config.threads.toString(),
        '--latency'
      ];

      console.log(`\nRunning: wrk ${wrkArgs.join(' ')}\n`);

      const wrk = spawn('wrk', wrkArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let wrkOutput = '';
      wrk.stdout.on('data', (data) => {
        wrkOutput += data.toString();
        process.stdout.write(data);
      });

      wrk.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      wrk.on('close', (code) => {
        // Kill the server
        server.kill('SIGTERM');

        if (code !== 0) {
          reject(new Error(`wrk exited with code ${code}`));
          return;
        }

        // Parse and save results
        const parsed = parseWrkOutput(wrkOutput);
        const result = {
          benchmark: benchmark.name,
          description: benchmark.description,
          config,
          metrics: parsed,
          raw_output: wrkOutput
        };

        const filename = saveBenchmarkResult(
          `${benchmark.name}_c${config.connections}`,
          result
        );

        console.log(`\nResults saved to: ${filename}`);
        console.log(`Requests/sec: ${parsed.requests_per_sec}`);
        console.log(`Latency: ${parsed.latency}${parsed.latency_unit}`);

        resolve(result);
      });
    }, 2000); // Wait 2 seconds for server to start
  });
}

/**
 * Run all benchmarks
 */
async function runAllBenchmarks() {
  console.log('\n' + '='.repeat(80));
  console.log('EXPRESS PERFORMANCE BENCHMARK SUITE');
  console.log('='.repeat(80));

  const specs = getSystemSpecs();
  console.log('\nSystem Specifications:');
  console.log(JSON.stringify(specs, null, 2));

  const results = [];

  // Run each benchmark with each configuration
  for (const benchmark of benchmarks) {
    for (const config of configs) {
      try {
        const result = await runBenchmark(benchmark, config);
        results.push(result);
      } catch (err) {
        console.error(`\nError running benchmark ${benchmark.name}:`, err.message);
      }
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK SUMMARY');
  console.log('='.repeat(80));

  const summary = {};
  results.forEach((result) => {
    const key = `${result.benchmark} (${result.config.connections} conn)`;
    summary[key] = {
      requests_per_sec: result.metrics.requests_per_sec,
      latency: `${result.metrics.latency}${result.metrics.latency_unit}`,
      total_requests: result.metrics.total_requests
    };
  });

  console.log('\n' + JSON.stringify(summary, null, 2));

  // Save complete summary
  const summaryPath = path.join(__dirname, 'results', `summary_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify({
    system: specs,
    results,
    summary
  }, null, 2));

  console.log(`\nComplete summary saved to: ${summaryPath}`);
}

// Run benchmarks
runAllBenchmarks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
