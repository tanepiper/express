/**
 * JSON response benchmark - tests JSON serialization performance
 */

const express = require('..');
const app = express();

// Create a sample complex object
const sampleData = {
  id: 12345,
  name: 'Test User',
  email: 'test@example.com',
  profile: {
    bio: 'This is a test user profile',
    location: 'Test City',
    website: 'https://example.com'
  },
  posts: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Post ${i + 1}`,
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    tags: ['test', 'benchmark', 'express'],
    created_at: new Date().toISOString()
  }))
};

app.get('/', function(req, res) {
  res.json(sampleData);
});

app.listen(3333);
console.log('JSON response server listening on port 3333');
