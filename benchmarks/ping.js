/**
 * Ping benchmark - simplest possible case
 * A single route returning a small response with no application-level logic
 */

const express = require('..');
const app = express();

app.get('/ping', function(req, res) {
  res.send('pong');
});

app.listen(3333);
console.log('Ping server listening on port 3333');
