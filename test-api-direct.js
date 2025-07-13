const fetch = require('node-fetch');

async function testApiDirect() {
  try {
    console.log('🔍 Testing services API directly...')
    
    // Add a timestamp to bypass any caching
    const timestamp = Date.now()
    const response = await fetch(`http://localhost:3000/api/services?t=${timestamp}`)
    const result = await response.json()
    
    console.log('📡 Direct API Response Status:', response.status)
    console.log('📡 Direct API Response:', JSON.stringify(result, null, 2))
    
    if (result.success && result.data) {
      console.log(`\n✅ Found ${result.data.length} services:`)
      result.data.forEach((service, index) => {
        console.log(`${index + 1}. ${service.name} - ${service.pricing_summary.formatted_range}`)
      })
    } else {
      console.log('❌ API Error or no services')
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message)
  }
}

testApiDirect()