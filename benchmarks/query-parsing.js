/**
 * Query string parsing benchmark - tests qs parsing performance
 */

const express = require('..');
const app = express();

app.get('/', function(req, res) {
  // Access query parameters to ensure parsing happens
  const query = req.query;
  res.json({ success: true, queryParams: Object.keys(query).length });
});

app.listen(3333);
console.log('Query parsing server listening on port 3333');
