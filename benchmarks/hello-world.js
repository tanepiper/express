/**
 * Simple "Hello World" benchmark - minimal overhead test
 */

const express = require('..');
const app = express();

app.get('/', function(req, res) {
  res.send('Hello World');
});

app.listen(3333);
console.log('Hello World server listening on port 3333');
