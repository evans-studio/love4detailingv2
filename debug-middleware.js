#!/usr/bin/env node

/**
 * Debug middleware to test if it's being called
 */

const fetch = require('node-fetch');

async function testMiddleware() {
  console.log('Testing middleware...');
  
  const response = await fetch('http://localhost:3000/api/services', {
    headers: {
      'User-Agent': 'Debug-Test'
    }
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:');
  for (const [key, value] of response.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  const data = await response.json();
  console.log('Response data:', data);
}

testMiddleware().catch(console.error);