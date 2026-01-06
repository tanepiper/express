/**
 * JSON body parsing benchmark - ~50 KB JSON payload
 * Tests JSON parsing and request body handling
 */

const express = require('..');
const app = express();

// Enable JSON body parsing
app.use(express.json({ limit: '1mb' }));

app.post('/json', function(req, res) {
  // Echo back the received JSON
  res.json({
    received: true,
    bodySize: JSON.stringify(req.body).length
  });
});

app.listen(3333);
console.log('JSON body parsing server listening on port 3333');
