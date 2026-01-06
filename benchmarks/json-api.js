/**
 * JSON response benchmark
 * Tests JSON serialization performance
 */

const express = require('..');
const app = express();

// Sample data similar to real-world API responses
const sampleData = {
  id: 12345,
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    country: 'USA'
  },
  preferences: {
    theme: 'dark',
    language: 'en',
    notifications: true
  },
  tags: ['developer', 'nodejs', 'express'],
  lastLogin: new Date().toISOString(),
  isActive: true
};

app.get('/api/user', function(req, res) {
  res.json(sampleData);
});

app.listen(3333);
console.log('JSON API server listening on port 3333');
