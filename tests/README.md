# API Regression Test Suite

This directory contains comprehensive regression tests for the AgMCP API endpoints, covering both individual API calls and combined multi-source queries.

## Overview

The regression test suite validates:

1. **John Deere API Functions**: Individual tests for each John Deere API endpoint
2. **Weather API Functions**: Individual tests for weather-related endpoints  
3. **Combined Multi-Source Queries**: Tests that use both John Deere and Weather APIs together
4. **Field Weather Orchestration**: Special tests for the field-specific weather workflow
5. **Error Handling**: Tests for graceful error handling with invalid inputs

## Test Structure

### Test Categories

- **`johndeere`**: Tests that only use John Deere API functions
- **`weather`**: Tests that only use Weather API functions  
- **`combined`**: Tests that use both John Deere and Weather APIs together

### Test Scenarios

The test suite includes comprehensive scenarios such as:

**John Deere Tests:**
- Field count queries (`getFields`)
- Equipment listing (`getEquipment`) 
- Organization data (`getOrganizations`)
- Operations history (`getOperations`)
- Comprehensive farm data (`getComprehensiveData`)
- Field boundary data (`get_field_boundary`)

**Weather Tests:**
- Current weather queries (`getCurrentWeather`)
- Weather forecasts (`getWeatherForecast`)
- Location-specific weather
- Spray condition analysis
- Coordinate-based weather

**Combined Tests:**
- Field-specific weather (orchestrated workflow)
- Farm overview with weather
- Equipment and weather for operations planning
- Field-specific spray decisions

## Running Tests

### Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Ensure API connections:**
   - John Deere API should be connected (tests will skip if not connected)
   - Weather API should be available (tests will skip if not available)

### Run the Full Regression Suite

```bash
npm run test:regression
```

### Run with Custom URL

```bash
npm run test:regression -- --url http://localhost:3000
```

### Environment Variables

```bash
TEST_BASE_URL=http://localhost:3000 npm run test:regression
```

### Command Line Options

```bash
# Show help
npm run test:regression -- --help

# Use custom URL
npm run test:regression -- --url http://localhost:3000
```

## Test Results

### Console Output

The test runner provides detailed console output including:
- API connection status checks
- Individual test progress
- Function call validation
- Content validation results
- Summary statistics

### Saved Results

Test results are automatically saved to `test-results/` directory:
- `api-regression-TIMESTAMP.json`: Successful test runs
- `api-regression-error-TIMESTAMP.json`: Failed test runs

### Result Format

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "testSuite": "API Regression Suite",
  "totalTests": 25,
  "passedTests": 23,
  "failedTests": 0,
  "skippedTests": 2,
  "duration": 45.2,
  "details": { ... }
}
```

## Test Validation

Each test validates:

1. **Function Calls**: Ensures expected API functions are called
2. **Response Content**: Validates response contains expected terms
3. **Response Length**: Ensures substantial responses (not empty/generic)
4. **Error Handling**: Validates graceful error handling
5. **Content Quality**: Ensures responses don't contain code or error messages

## Special Tests

### Field Weather Orchestration

This critical test validates the multi-step workflow:
1. User asks: "What's the weather at field 4 caminos?"
2. LLM calls `get_field_boundary(fieldName="4 caminos")`
3. LLM extracts coordinates from boundary data
4. LLM calls `getCurrentWeather(latitude=..., longitude=...)`
5. LLM provides field-specific weather response

**Validation:**
- Both functions must be called
- Response must mention specific field name
- Response must contain weather data
- Must not contain Python code or error messages

### Error Handling Tests

- **Invalid Field Names**: Tests graceful handling of non-existent fields
- **Invalid Coordinates**: Tests weather API with invalid coordinates
- **Connection Failures**: Tests behavior when APIs are unavailable

## Skipped Tests

Tests are automatically skipped when:
- John Deere API is not connected (John Deere tests)
- Weather API is not available (Weather tests)  
- Either API is unavailable (Combined tests)

Skipped tests are reported in the summary but don't cause test failures.

## Debugging

### Verbose Output

The test runner uses Jest's `--verbose` flag for detailed output showing:
- Individual test names and status
- Function calls made during each test
- Validation results for each assertion

### Log Analysis

Check the console output for:
- `🚜 Testing: [question]` - John Deere test execution
- `🌤️ Testing: [question]` - Weather test execution  
- `🔗 Testing: [question]` - Combined test execution
- `✅ [category] test passed` - Successful test completion

### Common Issues

1. **Server Not Running**: Ensure `npm run dev` is running
2. **API Not Connected**: Check John Deere OAuth connection
3. **Network Issues**: Verify internet connection for Weather API
4. **Timeout Errors**: Tests have generous timeouts (15-25s) but may need adjustment

## Integration with CI/CD

The regression test suite is designed for:
- **Local Development**: Quick validation during development
- **Pre-deployment**: Validation before production deployments
- **Continuous Integration**: Automated testing in CI pipelines
- **Performance Monitoring**: Regular validation of API performance

## Adding New Tests

To add new test scenarios, edit `api-regression-suite.test.ts`:

```typescript
{
  question: "Your test question here",
  expectedFunctions: ['functionName1', 'functionName2'],
  description: "Description of what this tests",
  category: 'johndeere' | 'weather' | 'combined',
  minResponseLength: 100,
  shouldContain: ['term1', 'term2'],
  shouldNotContain: ['error', 'failed']
}
```

Add the scenario to the `TEST_SCENARIOS` array in the appropriate category section. 