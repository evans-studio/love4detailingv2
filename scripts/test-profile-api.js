const fetch = require('node-fetch')

async function testProfileAPI() {
  try {
    const response = await fetch('http://localhost:3002/api/auth/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('Error:', error)
  }
}

testProfileAPI()