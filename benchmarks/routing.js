/**
 * Routing benchmark - tests routing performance with multiple routes
 */

const express = require('..');
const app = express();

// Create 100 routes to test routing performance
for (let i = 0; i < 100; i++) {
  app.get(`/route${i}`, function(req, res) {
    res.send(`Route ${i}`);
  });
}

// The actual test route
app.get('/test', function(req, res) {
  res.send('Test route');
});

app.listen(3333);
console.log('Routing benchmark server listening on port 3333');
