'use client'

import { useState } from 'react'

export default function ExportTestPage() {
  const [fieldName, setFieldName] = useState('14ha')
  const [platform, setPlatform] = useState('johndeere')
  const [format, setFormat] = useState('kml')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const handleExport = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/export/field-boundary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldName,
          platform,
          format
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (format === 'kml' && data.data?.kmlContent) {
          // For KML, create blob from JSON response
          try {
            const blob = new Blob([data.data.kmlContent], { type: 'application/vnd.google-earth.kml+xml' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = data.data.filename || `${fieldName.replace(/[^a-zA-Z0-9]/g, '_')}_boundary.kml`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            // Clean up blob URL after download
            setTimeout(() => URL.revokeObjectURL(url), 1000)

            setResult({
              success: true,
              message: `KML file downloaded successfully for field "${fieldName}"`,
              filename: data.data.filename,
              coordinatesCount: data.data.coordinateCount
            })
          } catch (downloadError) {
            console.error('Download error:', downloadError)
            setError('Download failed: ' + (downloadError instanceof Error ? downloadError.message : 'Unknown error'))
          }
        } else {
          // For other formats or if no direct content
          setResult(data)
        }
      } else {
        setError(data.error || 'Export failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const testNDVI = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/chat/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-session-' + Date.now(),
          messages: [
            {
              role: 'user',
              content: `What is the latest NDVI index for my field ${fieldName}?`,
              fileAttachments: []
            }
          ],
          options: {},
          selectedDataSources: ['johndeere', 'satshot']
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'NDVI query failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  // Test direct download functionality
  const testDirectDownload = () => {
    const testKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Field</name>
    <description>Test KML download</description>
    <Placemark>
      <name>Test Field</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -95.123,40.456,0
              -95.124,40.457,0
              -95.125,40.456,0
              -95.123,40.456,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`

    try {
      console.log('🧪 Testing direct download...')

      const blob = new Blob([testKML], { type: 'application/vnd.google-earth.kml+xml' })
      const url = URL.createObjectURL(blob)

      console.log('🧪 Created blob URL:', url)

      const link = document.createElement('a')
      link.href = url
      link.download = 'test_field.kml'
      link.target = '_blank'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log('🧪 Download initiated')

      setTimeout(() => {
        URL.revokeObjectURL(url)
        console.log('🧪 Cleaned up blob URL')
      }, 1000)

      alert('Test download initiated! Check your downloads folder.')

    } catch (error) {
      console.error('🧪 Direct download test failed:', error)
      alert('Direct download test failed: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Field Boundary Export Test</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Export Field Boundary</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Field Name</label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                placeholder="e.g., 14ha"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="johndeere">John Deere</option>
                <option value="satshot">Satshot</option>
                <option value="fieldview">FieldView</option>
                <option value="auravant">Auravant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="kml">KML (Google Earth)</option>
                <option value="shapefile">Shapefile (GIS)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-md font-medium"
            >
              {loading ? 'Exporting...' : `Export ${format.toUpperCase()}`}
            </button>

            <button
              onClick={testNDVI}
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-md font-medium"
            >
              {loading ? 'Querying...' : 'Test NDVI Query'}
            </button>

            <button
              onClick={testDirectDownload}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-md font-medium"
            >
              Test Direct Download
            </button>
          </div>
        </div>

        {/* Results Section */}
        {(result || error) && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>

            {error && (
              <div className="bg-red-900 border border-red-700 rounded-md p-4 mb-4">
                <h3 className="text-red-400 font-semibold">Error:</h3>
                <p className="text-red-300 mt-1">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-green-900 border border-green-700 rounded-md p-4">
                <h3 className="text-green-400 font-semibold">Success:</h3>
                <pre className="text-green-300 mt-1 whitespace-pre-wrap text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Usage Instructions */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Usage Instructions</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-blue-400">1. Export KML File</h3>
              <p className="text-gray-300 mt-1">
                Use the export button above to download a KML file for Google Earth.
                The file will contain your field boundary coordinates and metadata.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-green-400">2. Query NDVI Data</h3>
              <p className="text-gray-300 mt-1">
                Use the "Test NDVI Query" button or ask in chat: "What is the latest NDVI index for my field [name]?"
                The system will automatically extract field coordinates and query Satshot for NDVI data.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-purple-400">3. Chat Integration</h3>
              <p className="text-gray-300 mt-1">
                You can also ask the AI directly in the main chat:
              </p>
              <ul className="text-gray-300 mt-2 list-disc list-inside space-y-1">
                <li>"Export field boundary 14ha as KML from John Deere"</li>
                <li>"Get latest NDVI for field 14ha using coordinates from John Deere"</li>
                <li>"Download shapefile for my 14ha field"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
