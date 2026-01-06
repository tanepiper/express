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

## Quick Start

### Original Benchmarks

To run the original middleware benchmarks:

```bash
cd benchmarks
npm install   # Install dependencies in main express directory first
make
```

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

### Express 4 vs Express 5 Comparison

**Main performance comparison tool** - Compares Express 4 and Express 5 performance:

```bash
cd benchmarks
node compare-versions.js
```

This will:
- Install both Express 4 (latest) and Express 5 (current) in temporary directories
- Run the same benchmarks on both versions
- Generate a comparison report showing performance differences
- Save results to `results/comparison_TIMESTAMP.json`

#### Benchmark Scenarios

The comparison tests:
1. **Hello World** - Basic "Hello World" response (minimal overhead test)
2. **1 Middleware** - Single middleware with query parsing
3. **10 Middleware** - 10 middleware stack with query parsing
4. **Query Parsing** - Complex query string parsing
5. **JSON Response** - JSON serialization of complex objects

## Performance Analysis

See [FINDINGS.md](FINDINGS.md) for detailed analysis of performance bottlenecks identified in Express 5:

**Key Findings:**
- Query string parsing (qs library is 6-7x slower than built-in parser)
- Object.create(null) overhead (10x slower than {})
- Request property lazy evaluation without caching
- Status code validation overhead (5x slower)

See [OPTIMIZATIONS.md](OPTIMIZATIONS.md) for implemented performance optimizations:

**Implemented Optimizations:**
- Request property caching (query, ip, ips, path, subdomains, host, hostname, protocol)
- Replaced Object.create(null) with {} in query getter
- Optimized status validation error messages
- Replaced deprecated trimRight() with trimEnd()

**Expected Impact:** 1-5% improvement for applications accessing properties multiple times

## Testing on Different Node.js Versions

Using nvm (Node Version Manager):

```bash
# Install Node.js 24 (if not already installed)
nvm install 24

# Test on Node 20
nvm use 20
cd benchmarks
node compare-versions.js

# Test on Node 24
nvm use 24
cd benchmarks
node compare-versions.js

# Compare results in the results/ directory
```

## Understanding Results

Results are saved in the `results/` directory:
- Comparison: `comparison_TIMESTAMP.json`

Each result includes:
- System specifications (CPU, memory, Node.js version)
- Benchmark configuration (connections, duration, threads)
- Metrics (requests/sec, latency, total requests, errors)
- Performance comparison between Express 4 and Express 5

### Key Metrics

- **Requests/sec**: Higher is better (throughput)
- **Latency**: Lower is better (response time)
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

### Quick single benchmark

```bash
./run 10 middleware.js 100
```

This runs the middleware benchmark with 10 middleware and 100 connections.

### Quick single benchmark

```bash
./run 10 middleware.js 100
```

This runs the middleware benchmark with 10 middleware and 100 connections.
