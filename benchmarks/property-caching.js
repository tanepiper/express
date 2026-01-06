/**
 * Benchmark to test the impact of request property caching
 */

const express = require('..');
const app = express();

// Middleware that accesses req.query multiple times (common pattern)
app.use(function(req, res, next) {
  // First access
  const query1 = req.query;
  
  // Simulate some logic that might access query again
  if (req.query.foo) {
    // Second access
    const bar = req.query.bar;
  }
  
  // Third access for response
  const allQuery = req.query;
  
  next();
});

// Middleware that accesses other properties multiple times
app.use(function(req, res, next) {
  // Access IP multiple times (common for logging/security)
  const ip1 = req.ip;
  const ip2 = req.ip;
  
  // Access path multiple times
  const path1 = req.path;
  const path2 = req.path;
  
  next();
});

app.get('/', function(req, res) {
  // Access properties in handler too
  res.json({
    query: req.query,
    ip: req.ip,
    path: req.path,
    subdomains: req.subdomains
  });
});

app.listen(3333);
console.log('Property caching benchmark server listening on port 3333');
