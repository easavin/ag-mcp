import { VisualizationData } from '@/types'

export function parseVisualizationsFromResponse(content: string, functionResults?: any[]): { visualizations: VisualizationData[], cleanedContent: string } {
  const visualizations: VisualizationData[] = []
  let cleanedContent = content
  
  console.log('🔍 Parsing visualizations from content length:', content.length)
  console.log('🔍 Function results:', functionResults?.length || 0)
  
  // Check for explicit JSON visualization blocks first
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1])
      if (jsonData.visualizations) {
        console.log('✅ Found explicit JSON visualizations')
        // Remove the JSON block from the content
        cleanedContent = content.replace(/```json\n([\s\S]*?)\n```/, '').trim()
        return { visualizations: jsonData.visualizations, cleanedContent }
      }
    } catch (error) {
      console.error('❌ Error parsing JSON visualizations:', error)
    }
  }
  
  // Auto-detect weather forecast data
  if (functionResults) {
    for (const result of functionResults) {
      if (result.name === 'getWeatherForecast' && result.result?.success) {
        const weatherData = result.result.data
        console.log('🌤️ Creating weather forecast visualization')
        
        const forecast = weatherData.forecast?.daily || []
        if (forecast.length > 0) {
          // Create chart for temperature trend
          const chartData = forecast.slice(0, 5).map((day: any, index: number) => ({
            day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `Day ${index + 1}`,
            temperature: Math.round(day.temperature?.max || day.temperature || 0),
            humidity: Math.round(day.humidity || 0)
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