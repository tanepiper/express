/**
 * Generate a ~50 KB JSON payload for POST benchmarks
 */

const generateLargeJSON = () => {
  const data = {
    timestamp: new Date().toISOString(),
    metadata: {
      version: '1.0',
      source: 'benchmark',
      user: 'test-user'
    },
    records: []
  };
  
  // Add enough records to reach ~50 KB
  for (let i = 0; i < 500; i++) {
    data.records.push({
      id: i,
      name: `Record ${i}`,
      email: `user${i}@example.com`,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      value: Math.random() * 1000,
      active: i % 2 === 0,
      tags: ['benchmark', 'test', 'data'],
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    });
  }
  
  return data;
};

const payload = generateLargeJSON();
const payloadStr = JSON.stringify(payload);
console.log(`Generated ${(payloadStr.length / 1024).toFixed(2)} KB JSON payload`);
console.log(payloadStr);
