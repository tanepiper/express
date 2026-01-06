/**
 * Route parameters benchmark
 * Tests URL parameter parsing performance
 */

const express = require('..');
const app = express();

app.get('/users/:userId/posts/:postId', function(req, res) {
  const { userId, postId } = req.params;
  
  res.json({
    userId: userId,
    postId: postId,
    title: 'Sample Post',
    content: 'Lorem ipsum dolor sit amet',
    author: 'User ' + userId,
    createdAt: new Date().toISOString()
  });
});

app.listen(3333);
console.log('Route parameters server listening on port 3333');
