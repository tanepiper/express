#!/usr/bin/env node
/**
 * Micro-benchmarks for specific Express operations
 * Tests individual components to identify exact bottlenecks
 */

const Benchmark = require('benchmark');
const suite = new Benchmark.Suite;

// Try to load qs module (Express 5 uses qs@6.14.1)
let qs, querystring;
try {
  qs = require('qs');
  querystring = require('node:querystring');
} catch (e) {
  console.error('Please run: npm install qs');
  process.exit(1);
}

console.log('\n' + '='.repeat(80));
console.log('EXPRESS MICRO-BENCHMARKS - Specific Operations');
console.log('='.repeat(80));
console.log(`Node.js: ${process.version}`);
console.log(`qs version: ${require('qs/package.json').version}`);

// Test data
const simpleQuery = 'foo=bar&baz=qux&name=value';
const nestedQuery = 'foo[bar]=baz&test[nested][deep]=value&array[]=1&array[]=2&array[]=3';
const complexQuery = 'user[name]=John&user[email]=john@example.com&tags[]=node&tags[]=express&tags[]=performance&filter[status]=active&filter[type]=test&page=1&limit=50';

console.log('\n## QUERY STRING PARSING BENCHMARKS\n');

// Benchmark 1: Simple query parsing
console.log('Test 1: Simple query string parsing');
console.log(`Query: ${simpleQuery}\n`);

const suite1 = new Benchmark.Suite;
suite1
  .add('querystring.parse (Node.js built-in)', function() {
    querystring.parse(simpleQuery);
  })
  .add('qs.parse (default)', function() {
    qs.parse(simpleQuery);
  })
  .add('qs.parse (allowPrototypes: true)', function() {
    qs.parse(simpleQuery, { allowPrototypes: true });
  })
  .on('cycle', function(event) {
    console.log('  ' + String(event.target));
  })
  .on('complete', function() {
    console.log('  Fastest: ' + this.filter('fastest').map('name'));
    const fastest = this.filter('fastest')[0];
    const slowest = this.filter('slowest')[0];
    const diff = ((fastest.hz - slowest.hz) / slowest.hz * 100).toFixed(2);
    console.log(`  Performance difference: ${diff}%\n`);
  })
  .run();

// Benchmark 2: Nested query parsing
console.log('Test 2: Nested query string parsing');
console.log(`Query: ${nestedQuery}\n`);

const suite2 = new Benchmark.Suite;
suite2
  .add('querystring.parse (Node.js built-in)', function() {
    querystring.parse(nestedQuery);
  })
  .add('qs.parse (default)', function() {
    qs.parse(nestedQuery);
  })
  .add('qs.parse (allowPrototypes: true)', function() {
    qs.parse(nestedQuery, { allowPrototypes: true });
  })
  .on('cycle', function(event) {
    console.log('  ' + String(event.target));
  })
  .on('complete', function() {
    console.log('  Fastest: ' + this.filter('fastest').map('name'));
    const fastest = this.filter('fastest')[0];
    const slowest = this.filter('slowest')[0];
    const diff = ((fastest.hz - slowest.hz) / slowest.hz * 100).toFixed(2);
    console.log(`  Performance difference: ${diff}%\n`);
  })
  .run();

// Benchmark 3: Complex query parsing
console.log('Test 3: Complex query string parsing');
console.log(`Query: ${complexQuery}\n`);

const suite3 = new Benchmark.Suite;
suite3
  .add('querystring.parse (Node.js built-in)', function() {
    querystring.parse(complexQuery);
  })
  .add('qs.parse (default)', function() {
    qs.parse(complexQuery);
  })
  .add('qs.parse (allowPrototypes: true)', function() {
    qs.parse(complexQuery, { allowPrototypes: true });
  })
  .on('cycle', function(event) {
    console.log('  ' + String(event.target));
  })
  .on('complete', function() {
    console.log('  Fastest: ' + this.filter('fastest').map('name'));
    const fastest = this.filter('fastest')[0];
    const slowest = this.filter('slowest')[0];
    const diff = ((fastest.hz - slowest.hz) / slowest.hz * 100).toFixed(2);
    console.log(`  Performance difference: ${diff}%\n`);
  })
  .run();

console.log('\n## BUFFER OPERATIONS BENCHMARKS\n');

