'use client'

import React from 'react'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Minus, 
  Table as TableIcon, BarChart3, PieChart as PieChartIcon,
  Activity, Target, Zap
} from 'lucide-react'
import { VisualizationData, TableVisualization, ChartVisualization, MetricVisualization, ComparisonVisualization } from '@/types'

interface MessageVisualizationProps {
  visualizations: VisualizationData[]
  className?: string
}

// Enhanced Table Component with Dark Theme Support
const DataTable: React.FC<{ data: TableVisualization['data'] }> = ({ data }) => {
  console.log('🔧 DataTable rendering with data:', data)

  // Handle case where data might be an array instead of {headers, rows} structure
  if (Array.isArray(data)) {
    console.warn('⚠️ DataTable received array instead of {headers, rows} structure')
    
    // If it's an array of objects, convert to table format
    if (data.length > 0 && typeof data[0] === 'object') {
      const headers = Object.keys(data[0])
      const rows = data.map(item => headers.map(header => item[header] || ''))
      
      return (
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#374151',
                  borderBottom: '2px solid #4b5563'
                }}>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      style={{
                        padding: '12px 8px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#f9fafb',
                        borderRight: index < headers.length - 1 ? '1px solid #4b5563' : 'none'
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? '#111827' : '#1f2937',
                      borderBottom: '1px solid #374151'
                    }}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{
                          padding: '12px 8px',
                          color: '#d1d5db',
                          borderRight: cellIndex < row.length - 1 ? '1px solid #374151' : 'none'
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    } else {
      // Fallback for array of primitives
      return (
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '16px',
          color: '#f9fafb'
        }}>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )
    }
  }

  // Handle expected {headers, rows} structure
  const { headers, rows, metadata } = data
  
  if (!headers || !rows) {
    console.error('❌ DataTable: Missing headers or rows in data structure')
    return (
      <div style={{
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '16px',
        color: '#f9fafb'
      }}>
        <p>Error: Invalid table data structure</p>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#374151',
              borderBottom: '2px solid #4b5563'
            }}>
              {headers.map((header, index) => (
                <th
                  key={index}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#f9fafb',
                    borderRight: index < headers.length - 1 ? '1px solid #4b5563' : 'none'
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  backgroundColor: rowIndex % 2 === 0 ? '#111827' : '#1f2937',
                  borderBottom: '1px solid #374151'
                }}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: '12px 8px',
                      color: '#d1d5db',
                      borderRight: cellIndex < row.length - 1 ? '1px solid #374151' : 'none'
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Enhanced Chart Component with Precipitation Support
const DataChart: React.FC<{ data: ChartVisualization['data'] }> = ({ data }) => {
  const { chartType, dataset, xAxis, yAxis, colors = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed'] } = data

  console.log('🔧 Chart data:', { chartType, dataset, xAxis, yAxis })

  if (!dataset || dataset.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available</div>
  }

  // Check if we have precipitation data for enhanced weather charts
  const hasTemperatureData = dataset.some((item: any) => 'maxTemp' in item || 'temperature' in item)
  const hasPrecipitationData = dataset.some((item: any) => 'precipitationProbability' in item || 'precipitation' in item)

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart width={600} height={240} data={dataset}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxis} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f9fafb'
              }} 
            />
            <Legend />
            <Bar dataKey={yAxis} fill={colors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      
      case 'line':
        // Enhanced weather chart with temperature and precipitation
        if (hasTemperatureData && hasPrecipitationData) {
          return (
            <LineChart width={600} height={240} data={dataset}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={xAxis} stroke="#9ca3af" />
              <YAxis yAxisId="temp" orientation="left" stroke="#9ca3af" />
              <YAxis yAxisId="precip" orientation="right" stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb'
                }} 
                formatter={(value: any, name: string) => {
                  if (name === 'precipitationProbability') return [`${value}%`, 'Rain Chance']
                  if (name === 'maxTemp' || name === 'temperature') return [`${value}°C`, 'Temperature']
                  return [value, name]
                }}
              />
              <Legend />
              <Line 
                yAxisId="temp"
                type="monotone" 
                dataKey="maxTemp" 
                stroke={colors[0]} 
                strokeWidth={3}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
                name="Max Temperature"
              />
              <Line 
                yAxisId="precip"
                type="monotone" 
                dataKey="precipitationProbability" 
                stroke={colors[2]} 
                strokeWidth={2}
                dot={{ fill: colors[2], strokeWidth: 2, r: 3 }}
                name="Rain Chance (%)"
              />
            </LineChart>
          )
        } else {
          return (
            <LineChart width={600} height={240} data={dataset}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={xAxis} stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb'
                }} 
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={yAxis} 
                stroke={colors[0]} 
                strokeWidth={3}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          )
        }
      
      case 'area':
        return (
          <AreaChart width={600} height={240} data={dataset}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxis} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f9fafb'
              }} 
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={yAxis || ''} 
              stroke={colors[0]} 
              fill={colors[0]}
              fillOpacity={0.3}
            />
          </AreaChart>
        )
      
      case 'pie':
        return (
          <PieChart width={600} height={240}>
            <Pie
              data={dataset}
              cx={300}
              cy={120}
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yAxis}
            >
              {dataset.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f9fafb'
              }} 
            />
          </PieChart>
        )
      
      default:
        return <div className="text-center py-8 text-gray-500">Unsupported chart type: {chartType}</div>
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="w-full overflow-x-auto flex justify-center">
        {renderChart()}
      </div>
    </div>
  )
}

