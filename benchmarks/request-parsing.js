/**
 * Request parsing benchmark - tests header and parameter parsing
 */

const express = require('..');
const app = express();

app.get('/:userId/:postId', function(req, res) {
  // Access various request properties to ensure parsing
  const {
    params,
    query,
    headers,
    method,
    url,
    path,
    protocol
  } = req;

  res.json({
    userId: params.userId,
    postId: params.postId,
    queryCount: Object.keys(query).length,
    headerCount: Object.keys(headers).length,
    method,
    path
  });
});

app.listen(3333);
console.log('Request parsing server listening on port 3333');
