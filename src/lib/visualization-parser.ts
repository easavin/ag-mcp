import { VisualizationData } from '@/types'

export function parseVisualizationsFromResponse(content: string, functionResults?: any[]): { visualizations: VisualizationData[], cleanedContent: string } {
  const visualizations: VisualizationData[] = []
  let cleanedContent = content
  
  console.log('🔍 Parsing visualizations from content length:', content.length)
  console.log('🔍 Function results:', functionResults?.length || 0)

  // Check for export function results first
  if (functionResults) {
    for (const result of functionResults) {
      if (result.name && result.name.startsWith('export_field_boundary_') && result.result?.success) {
        console.log('📁 Found export function result:', result.name)

        const exportData = result.result.data
        if (exportData?.kmlContent) {
          const format = result.name.includes('kml') ? 'KML' : 'Shapefile'
          const fieldName = exportData.fieldName || 'Field'

          console.log(`📁 Creating download visualization for ${format} export:`, {
            fieldName,
            filename: exportData.filename,
            contentLength: exportData.kmlContent.length,
            coordinatesCount: exportData.coordinateCount
          })

          visualizations.push({
            type: 'metric',
            title: `${format} Export Ready`,
            description: `Your ${fieldName} field boundary has been exported successfully as a ${format} file`,
            data: {
              value: 'Download Ready',
              label: `${format} File`,
              action: {
                type: 'download',
                content: exportData.kmlContent,
                filename: exportData.filename || `${fieldName}_boundary.${format.toLowerCase()}`,
                label: `Download ${format}`
              }
            }
          })

          console.log(`✅ Created download visualization for ${format} export with content length: ${exportData.kmlContent.length}`)
        }
      }
    }
  }
  
  // Check if user is asking for a specific field operation (download, export, etc.)
  const isSpecificFieldOperation = functionResults?.some(result =>
    result.name?.startsWith('export_field_boundary_') ||
    (result.name === 'get_field_boundary' && result.result?.success)
  )

  // First, check for the expected format with visualizations array
  const expectedFormatMatch = content.match(/```json\n\{\s*"content":\s*"[^"]*",\s*"visualizations":\s*(\[[^\]]*\])\s*\}\s*\n```/)
  if (expectedFormatMatch) {
    try {
      const fullJson = JSON.parse(expectedFormatMatch[0].replace(/```json\n/, '').replace(/\n```/, ''))
      if (fullJson.visualizations) {
        console.log('✅ Found expected JSON format with visualizations array')
        cleanedContent = fullJson.content || content.replace(/```json\n[\s\S]*?\n```/, '').trim()

        // If this is a specific field operation, filter out generic field listings
        if (isSpecificFieldOperation) {
          const filteredVisualizations = fullJson.visualizations.filter((viz: any) =>
            !(viz.type === 'table' && viz.title?.toLowerCase().includes('fields'))
          )
          return { visualizations: filteredVisualizations, cleanedContent }
        }

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
          // Get the actual number of days from the forecast data
          const actualDays = forecast.length
          console.log(`🌤️ Creating visualization for ${actualDays} days of weather data`)

          // Create comprehensive temperature and precipitation chart
          const chartData = forecast.slice(0, actualDays).map((day: any, index: number) => ({
            day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `Day ${index + 1}`,
            high: Math.round(day.maxTemp || day.temperature_2m_max || day.temperature || 0),
            low: Math.round(day.minTemp || day.temperature_2m_min || day.minTemp || day.temperature || 0),
            precipitation: Math.round(day.precipitationProbability || day.precipitation_probability || 0),
            humidity: Math.round(day.humidity || day.relative_humidity_2m || 0),
            weatherCondition: day.weatherCondition || day.weather_description || 'Clear'
          }))

          // Enhanced temperature chart with high/low ranges
          visualizations.push({
            type: 'chart',
            title: `${actualDays}-Day Temperature Forecast`,
            description: `High and low temperatures with precipitation probability for ${weatherData.location ? `latitude ${weatherData.location.latitude}, longitude ${weatherData.location.longitude}` : 'your location'}`,
            data: {
              chartType: 'line',
              dataset: chartData,
              xAxis: 'day',
              yAxis: 'high',
              colors: ['#ef4444', '#3b82f6', '#10b981'],
              lines: [
                { key: 'high', color: '#ef4444', label: 'High °C' },
                { key: 'low', color: '#3b82f6', label: 'Low °C' },
                { key: 'precipitation', color: '#10b981', label: 'Rain Chance %' }
              ]
            }
          })

          // Precipitation probability bar chart
          visualizations.push({
            type: 'chart',
            title: 'Precipitation Forecast',
            description: `Chance of rain and humidity levels for the next ${actualDays} days`,
            data: {
              chartType: 'bar',
              dataset: chartData,
              xAxis: 'day',
              yAxis: 'precipitation',
              colors: ['#06b6d4']
            }
          })

          // Agricultural metrics if available
          if (weatherData.agriculture) {
            // Soil temperature metric
            if (weatherData.agriculture.soilTemperature) {
              const soilTemp = weatherData.agriculture.soilTemperature
              const surfaceTemp = soilTemp.surface || soilTemp['10cm'] || soilTemp
              visualizations.push({
                type: 'metric',
                title: 'Soil Temperature',
                data: {
                  value: typeof surfaceTemp === 'object' ? surfaceTemp.value || 15 : surfaceTemp,
                  label: 'Soil Temperature',
                  unit: '°C',
                  context: 'Surface level',
                  color: 'green'
                }
              })
            }

            // UV Index metric
            if (weatherData.agriculture.uvIndex !== undefined) {
              visualizations.push({
                type: 'metric',
                title: 'UV Index',
                data: {
                  value: weatherData.agriculture.uvIndex,
                  label: 'UV Index',
                  unit: '',
                  context: weatherData.agriculture.uvIndex > 7 ? 'High - Use protection' : weatherData.agriculture.uvIndex > 3 ? 'Moderate' : 'Low',
                  color: weatherData.agriculture.uvIndex > 7 ? 'red' : weatherData.agriculture.uvIndex > 3 ? 'yellow' : 'green'
                }
              })
            }

            // Spraying conditions
            if (weatherData.agriculture.sprayConditions) {
              visualizations.push({
                type: 'metric',
                title: 'Spraying Conditions',
                data: {
                  value: weatherData.agriculture.sprayConditions.suitable ? 'Good' : 'Poor',
                  label: 'Spraying Conditions',
                  unit: '',
                  context: weatherData.agriculture.sprayConditions.reason || 'Based on weather',
                  color: weatherData.agriculture.sprayConditions.suitable ? 'green' : 'red'
                }
              })
            }
          }

          // Agricultural recommendations table
          const recommendations = []
          if (weatherData.current?.temperature !== undefined) {
            if (weatherData.current.temperature > 30) {
              recommendations.push(['High Temperature Alert', 'Consider irrigation and heat stress prevention', 'Critical'])
            } else if (weatherData.current.temperature < 10) {
              recommendations.push(['Low Temperature Alert', 'Frost protection may be needed', 'Warning'])
            } else {
              recommendations.push(['Temperature', 'Optimal growing conditions', 'Good'])
            }
          }

          if (weatherData.agriculture?.sprayConditions) {
            recommendations.push([
              'Pesticide Application',
              weatherData.agriculture.sprayConditions.suitable ? 'Conditions suitable for spraying' : 'Avoid spraying - poor conditions',
              weatherData.agriculture.sprayConditions.suitable ? 'Recommended' : 'Not Recommended'
            ])
          }

          if (forecast.some((day: any) => (day.precipitationProbability || 0) > 70)) {
            recommendations.push(['Heavy Rain Expected', 'Prepare drainage and delay field work', 'Warning'])
          }

          if (recommendations.length > 0) {
            visualizations.push({
              type: 'table',
              title: 'Agricultural Recommendations',
              description: 'Weather-based recommendations for your farming operations',
              data: {
                headers: ['Recommendation', 'Details', 'Status'],
                rows: recommendations
              }
            })
          }

          // Create comprehensive current weather summary
          if (weatherData.current) {
            // Current temperature with weather icon context
            visualizations.push({
              type: 'metric',
              title: 'Current Conditions',
              data: {
                value: Math.round(weatherData.current.temperature),
                label: 'Current Temperature',
                unit: '°C',
                context: `🌤️ ${weatherData.current.weatherCondition || 'Clear'}`,
                color: 'blue'
              }
            })

            // Wind conditions if available
            if (weatherData.current.windSpeed !== undefined) {
              visualizations.push({
                type: 'metric',
                title: 'Wind Conditions',
                data: {
                  value: Math.round(weatherData.current.windSpeed),
                  label: 'Wind Speed',
                  unit: 'km/h',
                  context: `💨 ${weatherData.current.windDirection ? `${weatherData.current.windDirection}°` : 'Variable'}`,
                  color: weatherData.current.windSpeed > 20 ? 'yellow' : 'blue'
                }
              })
            }

            // Humidity metric
            if (weatherData.current.humidity !== undefined) {
              visualizations.push({
                type: 'metric',
                title: 'Humidity',
                data: {
                  value: Math.round(weatherData.current.humidity),
                  label: 'Relative Humidity',
                  unit: '%',
                  context: `💧 ${weatherData.current.humidity > 80 ? 'High humidity' : weatherData.current.humidity < 30 ? 'Low humidity' : 'Moderate'}`,
                  color: weatherData.current.humidity > 80 || weatherData.current.humidity < 30 ? 'yellow' : 'green'
                }
              })
            }
          }
        }
      }
      
      // Auto-detect field data - only if user asked about fields, not weather
      if (result.name === 'getFields' && result.result?.fields) {
        // Skip auto-generation if we already have visualizations
        if (visualizations.some(v => v.title?.toLowerCase().includes('field'))) {
          console.log('🌾 Skipping auto-generated field visualizations - already exist')
          continue
        }

        // Check if user is asking about weather - if so, don't show field list
        const userQuery = content.toLowerCase()
        const isWeatherQuery = userQuery.includes('weather') || userQuery.includes('forecast') ||
                              userQuery.includes('temperature') || userQuery.includes('rain')

        // Check if user is doing a specific field operation (download, export, boundary)
        const isSpecificFieldOperation = functionResults.some(otherResult =>
          otherResult.name?.startsWith('export_field_boundary_') ||
          (otherResult.name === 'get_field_boundary' && otherResult.result?.success)
        )

        if (isWeatherQuery) {
          console.log('🌤️ Skipping field visualization for weather query')
          continue
        }

        if (isSpecificFieldOperation) {
          console.log('📁 Skipping field visualization for specific field operation')
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