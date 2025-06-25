const { PrismaClient } = require('@prisma/client')

// Test script to directly test weather query functionality
async function testWeatherQuery() {
  console.log('🧪 Testing weather query: "what is the weather on field 14ha?"')
  console.log('='*60)
  
  try {
    // Make request to local API
    const response = await fetch('http://localhost:3000/api/test/chat-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'what is the weather on field 14ha?'
          }
        ],
        selectedDataSources: ['weather', 'johndeere', 'usda', 'eu-commission']
      })
    })
    
    const result = await response.json()
    
    console.log('📊 Response Status:', response.status)
    console.log('📊 Response Data:', JSON.stringify(result, null, 2))
    
    // Analyze the response
    if (result.error) {
      console.log('❌ ERROR:', result.error)
      return false
    }
    
    if (result.message && result.message.content) {
      console.log('✅ SUCCESS: Got response content')
      console.log('📝 Content length:', result.message.content.length)
      console.log('📝 Content preview:', result.message.content.substring(0, 200) + '...')
      
      // Check if it contains weather information
      const content = result.message.content.toLowerCase()
      const hasWeatherInfo = content.includes('temperature') || 
                           content.includes('weather') || 
                           content.includes('forecast') ||
                           content.includes('°c') ||
                           content.includes('°f')
      
      if (hasWeatherInfo) {
        console.log('🌤️ SUCCESS: Response contains weather information!')
        return true
      } else {
        console.log('⚠️ WARNING: Response does not contain weather information')
        return false
      }
    } else {
      console.log('❌ FAILURE: Empty response content')
      console.log('🔍 Full result:', JSON.stringify(result, null, 2))
      return false
    }
    
  } catch (error) {
    console.error('❌ ERROR making request:', error.message)
    return false
  }
}

// Run the test
testWeatherQuery().then(success => {
  if (success) {
    console.log('\n🎉 WEATHER QUERY TEST PASSED!')
  } else {
    console.log('\n💥 WEATHER QUERY TEST FAILED!')
    console.log('🔧 Next steps: Check server logs and implement fixes')
  }
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Test script failed:', error)
  process.exit(1)
}) 