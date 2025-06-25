'use client'

import MessageVisualization from '@/components/MessageVisualization'

export default function TestVisualizationPage() {
  const testVisualizations = [
    {
      type: 'chart' as const,
      title: '5-Day Temperature Forecast',
      description: 'Weather forecast for Barcelona',
      data: {
        chartType: 'line' as const,
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
      type: 'metric' as const,
      title: 'Current Temperature',
      data: {
        value: 25,
        label: 'Current Temperature',
        unit: '°C',
        context: 'Clear sky',
        color: 'blue' as const
      }
    },
    {
      type: 'table' as const,
      title: 'Field Summary',
      data: {
        headers: ['Field Name', 'Area', 'Status'],
        rows: [
          ['North Field', '120 acres', 'Active'],
          ['South Field', '85 acres', 'Planted'],
          ['East Field', '95 acres', 'Harvested']
        ]
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Visualization Component Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Visualizations</h2>
          
          <MessageVisualization visualizations={testVisualizations} />
        </div>
      </div>
    </div>
  )
} 