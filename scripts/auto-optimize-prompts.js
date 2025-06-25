#!/usr/bin/env node

/**
 * Automated Prompt Optimization System
 * 
 * This script automatically:
 * 1. Runs complex multi-API tests
 * 2. Analyzes failure patterns
 * 3. Updates the system prompt to fix issues
 * 4. Re-runs tests to validate improvements
 * 5. Repeats until satisfactory results
 */

const fs = require('fs');
const path = require('path');
const { testCases, runTestCase, validateResponse } = require('./test-complex-queries.js');

class PromptOptimizer {
  constructor() {
    this.maxIterations = 5;
    this.targetPassRate = 80; // 80% pass rate target
    this.llmFilePath = 'src/lib/llm.ts';
    this.optimizationHistory = [];
  }

  /**
   * Main optimization loop
   */
  async optimize() {
    console.log('🚀 Starting Automated Prompt Optimization...');
    console.log(`🎯 Target: ${this.targetPassRate}% pass rate`);
    console.log(`🔄 Max iterations: ${this.maxIterations}`);

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔄 ITERATION ${iteration}/${this.maxIterations}`);
      console.log(`${'='.repeat(80)}`);

      // Run tests
      const testResults = await this.runTests();
      const passRate = this.calculatePassRate(testResults);
      
      console.log(`📊 Current pass rate: ${passRate.toFixed(1)}%`);

      // Check if we've reached our target
      if (passRate >= this.targetPassRate) {
        console.log(`✅ SUCCESS! Reached target pass rate of ${this.targetPassRate}%`);
        this.saveOptimizationReport(testResults, iteration, true);
        return { success: true, passRate, iteration, testResults };
      }

      // Analyze failures and generate fixes
      const failureAnalysis = this.analyzeFailures(testResults);
      const promptFixes = this.generatePromptFixes(failureAnalysis);

      console.log(`\n🔍 Analysis: ${failureAnalysis.patterns.length} failure patterns identified`);
      console.log(`🛠️  Applying ${promptFixes.length} prompt fixes...`);

      // Apply fixes to the prompt
      const fixesApplied = await this.applyPromptFixes(promptFixes);
      
      if (fixesApplied === 0) {
        console.log(`⚠️  No fixes could be applied. Stopping optimization.`);
        break;
      }

      console.log(`✅ Applied ${fixesApplied} fixes to system prompt`);

      // Store iteration results
      this.optimizationHistory.push({
        iteration,
        passRate,
        failurePatterns: failureAnalysis.patterns,
        fixesApplied: promptFixes,
        testResults
      });

      // Small delay before next iteration
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Final results
    const finalResults = await this.runTests();
    const finalPassRate = this.calculatePassRate(finalResults);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🏁 OPTIMIZATION COMPLETE`);
    console.log(`📊 Final pass rate: ${finalPassRate.toFixed(1)}%`);
    console.log(`🔄 Iterations completed: ${this.optimizationHistory.length}`);
    console.log(`${'='.repeat(80)}`);

    this.saveOptimizationReport(finalResults, this.optimizationHistory.length, false);
    
