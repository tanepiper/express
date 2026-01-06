#!/usr/bin/env node
/**
 * Express Performance Analysis Tool
 * Analyzes Express 5 codebase for potential performance bottlenecks
 */

const fs = require('node:fs');
const path = require('node:path');

console.log('\n' + '='.repeat(80));
console.log('EXPRESS 5 PERFORMANCE BOTTLENECK ANALYSIS');
console.log('='.repeat(80));

const libDir = path.join(__dirname, '..', 'lib');

// Areas to analyze
const analysisAreas = [
  {
    name: 'Query String Parsing',
    description: 'Analysis of query string parsing implementation',
    files: ['utils.js', 'request.js'],
    patterns: ['query', 'parse', 'qs.parse', 'querystring.parse']
  },
  {
    name: 'Request Property Access',
    description: 'Analysis of request property getters and lazy evaluation',
    files: ['request.js'],
    patterns: ['defineGetter', 'Object.defineProperty', '__defineGetter__']
  },
  {
    name: 'Response Methods',
    description: 'Analysis of response methods (send, json, etc.)',
    files: ['response.js'],
    patterns: ['res.send', 'res.json', 'res.status', 'Buffer', 'JSON.stringify']
  },
  {
    name: 'Middleware Stack',
    description: 'Analysis of middleware execution',
    files: ['application.js'],
    patterns: ['router', 'handle', 'next', 'middleware']
  },
  {
    name: 'Header Operations',
    description: 'Analysis of header reading and setting',
    files: ['request.js', 'response.js'],
    patterns: ['header', 'get(', 'set(', 'setHeader', 'getHeader']
  }
];

console.log('\n## ANALYSIS AREAS\n');

analysisAreas.forEach((area, index) => {
  console.log(`${index + 1}. ${area.name}`);
  console.log(`   ${area.description}`);
});

console.log('\n' + '='.repeat(80));
console.log('DETAILED CODE ANALYSIS');
console.log('='.repeat(80));

// Analyze each area
analysisAreas.forEach(area => {
  console.log(`\n### ${area.name}\n`);
  
  area.files.forEach(file => {
    const filePath = path.join(libDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   [SKIP] File not found: ${file}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    console.log(`   Analyzing: ${file}`);
    
    area.patterns.forEach(pattern => {
      const matches = [];
      lines.forEach((line, lineNum) => {
        if (line.toLowerCase().includes(pattern.toLowerCase())) {
          matches.push({ lineNum: lineNum + 1, line: line.trim() });
        }
      });

      if (matches.length > 0) {
        console.log(`\n   Pattern: "${pattern}" (${matches.length} matches)`);
        matches.slice(0, 5).forEach(match => {
          console.log(`     Line ${match.lineNum}: ${match.line.substring(0, 80)}`);
        });
        if (matches.length > 5) {
          console.log(`     ... and ${matches.length - 5} more`);
        }
      }
    });
    console.log('');
  });
});

// Specific bottleneck analysis
console.log('\n' + '='.repeat(80));
console.log('POTENTIAL BOTTLENECKS IDENTIFIED');
console.log('='.repeat(80));

const bottlenecks = [];

// Check for lazy property evaluation
const requestFile = fs.readFileSync(path.join(libDir, 'request.js'), 'utf8');
if (requestFile.includes('defineGetter')) {
  bottlenecks.push({
    category: 'Request Properties',
    issue: 'Lazy property evaluation with defineGetter',
    location: 'lib/request.js',
    impact: 'MEDIUM',
    description: 'Properties like req.query are lazily evaluated on each access. This can cause repeated parsing if accessed multiple times.',
    recommendation: 'Consider caching parsed values after first access.'
  });
}

// Check query parsing
const utilsFile = fs.readFileSync(path.join(libDir, 'utils.js'), 'utf8');
if (utilsFile.includes('qs.parse')) {
  bottlenecks.push({
    category: 'Query Parsing',
    issue: 'qs.parse with allowPrototypes option',
    location: 'lib/utils.js (parseExtendedQueryString)',
    impact: 'HIGH',
    description: 'The qs.parse function with allowPrototypes:true can be slower than simple parsing. This is used for extended query parsing.',
    recommendation: 'Profile qs.parse performance. Consider optimizing for common cases or using simpler parsing by default.'
  });
}

// Check for Object.create patterns
if (requestFile.includes('Object.create') || utilsFile.includes('Object.create')) {
  bottlenecks.push({
    category: 'Object Creation',
    issue: 'Object.create(null) usage',
    location: 'Multiple files',
    impact: 'LOW',
    description: 'Object.create(null) creates objects without prototype, which can be slightly slower than regular object literals.',
    recommendation: 'Verify if prototype-less objects are necessary for all use cases.'
  });
}

// Check response methods
const responseFile = fs.readFileSync(path.join(libDir, 'response.js'), 'utf8');
if (responseFile.includes('Buffer.from')) {
  bottlenecks.push({
    category: 'Response Handling',
    issue: 'Buffer.from conversions',
    location: 'lib/response.js',
    impact: 'MEDIUM',
    description: 'Multiple Buffer.from conversions can add overhead, especially in res.send and related methods.',
    recommendation: 'Minimize buffer conversions and reuse buffers where possible.'
  });
}

// Check for status code validation
if (responseFile.includes('Number.isInteger')) {
  bottlenecks.push({
    category: 'Response Status',
    issue: 'Status code validation on every call',
    location: 'lib/response.js (res.status)',
    impact: 'LOW-MEDIUM',
    description: 'Express 5 added strict status code validation with Number.isInteger and range checks. This is called on every res.status() call.',
    recommendation: 'Validation is important for correctness but adds overhead. Consider if validation can be optimized.'
  });
}

// Check header operations
const headerMatches = responseFile.match(/\.setHeader|\.getHeader/g);
if (headerMatches && headerMatches.length > 20) {
  bottlenecks.push({
    category: 'Header Operations',
    issue: 'Frequent header operations',
    location: 'lib/response.js',
    impact: 'MEDIUM',
    description: 'Multiple header get/set operations throughout response methods.',
    recommendation: 'Batch header operations where possible.'
  });
}

// Print bottlenecks
bottlenecks.forEach((bottleneck, index) => {
  console.log(`\n${index + 1}. ${bottleneck.category}: ${bottleneck.issue}`);
  console.log(`   Location: ${bottleneck.location}`);
  console.log(`   Impact: ${bottleneck.impact}`);
  console.log(`   Description: ${bottleneck.description}`);
  console.log(`   Recommendation: ${bottleneck.recommendation}`);
});

// Save analysis to file
const analysisResult = {
  timestamp: new Date().toISOString(),
  express_version: require('../package.json').version,
  analysis_areas: analysisAreas.map(a => a.name),
  bottlenecks: bottlenecks
};

const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const analysisFile = path.join(resultsDir, `analysis_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`);
fs.writeFileSync(analysisFile, JSON.stringify(analysisResult, null, 2));

console.log(`\n\nAnalysis saved to: ${analysisFile}`);

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));

console.log(`\nIdentified ${bottlenecks.length} potential bottlenecks.`);
console.log('Priority areas for optimization:');
console.log('  1. Query string parsing (qs.parse performance)');
console.log('  2. Request property lazy evaluation and caching');
console.log('  3. Buffer conversions in response methods');
console.log('  4. Status code validation overhead');
console.log('\nNext steps:');
console.log('  1. Run CPU profiling: node benchmarks/profile-cpu.js');
console.log('  2. Compare with Express 4 implementations');
console.log('  3. Create targeted micro-benchmarks for specific operations');
console.log('  4. Test on Node.js 24 for version-specific issues');