const testString = 'Hello World! This is a test string for buffer conversion benchmarks.';
const testJson = JSON.stringify({ user: 'test', data: [1, 2, 3, 4, 5], nested: { value: 'test' } });

console.log('Test 4: String to Buffer conversions\n');

const suite4 = new Benchmark.Suite;
suite4
  .add('Buffer.from(string, "utf8")', function() {
    Buffer.from(testString, 'utf8');
  })
  .add('Buffer.from(string)', function() {
    Buffer.from(testString);
  })
  .add('Buffer.isBuffer check + Buffer.from', function() {
    if (!Buffer.isBuffer(testString)) {
      Buffer.from(testString);
    }
  })
  .on('cycle', function(event) {
    console.log('  ' + String(event.target));
  })
  .on('complete', function() {
    console.log('  Fastest: ' + this.filter('fastest').map('name') + '\n');
  })
  .run();

console.log('\n## OBJECT CREATION BENCHMARKS\n');

console.log('Test 5: Object creation patterns\n');

const suite5 = new Benchmark.Suite;
suite5
  .add('Object literal {}', function() {
    const obj = {};
  })
  .add('Object.create(null)', function() {
    const obj = Object.create(null);
  })
  .add('new Object()', function() {
    const obj = new Object();
  })
  .on('cycle', function(event) {
    console.log('  ' + String(event.target));
  })
  .on('complete', function() {
    console.log('  Fastest: ' + this.filter('fastest').map('name'));
    const fastest = this.filter('fastest')[0];
    const slowest = this.filter('slowest')[0];
    const diff = ((fastest.hz - slowest.hz) / slowest.hz * 100).toFixed(2);
    console.log(`  Performance difference: ${diff}%\n`);
  })
  .run();

console.log('\n## STATUS CODE VALIDATION BENCHMARKS\n');

console.log('Test 6: Status code validation (Express 5 feature)\n');

function validateStatusOld(code) {
  // Express 4 style - minimal validation
  return code;
}

function validateStatusNew(code) {
  // Express 5 style - strict validation
  if (!Number.isInteger(code)) {
    throw new TypeError(`Invalid status code: ${JSON.stringify(code)}. Status code must be an integer.`);
  }
  if (code < 100 || code > 999) {
    throw new RangeError(`Invalid status code: ${JSON.stringify(code)}. Status code must be greater than 99 and less than 1000.`);
  }
  return code;
}

const suite6 = new Benchmark.Suite;
suite6
  .add('No validation', function() {
    validateStatusOld(200);
  })
  .add('Express 5 validation', function() {
    validateStatusNew(200);
  })
  .on('cycle', function(event) {
    console.log('  ' + String(event.target));
  })
  .on('complete', function() {
    console.log('  Fastest: ' + this.filter('fastest').map('name'));
    const fastest = this.filter('fastest')[0];
    const slowest = this.filter('slowest')[0];
    const diff = ((fastest.hz - slowest.hz) / slowest.hz * 100).toFixed(2);
    console.log(`  Performance difference: ${diff}%\n`);
  })
  .run();

console.log('\n## JSON OPERATIONS BENCHMARKS\n');

const testObject = {
  id: 123,
  name: 'Test User',
  email: 'test@example.com',
  profile: {
    bio: 'Test bio',
    location: 'Test City'
  },
  posts: Array.from({ length: 10 }, (_, i) => ({ id: i, title: `Post ${i}` }))
};

console.log('Test 7: JSON stringification\n');

const suite7 = new Benchmark.Suite;
suite7
  .add('JSON.stringify', function() {
    JSON.stringify(testObject);
  })
  .add('JSON.stringify with replacer', function() {
    JSON.stringify(testObject, null, 0);
  })
  .add('JSON.stringify with spaces', function() {
    JSON.stringify(testObject, null, 2);
  })
  .on('cycle', function(event) {
    console.log('  ' + String(event.target));
  })
  .on('complete', function() {
    console.log('  Fastest: ' + this.filter('fastest').map('name') + '\n');
  })
  .run();

console.log('\n' + '='.repeat(80));
console.log('MICRO-BENCHMARKS COMPLETE');
console.log('='.repeat(80));
console.log('\nKey Findings:');
console.log('- Compare query parsing performance between methods');
console.log('- Identify overhead from Express 5 features (validation, etc.)');
console.log('- Measure impact of object creation patterns');
console.log('- Quantify buffer conversion overhead');
