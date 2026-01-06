/**
 * Middleware depth benchmark - 50 synchronous middleware functions
 * Tests middleware stack overhead
 */

const express = require('..');
const app = express();

// Add 50 synchronous middleware functions
for (let i = 0; i < 50; i++) {
  app.use(function(req, res, next) {
    next();
  });
}

app.get('/ping', function(req, res) {
  res.send('pong');
});

app.listen(3333);
console.log('Middleware x50 server listening on port 3333');
