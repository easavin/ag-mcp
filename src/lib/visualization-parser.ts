import { VisualizationData } from '@/types'

export function parseVisualizationsFromResponse(content: string, functionResults?: any[]): { visualizations: VisualizationData[], cleanedContent: string } {
  const visualizations: VisualizationData[] = []
  let cleanedContent = content
  
  console.log('🔍 Parsing visualizations from content length:', content.length)
  console.log('🔍 Function results:', functionResults?.length || 0)
  
  // First, check for the expected format with visualizations array
  const expectedFormatMatch = content.match(/```json\n\{\s*"content":\s*"[^"]*",\s*"visualizations":\s*(\[[^\]]*\])\s*\}\s*\n```/)
  if (expectedFormatMatch) {
    try {
      const fullJson = JSON.parse(expectedFormatMatch[0].replace(/```json\n/, '').replace(/\n```/, ''))
      if (fullJson.visualizations) {
        console.log('✅ Found expected JSON format with visualizations array')
        cleanedContent = fullJson.content || content.replace(/```json\n[\s\S]*?\n```/, '').trim()
        return { visualizations: fullJson.visualizations, cleanedContent }
      }
    } catch (error) {
      console.error('❌ Error parsing expected JSON format:', error)
    }
  }
  
  // Second, look for JSON blocks with markdown code fences
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g
  let match
  const jsonBlocks = []
  
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const jsonData = JSON.parse(match[1])
      
      // Check if this is a visualization object
      if (jsonData.type && ['table', 'chart', 'metric', 'comparison', 'line', 'bar'].includes(jsonData.type)) {
        console.log('✅ Found individual visualization JSON block:', jsonData.type)
        
        // Convert to our expected format
        const visualization: VisualizationData = {
          type: jsonData.type === 'line' ? 'chart' : jsonData.type === 'bar' ? 'chart' : jsonData.type,
          title: jsonData.title || 'Untitled',
          description: jsonData.description,
          data: jsonData.data || jsonData
        }
        
        // Special handling for line/bar charts
        if (jsonData.type === 'line' || jsonData.type === 'bar') {
          visualization.data = {
            chartType: jsonData.type,
            dataset: jsonData.data || [],
            xAxis: jsonData.xAxis || 'x',
            yAxis: jsonData.yAxis || 'y',
            colors: jsonData.lines?.map((line: any) => line.color) || jsonData.color ? [jsonData.color] : ['#3b82f6'],
            lines: jsonData.lines
          }
        }
        
        visualizations.push(visualization)
        jsonBlocks.push(match[0])
      } else if (jsonData.content && jsonData.visualizations) {
        // Handle the wrapped format
        console.log('✅ Found wrapped JSON format with visualizations array')
        cleanedContent = jsonData.content || cleanedContent
        visualizations.push(...jsonData.visualizations)
        jsonBlocks.push(match[0])
      }
    } catch (error) {
      console.error('❌ Error parsing individual JSON block:', error)
    }
  }
  
  // Third, look for standalone JSON objects without markdown fences (NEW)
  // This handles cases where LLM outputs raw JSON directly in content
  const standaloneJsonRegex = /\{[\s\S]*?"visualizations"[\s\S]*?\}/g
  let standaloneMatch
  
  while ((standaloneMatch = standaloneJsonRegex.exec(content)) !== null) {
    try {
      // Attempt to parse the JSON - if it fails, try to fix common issues
      let jsonString = standaloneMatch[0]
      let jsonData
      
      try {
        jsonData = JSON.parse(jsonString)
      } catch (initialError) {
        console.log('⚠️ Initial JSON parse failed, attempting to fix common issues...')
        
        // Try to fix common JSON issues
        // 1. Fix trailing commas
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1')
        
        // 2. Fix unescaped quotes in strings
        jsonString = jsonString.replace(/"([^"]*)"([^",}\]]*)"([^"]*)":/g, '"$1\\"$2\\"$3":')
        
        // 3. Fix missing quotes around property names
        jsonString = jsonString.replace(/(\w+):/g, '"$1":')
        
        // 4. Fix single quotes to double quotes
        jsonString = jsonString.replace(/'/g, '"')
        
        try {
          jsonData = JSON.parse(jsonString)
          console.log('✅ Successfully fixed JSON syntax issues')
        } catch (secondError) {
          console.error('❌ Could not fix JSON parsing issues:', secondError)
          console.log('🔍 Problematic JSON string:', jsonString.substring(0, 200) + '...')
          continue // Skip this JSON block
        }
      }
      
      if (jsonData && jsonData.content && jsonData.visualizations && Array.isArray(jsonData.visualizations)) {
        console.log('✅ Found standalone JSON with visualizations array:', jsonData.visualizations.length, 'items')
        
        // Validate visualizations before adding them
        const validVisualizations = jsonData.visualizations.filter((viz: any) => {
          if (!viz.type || !viz.title) {
            console.warn('⚠️ Skipping invalid visualization (missing type or title):', viz)
            return false
          }
          return true
        })
        
        // Use the content from JSON and remove the JSON block
        cleanedContent = jsonData.content || cleanedContent
        visualizations.push(...validVisualizations)
        jsonBlocks.push(standaloneMatch[0])
        
        // Remove this JSON block from content
        cleanedContent = cleanedContent.replace(standaloneMatch[0], '').trim()
      }
    } catch (error) {
      console.error('❌ Error parsing standalone JSON:', error)
      console.log('🔍 Failed JSON content:', standaloneMatch[0].substring(0, 200) + '...')
      // Continue processing instead of failing completely
    }
  }
  
  // Remove all found JSON blocks from content
  for (const block of jsonBlocks) {
    cleanedContent = cleanedContent.replace(block, '').trim()
  }
  
  // Clean up any remaining empty lines
  cleanedContent = cleanedContent.replace(/\n\n+/g, '\n\n').trim()
  
  // Auto-detect weather forecast data
  if (functionResults) {
    for (const result of functionResults) {
      if (result.name === 'getWeatherForecast' && result.result?.success) {
        // Skip auto-generation if we already have LLM-generated visualizations
        if (visualizations.length > 0) {
          console.log('🌤️ Skipping auto-generated weather visualizations - LLM already provided them')
          continue
        }
        
        const weatherData = result.result.data
        console.log('🌤️ Creating weather forecast visualization')
        
        const forecast = weatherData.forecast?.daily || []
        if (forecast.length > 0) {
          // Create chart for temperature trend
          const chartData = forecast.slice(0, 5).map((day: any, index: number) => ({
            day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `Day ${index + 1}`,
            temperature: Math.round(day.maxTemp || day.temperature_2m_max || day.temperature || 0),
            humidity: Math.round(day.humidity || day.relative_humidity_2m || 0)
          }))
          
          visualizations.push({
            type: 'chart',
            title: '5-Day Temperature Forecast',
            description: `Weather forecast for ${weatherData.location ? `latitude ${weatherData.location.latitude}, longitude ${weatherData.location.longitude}` : 'your location'}`,
            data: {
              chartType: 'line',
              dataset: chartData,
              xAxis: 'day',
              yAxis: 'temperature',
              colors: ['#3b82f6', '#22c55e']
            }
          })
          
          // Create metrics for current conditions
          if (weatherData.current) {
            visualizations.push({
              type: 'metric',
              title: 'Current Conditions',
              data: {
                value: Math.round(weatherData.current.temperature),
                label: 'Current Temperature',
                unit: '°C',
                context: weatherData.current.weatherCondition || 'Clear',
                color: 'blue'
              }
            })
          }
        }
      }
      
      // Auto-detect field data
      if (result.name === 'getFields' && result.result?.fields) {
        // Skip auto-generation if we already have visualizations
        if (visualizations.some(v => v.title?.toLowerCase().includes('field'))) {
          console.log('🌾 Skipping auto-generated field visualizations - already exist')
          continue
        }
        
        const fields = result.result.fields
        console.log('🌾 Creating fields table visualization')
        
        if (fields.length > 0) {
          const headers = ['Field Name', 'Area', 'Status']
          const rows = fields.map((field: any) => [
            field.name || 'Unnamed Field',
            field.area ? `${field.area} acres` : 'N/A',
            field.status || 'Active'
          ])
          
          visualizations.push({
            type: 'table',
            title: 'Your Fields',
            description: `Overview of ${fields.length} fields in your farm`,
            data: {
              headers,
              rows
            }
          })
          
          // Summary metric
          const totalArea = fields.reduce((sum: number, field: any) => sum + (field.area || 0), 0)
          if (totalArea > 0) {
            visualizations.push({
              type: 'metric',
              title: 'Farm Summary',
              data: {
                value: totalArea.toFixed(1),
                label: 'Total Farm Area',
                unit: 'acres',
                context: `Across ${fields.length} fields`,
                color: 'green'
              }
            })
          }
        }
      }
      
      // Auto-detect equipment data
      if (result.name === 'getEquipment' && result.result?.equipment) {
        // Skip auto-generation if we already have visualizations
        if (visualizations.some(v => v.title?.toLowerCase().includes('equipment'))) {
          console.log('🚜 Skipping auto-generated equipment visualizations - already exist')
          continue
        }
        
        const equipment = result.result.equipment
        console.log('🚜 Creating equipment table visualization')
        
        if (equipment.length > 0) {
          const headers = ['Equipment', 'Model', 'Status']
          const rows = equipment.map((item: any) => [
            item.name || item.model || 'Unknown',
            item.model || 'N/A',
            item.status || 'Active'
          ])
          
          visualizations.push({
            type: 'table',
            title: 'Your Equipment',
            description: `Overview of ${equipment.length} pieces of equipment`,
            data: {
              headers,
              rows
            }
          })
        }
      }
    }
  }
  
  console.log('📊 Generated', visualizations.length, 'visualizations')
  return { visualizations, cleanedContent }
}