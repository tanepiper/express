#!/usr/bin/env node
/**
 * CPU Profiling tool for Express benchmarks
 * Uses Node.js built-in profiler to identify performance bottlenecks
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const scenarios = [
  {
    name: 'hello-world',
    script: 'hello-world.js',
    url: 'http://localhost:3333/',
    description: 'Basic Hello World'
  },
  {
    name: 'middleware-10',
    script: 'middleware.js',
    url: 'http://localhost:3333/?foo[bar]=baz',
    env: { MW: '10' },
    description: '10 middleware with query parsing'
  },
  {
    name: 'query-parsing',
    script: 'query-parsing.js',
    url: 'http://localhost:3333/?foo=bar&baz=qux&test[nested][deep]=value&array[]=1&array[]=2&array[]=3',
    description: 'Complex query parsing'
  }
];

async function profileScenario(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Profiling: ${scenario.name} - ${scenario.description}`);
  console.log('='.repeat(80));

  const profDir = path.join(__dirname, 'profiles');
  if (!fs.existsSync(profDir)) {
    fs.mkdirSync(profDir, { recursive: true });
  }

  const profileFile = path.join(profDir, `${scenario.name}-${Date.now()}.cpuprofile`);

  return new Promise((resolve, reject) => {
    // Start server with CPU profiling
    const env = { ...process.env, ...(scenario.env || {}) };
    const server = spawn('node', [
      '--cpu-prof',
      '--cpu-prof-dir=' + profDir,
      '--cpu-prof-name=' + `${scenario.name}.cpuprofile`,
      path.join(__dirname, scenario.script)
    ], {
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
      // Run wrk for 10 seconds to generate load
      const wrk = spawn('wrk', [
        scenario.url,
        '-d', '10',
        '-c', '100',
        '-t', '4'
      ]);

      wrk.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      wrk.on('close', (code) => {
        // Stop server after a brief delay to ensure profile is written
        setTimeout(() => {
          server.kill('SIGTERM');
          
          console.log(`\nProfile saved to: ${profDir}`);
          console.log(`To analyze: Open Chrome DevTools -> More Tools -> JavaScript Profiler -> Load`);
          
          resolve();
        }, 1000);
      });
    }, 2000);
  });
}

async function runProfiling() {
  console.log('\n' + '='.repeat(80));
  console.log('EXPRESS CPU PROFILING');
  console.log('='.repeat(80));

  for (const scenario of scenarios) {
    try {
      await profileScenario(scenario);
    } catch (err) {
      console.error(`Error profiling ${scenario.name}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('PROFILING COMPLETE');
  console.log('='.repeat(80));
  console.log('\nProfile files saved in benchmarks/profiles/');
  console.log('To analyze:');
  console.log('1. Open Chrome DevTools (chrome://inspect)');
  console.log('2. Go to "More Tools" -> "JavaScript Profiler"');
  console.log('3. Click "Load" and select the .cpuprofile file');
  console.log('4. Analyze the flame graph to identify bottlenecks');
}

runProfiling().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
