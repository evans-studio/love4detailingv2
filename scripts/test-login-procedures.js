#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] });

// Test direct procedure calls
async function testProcedures() {
  console.log('🧪 Testing authentication procedure fixes...');
  
  try {
    // Test handleUserLogin directly
    console.log('\n1. Testing handleUserLogin procedure...');
    
    const testUserId = '12345678-1234-1234-1234-123456789012'; // Admin user from seed
    const testEmail = 'admin@love4detailing.com';
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        email: testEmail
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Login API working!');
      console.log('Response:', result);
    } else {
      console.error('❌ Login API failed:', result);
      console.error('Status:', response.status);
    }
    
    // Test session validation
    console.log('\n2. Testing session validation...');
    
    const sessionResponse = await fetch(`http://localhost:3000/api/auth/session?userId=${testUserId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const sessionResult = await sessionResponse.json();
    
    if (sessionResponse.ok) {
      console.log('✅ Session validation working!');
      console.log('Session result:', sessionResult);
    } else {
      console.error('❌ Session validation failed:', sessionResult);
      console.error('Status:', sessionResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testProcedures();