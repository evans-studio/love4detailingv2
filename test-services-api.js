// Quick test to check services API and database content
async function testServicesAPI() {
  try {
    console.log('🔍 Testing services API endpoint...')
    
    // Test the public services API
    const response = await fetch('http://localhost:3001/api/services')
    const result = await response.json()
    
    console.log('📡 API Response Status:', response.status)
    console.log('📡 API Response Data:', JSON.stringify(result, null, 2))
    
    if (result.success && result.data) {
      console.log(`✅ Found ${result.data.length} services`)
      result.data.forEach((service, index) => {
        console.log(`\n🎯 Service ${index + 1}:`)
        console.log(`   Name: ${service.name}`)
        console.log(`   Active: ${service.is_active}`)
        console.log(`   Price Range: ${service.pricing_summary.formatted_range}`)
        console.log(`   Features: ${service.features.length}`)
      })
    } else {
      console.log('❌ No services found or API error')
    }
    
  } catch (error) {
    console.error('❌ Error testing services API:', error)
  }
}

// Run the test
testServicesAPI()