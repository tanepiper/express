#!/usr/bin/env node
/**
 * Before/After comparison for caching optimizations
 * Compares performance with and without the request property caching
 */

const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

console.log('\n' + '='.repeat(80));
console.log('BEFORE/AFTER PERFORMANCE COMPARISON');
console.log('Measuring impact of request property caching optimizations');
console.log('='.repeat(80));

const scenarios = [
  {
    name: 'middleware-10',
    script: 'middleware.js',
    url: 'http://localhost:3333/?foo[bar]=baz',
    env: { MW: '10' },
    description: '10 middleware with query parsing'
  },
  {
    name: 'property-caching',
    script: 'property-caching.js',
    url: 'http://localhost:3333/?foo=bar&baz=qux',
    description: 'Multiple property accesses (query, ip, path)'
  },
  {
    name: 'query-parsing',
    script: 'query-parsing.js',
    url: 'http://localhost:3333/?foo=bar&baz=qux&test[nested][deep]=value&array[]=1&array[]=2',
    description: 'Complex query parsing with multiple accesses'
  }
];

/**
 * Run a benchmark and return metrics
 */
function runBenchmark(script, url, env = {}) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [path.join(__dirname, script)], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    setTimeout(() => {
      const wrk = spawn('wrk', [
        url,
        '-d', '10',
        '-c', '100',
        '-t', '4',
        '--latency'
      ]);

      let output = '';
      wrk.stdout.on('data', (data) => {
        output += data.toString();
      });

      wrk.on('close', () => {
        server.kill('SIGTERM');

        // Parse results
        const reqSecMatch = output.match(/Requests\/sec:\s+(\d+\.\d+)/);
        const latencyMatch = output.match(/Latency\s+(\d+\.\d+)(\w+)/);

        resolve({
          requestsPerSec: reqSecMatch ? parseFloat(reqSecMatch[1]) : 0,
          latency: latencyMatch ? parseFloat(latencyMatch[1]) : 0,
          latencyUnit: latencyMatch ? latencyMatch[2] : 'ms'
        });
      });
    }, 2000);
  });
}

/**
 * Revert to before optimization (without caching)
 */
function revertOptimizations() {
  console.log('\nReverting to before optimizations...');
  
  try {
    // Stash current changes
    execSync('git stash', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error('Failed to revert changes:', e.message);
    return false;
  }
}

/**
 * Restore optimizations
 */
function restoreOptimizations() {
  console.log('\nRestoring optimizations...');
  
  try {
    execSync('git stash pop', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error('Failed to restore changes:', e.message);
    return false;
  }
}

/**
 * Main comparison function
 */
async function runComparison() {
  const results = [];

  // Test WITH optimizations first (current state)
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1: Testing WITH optimizations (current code)');
  console.log('='.repeat(80));

  const withResults = {};
  for (const scenario of scenarios) {
    console.log(`\nRunning: ${scenario.description}`);
    const result = await runBenchmark(scenario.script, scenario.url, scenario.env);
    withResults[scenario.name] = result;
    console.log(`  Requests/sec: ${result.requestsPerSec.toFixed(2)}`);
    console.log(`  Latency: ${result.latency}${result.latencyUnit}`);
  }

  // Revert optimizations
  if (!revertOptimizations()) {
    console.error('\nCannot revert changes - comparison incomplete');
    return;
  }

  // Test WITHOUT optimizations
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2: Testing WITHOUT optimizations (before caching)');
  console.log('='.repeat(80));

  const withoutResults = {};
  for (const scenario of scenarios) {
    console.log(`\nRunning: ${scenario.description}`);
    const result = await runBenchmark(scenario.script, scenario.url, scenario.env);
    withoutResults[scenario.name] = result;
    console.log(`  Requests/sec: ${result.requestsPerSec.toFixed(2)}`);
    console.log(`  Latency: ${result.latency}${result.latencyUnit}`);
  }

  // Restore optimizations
  restoreOptimizations();

  // Generate comparison report
  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON RESULTS');
  console.log('='.repeat(80));

  scenarios.forEach(scenario => {
    const before = withoutResults[scenario.name];
    const after = withResults[scenario.name];
    
    const reqSecImprovement = ((after.requestsPerSec - before.requestsPerSec) / before.requestsPerSec * 100);
    const latencyImprovement = ((before.latency - after.latency) / before.latency * 100);

    const result = {
      scenario: scenario.name,
      description: scenario.description,
      before: {
        requestsPerSec: before.requestsPerSec.toFixed(2),
        latency: `${before.latency}${before.latencyUnit}`
      },
      after: {
        requestsPerSec: after.requestsPerSec.toFixed(2),
        latency: `${after.latency}${after.latencyUnit}`
      },
      improvement: {
        requestsPerSec: `${reqSecImprovement > 0 ? '+' : ''}${reqSecImprovement.toFixed(2)}%`,
        latency: `${latencyImprovement > 0 ? '+' : ''}${latencyImprovement.toFixed(2)}%`
      }
    };

    results.push(result);

    console.log(`\n${scenario.description}:`);
    console.log(`  BEFORE: ${before.requestsPerSec.toFixed(2)} req/s, ${before.latency}${before.latencyUnit}`);
    console.log(`  AFTER:  ${after.requestsPerSec.toFixed(2)} req/s, ${after.latency}${after.latencyUnit}`);
    console.log(`  IMPROVEMENT: ${result.improvement.requestsPerSec} req/s, ${result.improvement.latency} latency`);
    
    if (reqSecImprovement > 0) {
      console.log(`  ✓ Performance improved!`);
    } else {
      console.log(`  ✗ Performance degraded`);
    }
  });

  // Save results
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = path.join(resultsDir, `before-after_${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    optimization: 'Request property caching',
    results
  };

  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n\nResults saved to: ${filename}`);
}

// Run comparison
runComparison().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