// Metric Display Component
const MetricDisplay: React.FC<{ data: MetricVisualization['data'] }> = ({ data }) => {
  const { value, label, unit, trend, context, color = 'blue' } = data
  
  console.log('🔧 MetricDisplay rendering with data:', data)

  const getTrendIcon = () => {
    if (!trend) return null
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div style={{
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '8px',
      padding: '16px',
      color: '#f9fafb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: '500', opacity: 0.75, color: '#9ca3af' }}>{label}</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f9fafb' }}>
            {value}
            {unit && <span style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: '4px', color: '#d1d5db' }}>{unit}</span>}
          </p>
          {context && <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px', color: '#9ca3af' }}>{context}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getTrendIcon()}
          {trend?.percentage && (
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#d1d5db' }}>
              {trend.percentage > 0 ? '+' : ''}{trend.percentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Comparison Component
const ComparisonDisplay: React.FC<{ data: ComparisonVisualization['data'] }> = ({ data }) => {
  const { items, format } = data

  if (format === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item, index) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.label}</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {item.value}
              {item.unit && <span className="text-sm font-normal ml-1">{item.unit}</span>}
            </p>
            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className={`space-y-3 ${format === 'horizontal' ? 'flex flex-wrap gap-4' : ''}`}>
        {items.map((item, index) => (
          <div key={index} className={`flex items-center justify-between ${format === 'horizontal' ? 'min-w-32' : ''}`}>
            <div className="flex items-center space-x-2">
              {item.color && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {item.value}
              {item.unit && <span className="font-normal ml-1">{item.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main Visualization Component
export default function MessageVisualization({ visualizations, className = '' }: MessageVisualizationProps) {
  console.log('🎨 MessageVisualization received data:', visualizations)
  
  if (!visualizations || visualizations.length === 0) {
    console.log('🎨 No visualizations to render')
    return null
  }

  console.log('🎨 Rendering', visualizations.length, 'visualizations')
  
  return (
    <div className={`space-y-4 mt-4 ${className}`}>
      {visualizations.map((viz, index) => (
        <div key={index} className="visualization-container">
          {viz.title && (
            <div className="flex items-center space-x-2 mb-3">
              {viz.type === 'table' && <TableIcon className="w-4 h-4 text-blue-500" />}
              {viz.type === 'chart' && <BarChart3 className="w-4 h-4 text-green-500" />}
              {viz.type === 'metric' && <Target className="w-4 h-4 text-purple-500" />}
              {viz.type === 'comparison' && <Activity className="w-4 h-4 text-orange-500" />}
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{viz.title}</h3>
            </div>
          )}
          
          {viz.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{viz.description}</p>
          )}

          {viz.type === 'table' && (() => {
            console.log('🔧 Rendering table:', viz.data)
            return <DataTable data={viz.data} />
          })()}
          {viz.type === 'chart' && (() => {
            console.log('🔧 Rendering chart:', viz.data)
            return <DataChart data={viz.data} />
          })()}
          {viz.type === 'metric' && (() => {
            console.log('🔧 Rendering metric:', viz.data)
            return <MetricDisplay data={viz.data} />
          })()}
          {viz.type === 'comparison' && (() => {
            console.log('🔧 Rendering comparison:', viz.data)
            return <ComparisonDisplay data={viz.data} />
          })()}
        </div>
      ))}
    </div>
  )
} 