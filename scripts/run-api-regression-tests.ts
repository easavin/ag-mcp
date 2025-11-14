#!/usr/bin/env tsx

// @ts-nocheck
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

interface TestResult {
  timestamp: string
  testSuite: string
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  duration: number
  details: any
}

async function checkServerHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/health`)
    return response.ok
  } catch (error) {
    return false
  }
}

async function runRegressionTests() {
  console.log('🚀 Starting API Regression Test Suite')
  console.log('=' .repeat(50))
  
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000'
  const timestamp = new Date().toISOString()
  
  // Check if server is running
  console.log(`📍 Checking server health at: ${baseUrl}`)
  const serverHealthy = await checkServerHealth(baseUrl)
  
  if (!serverHealthy) {
    console.error('❌ Server is not running or not healthy')
    console.log('💡 Make sure to start the development server first:')
    console.log('   npm run dev')
    process.exit(1)
  }
  
  console.log('✅ Server is healthy')
  console.log('')
  
  // Run the tests
  try {
    console.log('🧪 Running regression tests...')
    console.log('')
    
    const testCommand = 'npx jest --config jest.regression.config.js --verbose --detectOpenHandles --forceExit'
    const { stdout, stderr } = await execAsync(testCommand, {
      env: {
        ...process.env,
        TEST_BASE_URL: baseUrl,
        NODE_ENV: 'test'
      }
    })
    
    console.log('📊 Test Results:')
    console.log(stdout)
    
    if (stderr) {
      console.log('⚠️  Test Warnings/Errors:')
      console.log(stderr)
    }
    
    // Parse test results
    const testResult: TestResult = {
      timestamp,
      testSuite: 'API Regression Suite',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      details: { stdout, stderr }
    }
    
    // Extract test statistics from Jest output
    const testSummaryMatch = stdout.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+skipped)?/)
    if (testSummaryMatch) {
      testResult.passedTests = parseInt(testSummaryMatch[1]) || 0
      testResult.failedTests = parseInt(testSummaryMatch[2]) || 0
      testResult.skippedTests = parseInt(testSummaryMatch[3]) || 0
      testResult.totalTests = testResult.passedTests + testResult.failedTests + testResult.skippedTests
    }
    
    const durationMatch = stdout.match(/Time:\s+([\d.]+)\s*s/)
    if (durationMatch) {
      testResult.duration = parseFloat(durationMatch[1])
    }
    
    // Save test results
    const resultsDir = path.join(process.cwd(), 'test-results')
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }
    
    const resultsFile = path.join(resultsDir, `api-regression-${timestamp.replace(/[:.]/g, '-')}.json`)
    fs.writeFileSync(resultsFile, JSON.stringify(testResult, null, 2))
    
    console.log('')
    console.log('📈 Test Summary:')
    console.log(`   Total Tests: ${testResult.totalTests}`)
    console.log(`   ✅ Passed: ${testResult.passedTests}`)
    console.log(`   ❌ Failed: ${testResult.failedTests}`)
    console.log(`   ⏭️  Skipped: ${testResult.skippedTests}`)
    console.log(`   ⏱️  Duration: ${testResult.duration}s`)
    console.log(`   📁 Results saved to: ${resultsFile}`)
    
    if (testResult.failedTests > 0) {
      console.log('')
      console.log('❌ Some tests failed. Check the output above for details.')
      process.exit(1)
    } else {
      console.log('')
      console.log('🎉 All tests passed successfully!')
    }
    
  } catch (error: any) {
    console.error('❌ Error running tests:', error.message)
    
    // Save error details
    const errorResult: TestResult = {
      timestamp,
      testSuite: 'API Regression Suite',
      totalTests: 0,
      passedTests: 0,
      failedTests: 1,
      skippedTests: 0,
      duration: 0,
      details: { error: error.message, stdout: error.stdout, stderr: error.stderr }
    }
    
    const resultsDir = path.join(process.cwd(), 'test-results')
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }
    
    const resultsFile = path.join(resultsDir, `api-regression-error-${timestamp.replace(/[:.]/g, '-')}.json`)
    fs.writeFileSync(resultsFile, JSON.stringify(errorResult, null, 2))
    
    console.log(`📁 Error details saved to: ${resultsFile}`)
    process.exit(1)
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('API Regression Test Runner')
    console.log('')
    console.log('Usage: npm run test:regression [options]')
    console.log('')
    console.log('Options:')
    console.log('  --help, -h          Show this help message')
    console.log('  --url <url>         Set the base URL for testing (default: http://localhost:3000)')
    console.log('')
    console.log('Environment Variables:')
    console.log('  TEST_BASE_URL       Base URL for the API server')
    console.log('')
    console.log('Examples:')
    console.log('  npm run test:regression')
    console.log('  npm run test:regression -- --url http://localhost:3000')
    console.log('  TEST_BASE_URL=http://localhost:3000 npm run test:regression')
    process.exit(0)
  }
  
  // Parse URL argument
  const urlIndex = args.indexOf('--url')
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    process.env.TEST_BASE_URL = args[urlIndex + 1]
  }
  
  runRegressionTests().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
} 