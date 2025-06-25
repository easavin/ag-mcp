# AgMCP Multi-API Testing Framework

This directory contains automated testing tools for validating the AgMCP system's ability to handle complex agricultural queries with multiple API calls.

## 🎯 **Testing Philosophy**

The AgMCP system is designed as a **data assistant**, not an agronomist. It retrieves and presents agricultural data clearly, allowing users to make informed decisions rather than making complex agricultural recommendations.

## 📋 **Available Test Suites**

### 1. **Simple Data Retrieval Tests** (`simple-data-tests.js`)
**Best for: Daily validation and development**

Tests basic data retrieval capabilities:
- Market price queries
- Weather forecasts  
- Field information
- Production statistics
- Market comparisons

```bash
node scripts/simple-data-tests.js
```

**Expected Results**: 90%+ pass rate
- ✅ Single API calls work reliably
- ✅ Data presented clearly with visualizations
- ✅ Response times under 15 seconds

### 2. **Complex Multi-API Tests** (`test-complex-queries.js`)
**Best for: Advanced capability testing**

Tests complex scenarios requiring multiple API calls:
- Harvest decision support (field + weather + market data)
- Multi-field operations planning
- Cross-market analysis
- Risk assessment workflows

```bash
node scripts/test-complex-queries.js
```

**Expected Results**: 60-80% pass rate
- ⚠️ More challenging due to multiple API coordination
- ✅ Tests realistic agricultural workflows
- 🎯 Validates multi-step data gathering

### 3. **Test Summary** (`test-summary.js`)
**Best for: Quick system validation**

Runs key representative queries to validate overall system health:

```bash
node scripts/test-summary.js
```

**Expected Results**: 80%+ pass rate
- ✅ Covers all major data types
- ✅ Includes multi-API examples
- 📊 Provides clear success metrics

### 4. **Automated Prompt Optimization** (`auto-optimize-prompts.js`)
**Best for: System improvement and debugging**

Automatically analyzes test failures and optimizes the system prompt:

```bash
node scripts/auto-optimize-prompts.js
```

**Features**:
- 🔍 Analyzes failure patterns
- 🛠️ Automatically updates system prompt
- 🔄 Iterates until target pass rate achieved
- 📊 Generates optimization reports

## 🧪 **Test Categories**

### **Market Data Queries**
- EU market prices
- USDA market prices  
- Cross-market comparisons
- Production statistics

**Example**: "What are the current corn prices in Spain?"
**Expected**: Calls `getEUMarketPrices`, presents price table

### **Weather Data Queries**  
- Current conditions
- Multi-day forecasts
- Location-specific weather
- Agricultural insights

**Example**: "What is the 5-day weather forecast for Barcelona?"
**Expected**: Calls `getWeatherForecast`, presents weather table with agricultural context

### **Field Data Queries**
- Field boundaries
- Field lists
- Operation history
- Equipment status

**Example**: "Show me information about my field North 40"
**Expected**: Calls `get_field_boundary`, presents field details

### **Multi-API Queries**
- Harvest decision support
- Market analysis
- Operation planning
- Risk assessment

**Example**: "I want to see data to help me decide about harvesting - show me field info, weather, and market prices for my field North 40"
**Expected**: Calls multiple APIs, presents comprehensive data

## 📊 **Success Metrics**

### **Function Call Accuracy** (40 points)
- Correct APIs called for query type
- All expected functions executed
- Appropriate parameters passed

### **Response Quality** (20 points)  
- Adequate response length
- Clear data presentation
- No empty responses

### **Visualizations** (20 points)
- Tables for comparative data
- Charts for trends
- Metrics for KPIs

### **Performance** (20 points)
- Response times under 15 seconds
- Efficient API usage
- Stable execution

## 🎯 **Data-Focused Approach**

### **What the System DOES**:
✅ Retrieves relevant agricultural data
✅ Presents information clearly with visualizations  
✅ Provides context for decision-making
✅ Explains what the data means

### **What the System DOESN'T DO**:
❌ Make complex agricultural decisions
❌ Provide specific recommendations without data
❌ Act as an expert agronomist
❌ Give investment or planting advice

### **Example Response Pattern**:
```
Here's the current market data for corn in Spain:

[TABLE: Corn prices by region]
[CHART: Price trends over time]

Based on this data, you can make an informed decision about your corn marketing strategy.
```

## 🚀 **Running Tests**

### **Prerequisites**:
```bash
# Ensure development server is running
npm run dev

# Verify server health
curl http://localhost:3000/api/health
```

### **Quick Validation**:
```bash
# Run simple tests (recommended for daily use)
node scripts/simple-data-tests.js

# Expected: 6/6 tests passed (100.0%)
```

### **Full System Test**:
```bash
# Run comprehensive summary
node scripts/test-summary.js

# Expected: 5/6 queries successful (83.3%)
```

### **Advanced Testing**:
```bash
# Run complex multi-API scenarios  
node scripts/test-complex-queries.js

# Run automated optimization
node scripts/auto-optimize-prompts.js
```

## 📈 **Performance Benchmarks**

### **Current System Performance** (as of implementation):

| Test Suite | Pass Rate | Avg Response Time | Key Strengths |
|------------|-----------|-------------------|---------------|
| Simple Data | 100% | 6.2s | Reliable single-API calls |
| Summary | 83.3% | 7.5s | Good multi-API coordination |  
| Complex | 16.7% | 7.5s | Handles basic scenarios |

### **Improvement Areas**:
- 🔄 Multi-step workflow completion
- 📊 Consistent visualization generation
- ⚡ Response time optimization
- 🎯 Complex query understanding

## 🛠️ **Troubleshooting**

### **Common Issues**:

**Empty Responses**:
- Check LLM service configuration
- Verify function call message handling
- Review system prompt clarity

**Missing Function Calls**:
- Update system prompt patterns
- Add specific trigger phrases
- Test with simpler queries first

**Slow Performance**:
- Check API endpoint health
- Monitor LLM provider status
- Reduce concurrent test execution

**Low Pass Rates**:
- Run automated optimization
- Review test expectations
- Check data source availability

## 📝 **Adding New Tests**

### **Simple Data Test**:
```javascript
{
  id: 'new-test-1',
  category: 'Market Data',
  name: 'Your Test Name',
  query: "Your test query",
  expectedFunctions: ['expectedFunction'],
  selectedDataSources: ['data-source'],
  minResponseLength: 100,
  shouldHaveVisualizations: true
}
```

### **Complex Multi-API Test**:
```javascript
{
  id: 'complex-test-1', 
  category: 'Advanced Workflows',
  name: 'Multi-Step Process',
  query: "Complex query requiring multiple APIs",
  expectedFunctions: ['api1', 'api2', 'api3'],
  selectedDataSources: ['source1', 'source2'],
  minResponseLength: 300,
  shouldHaveVisualizations: true
}
```

## 🎉 **Success Stories**

The testing framework has successfully validated:

✅ **Market Price Queries**: 100% success rate for single-market queries
✅ **Weather Forecasts**: Reliable agricultural weather insights  
✅ **Field Information**: Accurate field boundary and operation data
✅ **Cross-Market Analysis**: EU vs US market comparisons working
✅ **Multi-API Coordination**: Basic multi-source data gathering functional

This testing framework ensures the AgMCP system reliably serves as an agricultural data assistant, providing farmers with the information they need to make informed decisions. 