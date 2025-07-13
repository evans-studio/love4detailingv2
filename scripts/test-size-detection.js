const fetch = require('node-fetch')

async function testSizeDetection() {
  try {
    console.log('=== TESTING VEHICLE SIZE DETECTION ===')
    
    // Test 1: Known vehicle (should match)
    console.log('\n1. Testing known vehicle (BMW X5):')
    const response1 = await fetch('http://localhost:3000/api/vehicles/detect-size', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        make: 'BMW',
        model: 'X5',
        year: 2023
      })
    })
    
    const result1 = await response1.json()
    console.log('Status:', response1.status)
    console.log('Response:', result1)
    
    // Test 2: Unknown vehicle (should default to medium)
    console.log('\n2. Testing unknown vehicle (Test Brand):')
    const response2 = await fetch('http://localhost:3000/api/vehicles/detect-size', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        make: 'Test Brand',
        model: 'Unknown Model',
        year: 2023
      })
    })
    
    const result2 = await response2.json()
    console.log('Status:', response2.status)
    console.log('Response:', result2)
    
    // Test 3: Invalid request (missing make)
    console.log('\n3. Testing invalid request:')
    const response3 = await fetch('http://localhost:3000/api/vehicles/detect-size', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Test Model'
      })
    })
    
    const result3 = await response3.json()
    console.log('Status:', response3.status)
    console.log('Response:', result3)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testSizeDetection()