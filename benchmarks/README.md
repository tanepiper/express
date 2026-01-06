# Express Benchmarks

## Installation

You will need to install [wrk](https://github.com/wg/wrk/blob/master/INSTALL) in order to run the benchmarks.

On Ubuntu/Debian:
```bash
sudo apt-get install wrk
```

On macOS:
```bash
brew install wrk
```

## Running

### Quick Start - Original Benchmarks

To run the original benchmarks, first install the dependencies `npm i`, then run `make`

The output will look something like this:

```
  50 connections
  1 middleware
 7.15ms
 6784.01

 [...redacted...]

  1000 connections
  10 middleware
 139.21ms
 6155.19

```

### Comprehensive Benchmark Suite

Run all benchmarks with detailed metrics and save results:

```bash
cd benchmarks
npm install   # Install dependencies in main express directory first
node run-all.js
```

This will:
- Run multiple benchmark scenarios (hello-world, middleware, routing, JSON response, etc.)
- Test with various connection counts (50, 100, 250, 500, 1000)
- Save results to `results/` directory with timestamps
- Generate a summary report

### Express 4 vs Express 5 Comparison

To compare Express 4 and Express 5 performance:

```bash
cd benchmarks
node compare-versions.js
```

This will:
- Install both Express 4 (latest) and Express 5 (current) in temporary directories
- Run the same benchmarks on both versions
- Generate a comparison report showing performance differences
- Save results to `results/comparison_TIMESTAMP.json`

## Benchmark Scenarios

The suite includes the following benchmark scenarios:

1. **hello-world** - Basic "Hello World" response (minimal overhead test)
2. **middleware-N** - Middleware stack with N middleware functions (1, 5, 10, 20)
3. **query-parsing** - Complex query string parsing with nested objects and arrays
4. **routing** - Routing performance with 100 defined routes
5. **json-response** - JSON serialization of complex objects
6. **request-parsing** - Request parameter and header parsing

## Understanding Results

Results are saved in the `results/` directory:
- Individual benchmark results: `{benchmark-name}_{connections}_TIMESTAMP.json`
- Summary: `summary_TIMESTAMP.json`
- Comparison: `comparison_TIMESTAMP.json`
- All results appended to: `benchmark-summary.jsonl` (JSON Lines format)

Each result includes:
- System specifications (CPU, memory, Node.js version)
- Benchmark configuration (connections, duration, threads)
- Metrics (requests/sec, latency, total requests, errors)
- Raw wrk output

## Performance Monitoring

To track performance over time:

1. Run benchmarks before and after changes
2. Compare results files in `results/` directory
3. Focus on these key metrics:
   - **Requests/sec**: Higher is better
   - **Latency**: Lower is better
   - **Total requests**: Should increase with better performance

## Tips

### Include Node.js version in output

```bash
make && node -v
```

### Save the results to a file

```bash
make > results.log
```

### Run benchmarks on different Node.js versions

```bash
# Using nvm
nvm use 20 && node compare-versions.js
nvm use 24 && node compare-versions.js
```

### Quick single benchmark

```bash
./run 10 middleware.js 100
```

This runs the middleware benchmark with 10 middleware and 100 connections.
