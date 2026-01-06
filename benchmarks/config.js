/**
 * Benchmark configuration and system info collection
 */

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Get system specifications
 */
function getSystemSpecs() {
  const specs = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    cpu_model: os.cpus()[0]?.model || 'Unknown',
    total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
    free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
  };

  // Try to get more detailed CPU info on Linux
  if (process.platform === 'linux') {
    try {
      const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
      const modelMatch = cpuinfo.match(/model name\s*:\s*(.+)/);
      if (modelMatch) {
        specs.cpu_model = modelMatch[1].trim();
      }
    } catch (err) {
      // Ignore errors
    }
  }

  return specs;
}

/**
 * Save benchmark results to a file
 */
function saveBenchmarkResult(testName, result) {
  const resultsDir = path.join(__dirname, 'results');
  
  // Create results directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = path.join(resultsDir, `${testName}_${timestamp}.json`);

  const data = {
    test: testName,
    system: getSystemSpecs(),
    result: result
  };

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  
  // Also append to a summary file
  const summaryFile = path.join(resultsDir, 'benchmark-summary.jsonl');
  fs.appendFileSync(summaryFile, JSON.stringify(data) + '\n');

  return filename;
}

/**
 * Parse wrk output
 */
function parseWrkOutput(output) {
  const result = {
    latency: null,
    requests_per_sec: null,
    transfer_per_sec: null,
    total_requests: null,
    errors: {
      connect: 0,
      read: 0,
      write: 0,
      timeout: 0
    }
  };

  // Parse latency
  const latencyMatch = output.match(/Latency\s+(\d+\.\d+)(\w+)/);
  if (latencyMatch) {
    result.latency = parseFloat(latencyMatch[1]);
    result.latency_unit = latencyMatch[2];
  }

  // Parse requests per second
  const reqSecMatch = output.match(/Requests\/sec:\s+(\d+\.\d+)/);
  if (reqSecMatch) {
    result.requests_per_sec = parseFloat(reqSecMatch[1]);
  }

  // Parse transfer per second
  const transferMatch = output.match(/Transfer\/sec:\s+(\d+\.\d+)(\w+)/);
  if (transferMatch) {
    result.transfer_per_sec = parseFloat(transferMatch[1]);
    result.transfer_unit = transferMatch[2];
  }

  // Parse total requests
  const totalReqMatch = output.match(/(\d+) requests in/);
  if (totalReqMatch) {
    result.total_requests = parseInt(totalReqMatch[1]);
  }

  // Parse errors
  const errorsMatch = output.match(/Socket errors: connect (\d+), read (\d+), write (\d+), timeout (\d+)/);
  if (errorsMatch) {
    result.errors = {
      connect: parseInt(errorsMatch[1]),
      read: parseInt(errorsMatch[2]),
      write: parseInt(errorsMatch[3]),
      timeout: parseInt(errorsMatch[4])
    };
  }

  return result;
}

module.exports = {
  getSystemSpecs,
  saveBenchmarkResult,
  parseWrkOutput
};
