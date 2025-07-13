// Simple test to call the password setup API directly
const testEmail = 'test@example.com'
const testPassword = 'TestPassword123!'

console.log('🧪 Testing password setup API...')
console.log('📧 Email:', testEmail)
console.log('🔑 Password:', testPassword)

fetch('http://localhost:3001/api/auth/setup-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: testEmail,
    password: testPassword
  })
})
.then(response => {
  console.log('📊 Response status:', response.status)
  console.log('📊 Response ok:', response.ok)
  return response.json()
})
.then(data => {
  console.log('📊 Response data:', data)
})
.catch(error => {
  console.error('💥 Test error:', error)
})