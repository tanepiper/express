/**
 * Static file simulation benchmark
 * Tests sending pre-existing content (simulating static files)
 */

const express = require('..');
const app = express();

// Simulate static HTML content
const staticHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Express Benchmark</title>
  <meta charset="utf-8">
</head>
<body>
  <h1>Express Benchmark Page</h1>
  <p>This is a static HTML page for benchmarking.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
</body>
</html>`;

app.get('/page', function(req, res) {
  res.type('html').send(staticHTML);
});

app.listen(3333);
console.log('Static content server listening on port 3333');
