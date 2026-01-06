/**
 * Large response payload benchmark - 100 KB response
 * Tests throughput when sending larger response bodies
 */

const express = require('..');
const app = express();

// Generate a 100 KB response payload
// Approximately 100,000 characters
const generatePayload = () => {
  const data = {
    id: 1,
    timestamp: new Date().toISOString(),
    items: []
  };
  
  // Add enough items to reach ~100 KB
  for (let i = 0; i < 1000; i++) {
    data.items.push({
      id: i,
      name: `Item ${i}`,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
      value: Math.random() * 1000,
      active: i % 2 === 0,
      tags: ['tag1', 'tag2', 'tag3']
    });
  }
  
  return data;
};

const payload = generatePayload();
const payloadSize = JSON.stringify(payload).length;
console.log(`Generated payload size: ${(payloadSize / 1024).toFixed(2)} KB`);

app.get('/payload', function(req, res) {
  res.json(payload);
});

app.listen(3333);
console.log('Large payload server listening on port 3333');