    return { 
      success: finalPassRate >= this.targetPassRate, 
      passRate: finalPassRate, 
      iterations: this.optimizationHistory.length,
      testResults: finalResults 
    };
  }

  /**
   * Run all test cases
   */
  async runTests() {
    console.log(`\n🧪 Running ${testCases.length} test cases...`);
    
    const results = [];
    for (const testCase of testCases) {
      try {
        const result = await runTestCase(testCase);
        results.push(result);
        
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${testCase.name}: ${result.score}/100`);
      } catch (error) {
        console.log(`💥 ${testCase.name}: ERROR - ${error.message}`);
        results.push({
          testCase: testCase.id,
          passed: false,
          score: 0,
          issues: [error.message],
          response: null
        });
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }

  /**
   * Calculate overall pass rate
   */
  calculatePassRate(results) {
    const passed = results.filter(r => r.passed).length;
    return (passed / results.length) * 100;
  }

  /**
   * Analyze failure patterns
   */
  analyzeFailures(testResults) {
    const failures = testResults.filter(r => !r.passed);
    const patterns = [];

    // Count missing function patterns
    const missingFunctions = {};
    failures.forEach(failure => {
      failure.issues.forEach(issue => {
        if (issue.startsWith('Missing functions:')) {
          const functions = issue.replace('Missing functions: ', '').split(', ');
          functions.forEach(func => {
            missingFunctions[func] = (missingFunctions[func] || 0) + 1;
          });
        }
      });
    });

    // Identify most common missing functions
    const sortedMissing = Object.entries(missingFunctions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    if (sortedMissing.length > 0) {
      patterns.push({
        type: 'missing_functions',
        description: `Functions not being called: ${sortedMissing.map(([func, count]) => `${func}(${count}x)`).join(', ')}`,
        functions: sortedMissing.map(([func]) => func),
        severity: 'high'
      });
    }

    // Check for visualization issues
    const noVisualizationCount = failures.filter(f => 
      f.issues.some(issue => issue === 'No visualizations generated')
    ).length;

    if (noVisualizationCount > 0) {
      patterns.push({
        type: 'no_visualizations',
        description: `${noVisualizationCount} tests missing visualizations`,
        count: noVisualizationCount,
        severity: 'medium'
      });
    }

    // Check for short responses
    const shortResponseCount = failures.filter(f =>
      f.issues.some(issue => issue.includes('Response too short'))
    ).length;

    if (shortResponseCount > 0) {
      patterns.push({
        type: 'short_responses',
        description: `${shortResponseCount} tests with insufficient response length`,
        count: shortResponseCount,
        severity: 'medium'
      });
    }

    // Check for empty responses
    const emptyResponseCount = failures.filter(f =>
      f.issues.some(issue => issue.includes('Response too short (0 <'))
    ).length;

    if (emptyResponseCount > 0) {
      patterns.push({
        type: 'empty_responses',
        description: `${emptyResponseCount} tests returning empty responses`,
        count: emptyResponseCount,
        severity: 'critical'
      });
    }

    return { patterns, totalFailures: failures.length };
  }

  /**
   * Generate prompt fixes based on failure analysis
   */
  generatePromptFixes(analysis) {
    const fixes = [];

    analysis.patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'missing_functions':
          // Add specific instructions for missing functions
          pattern.functions.forEach(func => {
            fixes.push({
              type: 'function_emphasis',
              function: func,
              instruction: this.getFunctionInstruction(func),
              priority: 'high'
            });
          });
          break;

        case 'no_visualizations':
          fixes.push({
            type: 'visualization_requirement',
            instruction: 'ALWAYS generate visualizations for complex multi-API queries with tables, charts, or comparisons',
            priority: 'medium'
          });
          break;

        case 'short_responses':
          fixes.push({
            type: 'response_length',
            instruction: 'Provide comprehensive, detailed responses for complex agricultural queries (minimum 300 words)',
            priority: 'medium'
          });
          break;

        case 'empty_responses':
          fixes.push({
            type: 'response_generation',
            instruction: 'CRITICAL: Always provide a substantive response after function calls. Never return empty content.',
            priority: 'critical'
          });
          break;
      }
    });

    return fixes;
  }

  /**
   * Get specific instruction for a function
   */
  getFunctionInstruction(functionName) {
    const instructions = {
      'getWeatherForecast': 'For harvest and spray timing decisions, ALWAYS call getWeatherForecast with field coordinates',
      'get_field_boundary': 'For field-specific queries, ALWAYS call get_field_boundary first to get location data',
      'get_field_operation_history': 'For crop condition and timing decisions, ALWAYS call get_field_operation_history',
      'getEUMarketPrices': 'For pricing and market decisions, ALWAYS call getEUMarketPrices for current prices',
      'getUSDAMarketPrices': 'For US market comparisons, ALWAYS call getUSDAMarketPrices alongside EU data',
      'getEUTradeData': 'For market trend analysis, ALWAYS call getEUTradeData for trade patterns',
      'getUSDATradeData': 'For comprehensive market analysis, ALWAYS call getUSDATradeData for US trade data',
      'getFields': 'For multi-field queries, ALWAYS start with getFields to list all available fields',
      'getEquipment': 'For logistics and scheduling queries, ALWAYS call getEquipment for machinery data',
      'getComprehensiveData': 'For farm-wide analysis, ALWAYS call getComprehensiveData for complete overview'
    };
    
    return instructions[functionName] || `ALWAYS call ${functionName} when relevant to the query`;
  }

  /**
   * Apply fixes to the system prompt
   */
  async applyPromptFixes(fixes) {
    if (fixes.length === 0) return 0;

    try {
      const llmContent = fs.readFileSync(this.llmFilePath, 'utf8');
      let updatedContent = llmContent;
      let appliedCount = 0;

      // Sort fixes by priority
      const sortedFixes = fixes.sort((a, b) => {
        const priorities = { critical: 3, high: 2, medium: 1, low: 0 };
        return priorities[b.priority] - priorities[a.priority];
      });

      // Find the multi-step workflow section
      const workflowSectionRegex = /## \*\*🔄 MULTI-STEP WORKFLOW PATTERNS:\*\*/;
      const workflowMatch = updatedContent.match(workflowSectionRegex);
      
      if (!workflowMatch) {
        console.log('⚠️  Could not find workflow section in prompt');
        return 0;
      }

      // Add function-specific instructions
      const functionFixes = sortedFixes.filter(fix => fix.type === 'function_emphasis');
      if (functionFixes.length > 0) {
        const functionInstructions = functionFixes.map(fix => 
          `- **${fix.function}**: ${fix.instruction}`
        ).join('\n');

        const newSection = `
### **🎯 CRITICAL FUNCTION REQUIREMENTS:**
${functionInstructions}

### **⚡ MANDATORY MULTI-CALL SCENARIOS:**
- **Harvest decisions** → MUST call: get_field_boundary + getWeatherForecast + get_field_operation_history + getEUMarketPrices
- **Market comparisons** → MUST call: getEUMarketPrices + getUSDAMarketPrices + getEUTradeData + getUSDATradeData  
- **Spray timing** → MUST call: getFields + get_field_boundary + getWeatherForecast + get_field_operation_history
- **Equipment scheduling** → MUST call: getFields + get_field_boundary + getEquipment + getWeatherForecast
- **Risk assessment** → MUST call: getComprehensiveData + getWeatherForecast + getEUMarketPrices + getEquipment

`;

        const insertPoint = workflowMatch.index + workflowMatch[0].length;
        updatedContent = updatedContent.slice(0, insertPoint) + newSection + updatedContent.slice(insertPoint);
        appliedCount += functionFixes.length;
      }

      // Add visualization requirements
      const vizFixes = sortedFixes.filter(fix => fix.type === 'visualization_requirement');
      if (vizFixes.length > 0) {
        const vizInstruction = `

**🎨 VISUALIZATION REQUIREMENTS:**
- Complex queries (3+ function calls) MUST generate visualizations
- Use tables for comparative data, charts for trends, metrics for KPIs
- ALWAYS include visualization JSON blocks for multi-API responses

`;
        
        const availableDataSection = updatedContent.indexOf('## **AVAILABLE DATA SOURCES:**');
        if (availableDataSection !== -1) {
          updatedContent = updatedContent.slice(0, availableDataSection) + vizInstruction + updatedContent.slice(availableDataSection);
          appliedCount += vizFixes.length;
        }
      }

      // Add response length requirements
      const lengthFixes = sortedFixes.filter(fix => fix.type === 'response_length');
      if (lengthFixes.length > 0) {
        const lengthInstruction = `

**📝 RESPONSE REQUIREMENTS:**
- Complex agricultural queries require detailed responses (minimum 300 words)
- Include specific recommendations and actionable insights
- Explain the reasoning behind decisions using retrieved data

`;
        
        const criticalSection = updatedContent.indexOf('## **CRITICAL ANTI-HALLUCINATION RULES:**');
        if (criticalSection !== -1) {
          updatedContent = updatedContent.slice(0, criticalSection) + lengthInstruction + updatedContent.slice(criticalSection);
          appliedCount += lengthFixes.length;
        }
      }

      // Add empty response fixes
      const emptyFixes = sortedFixes.filter(fix => fix.type === 'response_generation');
      if (emptyFixes.length > 0) {
        const emptyInstruction = `

**🚨 CRITICAL RESPONSE GENERATION:**
- NEVER return empty or zero-length responses
- ALWAYS provide substantive content after function calls
- If function calls fail, explain the issue and provide alternative guidance

`;
        
        const strictDataSection = updatedContent.indexOf('### **STRICT DATA POLICY:**');
        if (strictDataSection !== -1) {
          updatedContent = updatedContent.slice(0, strictDataSection) + emptyInstruction + updatedContent.slice(strictDataSection);
          appliedCount += emptyFixes.length;
        }
      }

      // Write updated content back to file
      if (appliedCount > 0) {
        fs.writeFileSync(this.llmFilePath, updatedContent, 'utf8');
        console.log(`✅ Applied ${appliedCount} fixes to ${this.llmFilePath}`);
      }

      return appliedCount;

    } catch (error) {
      console.error(`❌ Error applying prompt fixes: ${error.message}`);
      return 0;
    }
  }

  /**
   * Save optimization report
   */
  saveOptimizationReport(finalResults, iterations, success) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results/prompt-optimization-${timestamp}.json`;

    const report = {
      timestamp: new Date().toISOString(),
      success,
      targetPassRate: this.targetPassRate,
      finalPassRate: this.calculatePassRate(finalResults),
      iterations,
      maxIterations: this.maxIterations,
      optimizationHistory: this.optimizationHistory,
      finalResults,
      summary: {
        totalTests: finalResults.length,
        passed: finalResults.filter(r => r.passed).length,
        failed: finalResults.filter(r => !r.passed).length,
        improvements: this.optimizationHistory.map(h => h.passRate)
      }
    };

    try {
      const dir = path.dirname(filename);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filename, JSON.stringify(report, null, 2));
      console.log(`💾 Optimization report saved to: ${filename}`);
    } catch (error) {
      console.warn(`⚠️  Could not save report: ${error.message}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3000/api/health');
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('✅ Server is healthy and ready');
  } catch (error) {
    console.error('❌ Server is not accessible. Please start the development server:');
    console.error('   npm run dev');
    process.exit(1);
  }

  const optimizer = new PromptOptimizer();
  const results = await optimizer.optimize();

  if (results.success) {
    console.log(`\n🎉 SUCCESS! Achieved ${results.passRate.toFixed(1)}% pass rate in ${results.iterations} iterations`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Optimization incomplete. Final pass rate: ${results.passRate.toFixed(1)}%`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { PromptOptimizer }; 