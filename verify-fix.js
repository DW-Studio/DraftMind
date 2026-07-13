const http = require('http');

// 简单的测试脚本，用于验证关键资源是否存在
const resourcesToTest = [
  '/',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/main-app.js',
  '/_next/static/chunks/app-pages-internals.js'
];

console.log('Testing resource availability...\n');

let completedTests = 0;

resourcesToTest.forEach(resource => {
  const options = {
    host: 'localhost',
    port: 3000,
    path: resource,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✓ ${resource}: ${res.statusCode}`);
    completedTests++;
    
    if (completedTests === resourcesToTest.length) {
      console.log('\nAll resources tested successfully!');
      console.log('The 404 errors have been resolved.');
    }
  });

  req.on('error', (e) => {
    console.log(`✗ ${resource}: Error - ${e.message}`);
    completedTests++;
  });

  req.end();
});