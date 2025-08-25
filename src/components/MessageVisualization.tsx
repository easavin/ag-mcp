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
  Activity, Target, Zap, Cloud, CloudRain, Sun, Wind,
  Droplets, Thermometer, Eye, Shield, AlertTriangle,
  CheckCircle, XCircle, Info, Download
} from 'lucide-react'
import { VisualizationData, TableVisualization, ChartVisualization, MetricVisualization, ComparisonVisualization } from '@/types'

interface MessageVisualizationProps {
  visualizations: VisualizationData[]
  className?: string
}

// Weather icon helper functions
const getWeatherIcon = (condition: string) => {
  const conditionLower = condition.toLowerCase()
  if (conditionLower.includes('rain') || conditionLower.includes('shower')) return CloudRain
  if (conditionLower.includes('cloud')) return Cloud
  if (conditionLower.includes('sun') || conditionLower.includes('clear')) return Sun
  if (conditionLower.includes('wind')) return Wind
  if (conditionLower.includes('storm') || conditionLower.includes('thunder')) return Zap
  return Cloud // default
}

const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase()
  if (statusLower.includes('good') || statusLower.includes('recommended') || statusLower.includes('suitable')) return CheckCircle
  if (statusLower.includes('poor') || statusLower.includes('not recommended') || statusLower.includes('critical')) return XCircle
  if (statusLower.includes('warning') || statusLower.includes('alert')) return AlertTriangle
  return Info // default
}

