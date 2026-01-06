/**
 * Query string parsing benchmark
 * Tests performance with various query parameter patterns
 */

const express = require('..');
const app = express();

app.get('/search', function(req, res) {
  // Access query parameters to ensure parsing happens
  const {
    q,
    page,
    limit,
    sort,
    filter
  } = req.query;
  
  res.json({
    query: q || '',
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sort: sort || 'relevance',
    filters: filter || [],
    total: 100
  });
});

app.listen(3333);
console.log('Query string server listening on port 3333');
