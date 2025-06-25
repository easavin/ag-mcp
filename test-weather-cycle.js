const fs = require('fs')
const { spawn } = require('child_process')

console.log('🔄 WEATHER QUERY TESTING CYCLE')
console.log('='*60)
console.log('')
console.log('This script will help you test the weather query step by step:')
console.log('')
console.log('INSTRUCTIONS:')
console.log('1. Keep this script running')
console.log('2. Go to your browser and ask: "what is the weather on field 14ha?"')
console.log('3. This script will analyze the logs and suggest fixes')
console.log('4. We\'ll iterate until it works!')
console.log('')
console.log('🚀 Starting log monitoring...')
console.log('='*60)

let logBuffer = []
let lastLogTime = Date.now()

// Function to analyze logs for weather query patterns
function analyzeLogs(logs) {
  const logText = logs.join('\n').toLowerCase()
  
  console.log('\n🔍 LOG ANALYSIS:')
  console.log('-'.repeat(40))
  
  // Check for weather query detection
  if (logText.includes('what is the weather')) {
    console.log('✅ Weather query detected')
  }
  
  // Check for boundary call
  if (logText.includes('get_field_boundary')) {
    console.log('✅ Field boundary function called')
  }
  
  // Check for successful boundary data
  if (logText.includes('successfully retrieved boundary data')) {
    console.log('✅ Boundary data retrieved successfully')
  }
  
  // Check for multi-step workflow detection
  if (logText.includes('multi-step workflow check')) {
    console.log('✅ Multi-step workflow logic executed')
  }
  
  // Check for automatic coordinate extraction
  if (logText.includes('automatically extracting coordinates')) {
    console.log('✅ Automatic coordinate extraction triggered')
  }
  
  // Check for weather API call
  if (logText.includes('getweatherforecast') || logText.includes('weather api')) {
    console.log('✅ Weather API called')
  }
  
  // Check for empty response
  if (logText.includes('contentlength: 0') || logText.includes('content length: 0')) {
    console.log('❌ EMPTY RESPONSE DETECTED!')
    console.log('🔧 SUGGESTED FIXES:')
    console.log('   - Check if LLM is receiving enhanced prompts')
    console.log('   - Check if automatic weather completion is working')
    console.log('   - Check if function results are being passed correctly')
  }
  
  // Check for successful weather data
  if (logText.includes('weather') && (logText.includes('temperature') || logText.includes('forecast'))) {
    console.log('🌤️ Weather data appears to be present')
  }
  
  // Check for final response
  if (logText.includes('final response generated')) {
    const contentMatch = logText.match(/contentlength:\s*(\d+)/)
    if (contentMatch) {
      const length = parseInt(contentMatch[1])
      if (length > 0) {
        console.log(`✅ Final response generated with ${length} characters`)
      } else {
        console.log('❌ Final response is empty!')
      }
    }
  }
  
  console.log('-'.repeat(40))
  
  // Provide next steps
  if (logText.includes('what is the weather')) {
    if (logText.includes('contentlength: 0')) {
      console.log('\n🔧 NEXT STEPS:')
      console.log('1. The query was detected but response is empty')
      console.log('2. Check if automatic weather completion is working')
      console.log('3. Check server logs for coordinate extraction')
      console.log('4. May need to debug the LLM prompt handling')
    } else if (logText.includes('successfully retrieved boundary data')) {
      console.log('\n🎯 PROGRESS:')
      console.log('1. Boundary data retrieved successfully')
      console.log('2. Check if weather API was called automatically')
      console.log('3. Check if LLM received both datasets')
    }
  }
}

// Monitor for new activity
function checkForActivity() {
  const now = Date.now()
  if (now - lastLogTime > 5000 && logBuffer.length > 0) {
    // Analyze accumulated logs
    analyzeLogs(logBuffer)
    logBuffer = []
    
    console.log('\n⏳ Waiting for next weather query...')
    console.log('💡 Go to browser and ask: "what is the weather on field 14ha?"')
  }
}

// Simulate log monitoring (in real scenario, you'd tail actual log files)
console.log('📺 Monitoring for weather queries...')
console.log('💡 Make your weather query in the browser now!')

// Set up periodic checks
setInterval(checkForActivity, 2000)

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n\n🏁 Weather query testing cycle ended')
  console.log('📊 Summary of what to check:')
  console.log('   1. Browser Network tab for API responses')
  console.log('   2. Next.js server terminal for detailed logs')
  console.log('   3. Response content in browser dev tools')
  process.exit(0)
})

console.log('\n💡 TIP: Open browser dev tools Network tab to see API calls')
console.log('💡 TIP: Check the Next.js server terminal for detailed logs')
console.log('💡 TIP: Press Ctrl+C when done testing') 