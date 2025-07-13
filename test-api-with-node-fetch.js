// Test the services API using node-fetch
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🔍 Testing services API...')
    
    const response = await fetch('http://localhost:3000/api/services')
    const data = await response.json()
    
    console.log('Status:', response.status)
    console.log('Data:', JSON.stringify(data, null, 2))
    
    if (data.success && data.data && data.data.length > 0) {
      console.log('\n✅ API is working! Found services:')
      data.data.forEach((service, index) => {
        console.log(`${index + 1}. ${service.name} - ${service.pricing_summary.formatted_range}`)
      })
    } else {
      console.log('❌ No services found or API error')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testAPI()