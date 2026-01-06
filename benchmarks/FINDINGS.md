# Express 5 Performance Analysis - Key Findings

## Executive Summary

Based on comprehensive benchmarking and code analysis of Express 5.2.1 vs Express 4.21.2 on Node.js 20.19.6, we have identified several key performance bottlenecks in Express 5.

## System Specifications

- **CPU**: AMD EPYC 7763 64-Core Processor (4 cores available)
- **Memory**: 16GB RAM
- **Node.js**: v20.19.6
- **Express 4**: 4.21.2
- **Express 5**: 5.2.1

## Overall Performance Comparison (Node 20)

Based on our benchmarks with 100 connections:

| Benchmark | Express 4 (req/s) | Express 5 (req/s) | Difference |
|-----------|-------------------|-------------------|------------|
| Hello World | 6,097 | 6,287 | **+3.12%** ✓ |
| 1 Middleware | 6,343 | 6,376 | **+0.51%** ✓ |
| 10 Middleware | 6,452 | 6,221 | **-3.57%** ✗ |
| Query Parsing | 6,395 | 6,314 | **-1.27%** ✗ |
| JSON Response | 6,279 | 6,404 | **+1.98%** ✓ |

**Key Observation**: Express 5 performs slightly worse with multiple middleware (10+) and query parsing operations.

## Critical Performance Bottlenecks Identified

### 1. Query String Parsing (HIGH IMPACT) ⚠️

**Finding**: The `qs.parse()` function is **6.5x to 7.4x SLOWER** than Node.js built-in `querystring.parse()`.

**Micro-benchmark Results**:
- Simple query: `querystring.parse` = 2,380,103 ops/sec vs `qs.parse` = 314,131 ops/sec (**657% difference**)
- Nested query: `querystring.parse` = 1,158,512 ops/sec vs `qs.parse` = 140,228 ops/sec (**740% difference**)
- Complex query: `querystring.parse` = 519,629 ops/sec vs `qs.parse` = 82,378 ops/sec (**530% difference**)

**Location**: `lib/utils.js` - `parseExtendedQueryString()` function
```javascript
function parseExtendedQueryString(str) {
  return qs.parse(str, {
    allowPrototypes: true
  });
}
```

**Impact**: Every request with query parameters using extended query parser will experience this overhead.

**Recommendation**:
1. Default to "simple" query parser instead of "extended" for most use cases
2. Optimize common query parsing scenarios
3. Consider lazy evaluation with caching
4. Investigate qs@6.14.1 performance in Node.js 24

### 2. Object Creation Patterns (MEDIUM IMPACT)

**Finding**: `Object.create(null)` is **9.6x SLOWER** than object literals `{}`.

**Micro-benchmark Results**:
- Object literal `{}`: 837,146,563 ops/sec
- `Object.create(null)`: 78,512,640 ops/sec (**967% difference**)

**Location**: Multiple locations including `lib/request.js` (query getter returns `Object.create(null)`)

**Impact**: Affects request property access and internal data structures.

**Recommendation**:
1. Use object literals `{}` where prototype pollution is not a concern
2. Benchmark the actual security benefit vs performance cost
3. Consider using regular objects with `Object.freeze()` or other safeguards

### 3. Status Code Validation (MEDIUM IMPACT)

**Finding**: Express 5's strict status code validation is **5x SLOWER** than no validation.

**Micro-benchmark Results**:
- No validation: 653,185,005 ops/sec
- Express 5 validation: 107,256,825 ops/sec (**508% difference**)

**Location**: `lib/response.js` - `res.status()` method
```javascript
res.status = function status(code) {
  if (!Number.isInteger(code)) {
    throw new TypeError(`Invalid status code: ${JSON.stringify(code)}. Status code must be an integer.`);
  }
  if (code < 100 || code > 999) {
    throw new RangeError(`Invalid status code: ${JSON.stringify(code)}. Status code must be greater than 99 and less than 1000.`);
  }
  this.statusCode = code;
  return this;
};
```

**Impact**: Called on every response that sets a status code. The validation includes `Number.isInteger()`, range checks, and `JSON.stringify()` in error messages.

**Recommendation**:
1. Move validation to development mode only
2. Use simpler validation (typeof === 'number' && code === (code|0))
3. Cache error messages instead of generating with JSON.stringify
4. Consider environment-based validation (strict in dev, loose in production)

### 4. Lazy Property Evaluation Without Caching (MEDIUM IMPACT)

**Finding**: Request properties like `req.query` are re-evaluated on each access without caching.