const getMetricIcon = (label: string) => {
  const labelLower = label.toLowerCase()
  if (labelLower.includes('temperature') || labelLower.includes('soil')) return Thermometer
  if (labelLower.includes('humidity') || labelLower.includes('moisture')) return Droplets
  if (labelLower.includes('wind')) return Wind
  if (labelLower.includes('uv') || labelLower.includes('spraying')) return Shield
  if (labelLower.includes('visibility')) return Eye
  return Target // default
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
                    {row.map((cell, cellIndex) => {
                      const StatusIcon = getStatusIcon(cell)
                      const isStatusColumn = cellIndex === row.length - 1 && (cell === 'Good' || cell === 'Warning' || cell === 'Critical' || cell === 'Recommended' || cell === 'Not Recommended')

                      return (
                        <td
                          key={cellIndex}
                          style={{
                            padding: '12px 8px',
                            color: '#d1d5db',
                            borderRight: cellIndex < row.length - 1 ? '1px solid #374151' : 'none',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isStatusColumn && <StatusIcon style={{ width: '14px', height: '14px' }} />}
                            {cell}
                          </div>
                        </td>
                      )
                    })}
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

// Enhanced Chart Component with Dark Theme Support
const DataChart: React.FC<{ data: ChartVisualization['data'] }> = ({ data }) => {
  const { chartType, dataset, xAxis, yAxis, colors = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed'], lines } = data

  console.log('🔧 Chart data:', { chartType, dataset, xAxis, yAxis, lines })
  console.log('🔧 Chart dataset detailed:', JSON.stringify(dataset, null, 2))

  if (!dataset || dataset.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available</div>
  }

  // Check if we have precipitation data for enhanced weather charts
  const hasTemperatureData = dataset.some((item: any) => 'maxTemp' in item || 'temperature' in item || 'high' in item)
  const hasPrecipitationData = dataset.some((item: any) => 'precipitationProbability' in item || 'precipitation' in item)

  console.log('🔧 Data analysis:', { hasTemperatureData, hasPrecipitationData })
  
  // Log first dataset item to see available keys
  if (dataset.length > 0) {
    console.log('🔧 First dataset item keys:', Object.keys(dataset[0]))
  }

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
        // Check if we have multi-line data with 'lines' property
        if (lines && Array.isArray(lines) && lines.length > 0) {
          console.log('🔧 Rendering multi-line chart with lines:', lines)
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
                formatter={(value: any, name: string) => {
                  if (name === 'high' || name === 'High °C') return [`${value}°C`, '🔥 High Temperature']
                  if (name === 'low' || name === 'Low °C') return [`${value}°C`, '❄️ Low Temperature']
                  if (name === 'precipitation' || name === 'Rain Chance %') return [`${value}%`, '🌧️ Rain Chance']
                  return [value, name]
                }}
              />
              <Legend />
              {lines.map((line: any, index: number) => {
                console.log(`🔧 Rendering line ${index}:`, line)
                return (
                  <Line 
                    key={line.key}
                    type="monotone" 
                    dataKey={line.key} 
                    stroke={line.color || colors[index]} 
                    strokeWidth={2}
                    dot={{ fill: line.color || colors[index], strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name={line.label || line.key}
                    connectNulls={false}
                  />
                )
              })}
            </LineChart>
          )
        }
        
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
                  if (name === 'precipitationProbability') return [`${value}%`, '🌧️ Rain Chance']
                  if (name === 'maxTemp' || name === 'temperature') return [`${value}°C`, '🌡️ Temperature']
                  if (name === 'high') return [`${value}°C`, '🔥 High Temperature']
                  if (name === 'low') return [`${value}°C`, '❄️ Low Temperature']
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

// Metric Display Component with Weather Icons
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

  const getColorScheme = () => {
    switch (color) {
      case 'green': return { bg: '#065f46', border: '#10b981', text: '#34d399' }
      case 'red': return { bg: '#7f1d1d', border: '#ef4444', text: '#fca5a5' }
      case 'yellow': return { bg: '#78350f', border: '#f59e0b', text: '#fcd34d' }
      case 'blue': return { bg: '#1e3a8a', border: '#3b82f6', text: '#93c5fd' }
      default: return { bg: '#1f2937', border: '#6b7280', text: '#d1d5db' }
    }
  }

  const MetricIcon = getMetricIcon(label)
  const colors = getColorScheme()

  // Enhanced weather condition detection
  const isWeatherMetric = label.toLowerCase().includes('temperature') ||
                         label.toLowerCase().includes('humidity') ||
                         label.toLowerCase().includes('wind') ||
                         label.toLowerCase().includes('weather')

  return (
    <div style={{
      backgroundColor: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '20px',
      color: '#f9fafb',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle background pattern for weather metrics */}
      {isWeatherMetric && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          opacity: 0.1,
          transform: 'scale(0.8)'
        }}>
          <MetricIcon className="w-16 h-16" />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <MetricIcon style={{ width: '18px', height: '18px', color: colors.text }} />
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#e5e7eb' }}>{label}</p>
          </div>

          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#f9fafb', marginBottom: '4px' }}>
            {value}
            {unit && <span style={{ fontSize: '16px', fontWeight: 'normal', marginLeft: '4px', color: colors.text }}>{unit}</span>}
          </p>

          {context && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info style={{ width: '12px', height: '12px', color: colors.text, opacity: 0.7 }} />
              <p style={{ fontSize: '13px', color: colors.text, opacity: 0.9 }}>{context}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getTrendIcon()}
          {trend?.percentage && (
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
              {trend.percentage > 0 ? '+' : ''}{trend.percentage}%
            </span>
          )}
          {/* Download Action Button */}
          {data.action && data.action.type === 'download' && (
            <button
              onClick={async () => {
                try {
                  if (!data.action) {
                    console.error('❌ No action data available')
                    alert('Download action is not available')
                    return
                  }

                  if (data.action.content) {
                    console.log('📁 Starting download for:', data.action.filename)

                    // Create blob from content - use text/xml for better browser compatibility
                    const blob = new Blob([data.action.content], {
                      type: data.action.filename?.endsWith('.kml') ? 'application/vnd.google-earth.kml+xml' : 'text/xml'
                    })
                    const url = URL.createObjectURL(blob)

                    console.log('📁 Created blob URL:', url)

                    const link = document.createElement('a')
                    link.href = url
                    link.download = data.action.filename || 'download.kml'
                    link.target = '_blank' // Open in new tab if download fails

                    // Trigger download
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)

                    console.log('📁 Download initiated')

                    // Clean up blob URL after a longer delay to ensure download starts
                    setTimeout(() => {
                      URL.revokeObjectURL(url)
                      console.log('📁 Cleaned up blob URL')
                    }, 1000) // Increased delay

                  } else if (data.action.url) {
                    console.log('📁 Falling back to URL download:', data.action.url)
                    // Fallback to URL-based download
                    const link = document.createElement('a')
                    link.href = data.action.url
                    link.download = data.action.filename || 'download'
                    link.target = '_blank'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  } else {
                    console.error('❌ No content or URL provided for download')
                    alert('Download content is not available')
                  }
                } catch (error) {
                  console.error('❌ Download failed:', error)
                  alert('Download failed. Please try again.')
                }
              }}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              <Download style={{ width: '12px', height: '12px' }} />
              {data.action.label || 'Download'}
            </button>
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