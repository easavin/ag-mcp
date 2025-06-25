import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Create test visualization data
    const testVisualizations = [
      {
        type: 'chart',
        title: '5-Day Temperature Forecast',
        description: 'Weather forecast for Barcelona',
        data: {
          chartType: 'line',
          dataset: [
            { day: 'Today', temperature: 25, humidity: 60 },
            { day: 'Tomorrow', temperature: 28, humidity: 55 },
            { day: 'Day 3', temperature: 30, humidity: 50 },
            { day: 'Day 4', temperature: 27, humidity: 65 },
            { day: 'Day 5', temperature: 24, humidity: 70 }
          ],
          xAxis: 'day',
          yAxis: 'temperature',
          colors: ['#3b82f6', '#22c55e']
        }
      },
      {
        type: 'metric',
        title: 'Current Temperature',
        data: {
          value: 25,
          label: 'Current Temperature',
          unit: '°C',
          context: 'Clear sky',
          color: 'blue'
        }
      }
    ]

    return NextResponse.json({
      content: 'Here is the test weather forecast for Barcelona:',
      visualizations: testVisualizations
    })
  } catch (error) {
    console.error('Test visualization endpoint error:', error)
    return NextResponse.json({ error: 'Failed to create test visualizations' }, { status: 500 })
  }
} 