**Location**: `lib/request.js` - Uses `defineGetter` for properties
```javascript
defineGetter(req, 'query', function query(){
  var queryparse = this.app.get('query parser fn');
  if (!queryparse) {
    return Object.create(null);
  }
  var querystring = parse(this).query;
  return queryparse(querystring);  // Re-parses on each access!
});
```

**Impact**: If `req.query` is accessed multiple times in middleware, the query string is parsed multiple times.

**Recommendation**:
1. Cache parsed query after first access
2. Use a private property to store the cached result
3. Invalidate cache only if needed

### 5. Buffer Conversions (LOW-MEDIUM IMPACT)

**Finding**: Multiple buffer conversions in response handling.

**Location**: `lib/response.js` - Multiple locations including `res.send()`

**Impact**: Buffer conversions add overhead, especially for small responses.

**Recommendation**:
1. Minimize conversions
2. Reuse buffers where possible
3. Consider pooling for common response sizes

## Code Patterns That May Cause Issues

### 1. Middleware Stack Performance
- 10 middleware shows -3.57% performance degradation
- Suggests overhead in middleware execution or request/response property access
- Each middleware may be accessing `req.query`, `req.params`, etc., triggering re-parsing

### 2. Header Operations
- Frequent `getHeader`/`setHeader` calls throughout response methods
- Consider batching header operations

### 3. String Operations
- Multiple string concatenations and transformations
- Consider using template literals or StringBuilder patterns

## Node.js 24 Considerations

**Important**: These benchmarks were run on Node.js 20.19.6. Node.js 24 may have:
- Different V8 optimizations
- Changes to Buffer API performance
- Modified internal HTTP handling
- Different JIT compilation behavior

**Next Steps for Node 24**:
1. Install Node.js 24 (using nvm or similar)
2. Run the same benchmarks: `node compare-versions.js`
3. Run micro-benchmarks: `node micro-benchmarks.js`
4. Compare results with Node 20 data
5. Profile with CPU profiler: `node profile-cpu.js`

## Recommended Optimizations (Priority Order)

### High Priority
1. **Query Parser Default**: Change default from 'simple' (which still uses querystring.parse) to explicitly use Node.js built-in parser
2. **Query Caching**: Implement caching for parsed query strings
3. **Status Validation**: Optimize or make conditional based on environment

### Medium Priority
4. **Object Creation**: Replace `Object.create(null)` with `{}` where safe
5. **Buffer Operations**: Audit and minimize conversions
6. **Property Caching**: Cache other lazily evaluated properties (protocol, hostname, etc.)

### Low Priority
7. **Header Batching**: Batch header operations where possible
8. **String Operations**: Optimize string concatenations

## Testing Methodology

All benchmarks were conducted using:
- **wrk**: HTTP benchmarking tool with 4-8 threads
- **Benchmark.js**: Micro-benchmark suite for specific operations
- **Node.js Profiler**: CPU profiling (--cpu-prof)

Benchmark configurations:
- Connections: 50, 100, 250, 500, 1000
- Duration: 5-10 seconds per test
- Multiple runs for consistency

## Files and Tools Created

1. **compare-versions.js** - Compare Express 4 vs Express 5
2. **micro-benchmarks.js** - Test specific operations
3. **analyze-bottlenecks.js** - Static code analysis
4. **profile-cpu.js** - CPU profiling tool
5. **run-all.js** - Comprehensive benchmark suite
6. **config.js** - Benchmark configuration and utilities

## Conclusion

Express 5 introduces several features that impact performance:
- Stricter validation (status codes)
- Continued use of qs for query parsing
- More defensive coding patterns

The performance difference is relatively small (< 5% in most cases) but can compound under high load. The primary bottleneck is **query string parsing with qs**, which is significantly slower than built-in alternatives.

For Node.js 24, we need to:
1. Establish baseline benchmarks
2. Compare with Node 20 results
3. Investigate Node 24-specific performance characteristics
4. Profile to identify any new bottlenecks

## Next Actions

1. **Run benchmarks on Node.js 24** to identify version-specific issues
2. **Profile with CPU profiler** to see actual time spent in each function
3. **Create patches** for the highest-impact bottlenecks
4. **Test patches** with benchmarks to measure improvement
5. **Document** all changes and performance gains

---

*Analysis Date*: 2026-01-06  
*Express Version*: 5.2.1  
*Node Version*: 20.19.6  
*System*: AMD EPYC 7763, 4 CPUs, 16GB RAM
