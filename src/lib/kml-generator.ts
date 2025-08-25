import { FieldBoundary, Coordinate } from '@/types'

export interface FieldBoundary {
  id: string
  name: string
  coordinates: Coordinate[]
  area?: number
  areaUnit?: string
  metadata?: {
    createdTime?: string
    modifiedTime?: string
    source?: string
    platform?: string
  }
}

export interface Coordinate {
  lat: number
  lng: number
  elevation?: number
}

export class KMLGenerator {
  /**
   * Generate KML content for a field boundary
   */
  static generateFieldBoundaryKML(fieldData: FieldBoundary): string {
    const { id, name, coordinates, area, areaUnit, metadata } = fieldData

    // Convert coordinates to KML format (longitude,latitude,elevation)
    const coordinateString = coordinates
      .map(coord => `${coord.lng},${coord.lat}${coord.elevation ? ',' + coord.elevation : ''}`)
      .join(' ')

    // Create KML content
    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(name || 'Field Boundary')}</name>
    <description>
      <![CDATA[
        <b>Field ID:</b> ${id}<br/>
        <b>Name:</b> ${name}<br/>
        ${area ? `<b>Area:</b> ${area} ${areaUnit || 'ha'}<br/>` : ''}
        ${metadata?.source ? `<b>Source:</b> ${metadata.source}<br/>` : ''}
        ${metadata?.createdTime ? `<b>Created:</b> ${new Date(metadata.createdTime).toLocaleString()}<br/>` : ''}
        ${metadata?.platform ? `<b>Platform:</b> ${metadata.platform}<br/>` : ''}
      ]]>
    </description>

    <Style id="fieldBoundaryStyle">
      <LineStyle>
        <color>ff00ff00</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>7f00ff00</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>

    <Placemark>
      <name>${this.escapeXml(name || 'Field Boundary')}</name>
      <description>
        <![CDATA[
          <b>Field Boundary</b><br/>
          ID: ${id}<br/>
          ${area ? `Area: ${area} ${areaUnit || 'ha'}<br/>` : ''}
          ${metadata?.platform ? `Platform: ${metadata.platform}<br/>` : ''}
          <i>Generated on ${new Date().toLocaleString()}</i>
        ]]>
      </description>
      <styleUrl>#fieldBoundaryStyle</styleUrl>
      <Polygon>
        <extrude>0</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${coordinateString}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

    <!-- Field center point for reference -->
    ${this.generateCenterPlacemark(coordinates, name)}

  </Document>
</kml>`

    return kmlContent
  }

  /**
   * Generate center point placemark for the field
   */
  private static generateCenterPlacemark(coordinates: Coordinate[], fieldName: string): string {
    if (coordinates.length === 0) return ''

    // Calculate center point
    const centerLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length
    const centerLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length

    return `
    <Placemark>
      <name>${this.escapeXml(fieldName || 'Field')} Center</name>
      <Point>
        <coordinates>${centerLng},${centerLat}</coordinates>
      </Point>
    </Placemark>`
  }

  /**
   * Create a downloadable file from KML content
   */
  static createDownloadableFile(kmlContent: string, filename: string): File {
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' })
    return new File([blob], filename, { type: 'application/vnd.google-earth.kml+xml' })
  }

  /**
   * Create a Blob URL for downloading
   */
  static createDownloadUrl(kmlContent: string): string {
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' })
    return URL.createObjectURL(blob)
  }

  /**
   * Clean up Blob URL to prevent memory leaks
   */
  static revokeDownloadUrl(url: string): void {
    URL.revokeObjectURL(url)
  }

  /**
   * Convert field boundary data from John Deere format to standardized format
   */
  static convertJohnDeereBoundary(jdData: any): FieldBoundary {
    // Extract coordinates from John Deere multipolygon format
    const coordinates: Coordinate[] = []

    try {
      // Check multiple possible data structures
      let points: any[] = []

      // Structure 1: jdData.data.boundary.values[0].multipolygons[0].rings[0].points
      if (jdData?.data?.boundary?.values?.[0]?.multipolygons?.[0]?.rings?.[0]?.points) {
        points = jdData.data.boundary.values[0].multipolygons[0].rings[0].points
      }
      // Structure 2: jdData.boundary.values[0].multipolygons[0].rings[0].points
      else if (jdData?.boundary?.values?.[0]?.multipolygons?.[0]?.rings?.[0]?.points) {
        points = jdData.boundary.values[0].multipolygons[0].rings[0].points
      }
      // Structure 3: jdData.values[0].multipolygons[0].rings[0].points
      else if (jdData?.values?.[0]?.multipolygons?.[0]?.rings?.[0]?.points) {
        points = jdData.values[0].multipolygons[0].rings[0].points
      }
      // Structure 4: Direct multipolygons access
      else if (jdData?.multipolygons?.[0]?.rings?.[0]?.points) {
        points = jdData.multipolygons[0].rings[0].points
      }

      // Process the points we found
      for (const point of points) {
        if (point.lat !== undefined && point.lon !== undefined) {
          coordinates.push({
            lat: point.lat,
            lng: point.lon
          })
        } else if (point.x !== undefined && point.y !== undefined) {
          // Some APIs use x,y instead of lat,lon
          coordinates.push({
            lat: point.y,
            lng: point.x
          })
        }
      }

      // Extract area information
      let area: number | undefined
      let areaUnit: string = 'ha'

      if (jdData?.data?.boundary?.values?.[0]?.area?.valueAsDouble) {
        area = jdData.data.boundary.values[0].area.valueAsDouble
        areaUnit = jdData.data.boundary.values[0].area.unit || 'ha'
      }

      return {
        id: jdData?.data?.field?.id || 'unknown',
        name: jdData?.data?.field?.name || jdData?.data?.boundary?.values?.[0]?.name || 'Unnamed Field',
        coordinates,
        area,
        areaUnit,
        metadata: {
          createdTime: jdData?.data?.boundary?.values?.[0]?.createdTime,
          modifiedTime: jdData?.data?.boundary?.values?.[0]?.modifiedTime,
          source: 'John Deere',
          platform: 'johndeere'
        }
      }
    } catch (error) {
      console.error('Error converting John Deere boundary:', error)
      throw new Error('Failed to convert John Deere boundary data')
    }
  }

  /**
   * Escape XML characters for KML content
   */
  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;'
        case '>': return '&gt;'
        case '&': return '&amp;'
        case "'": return '&#39;'
        case '"': return '&quot;'
        default: return c
      }
    })
  }

  /**
   * Generate KML for multiple fields
   */
  static generateMultipleFieldsKML(fields: FieldBoundary[]): string {
    const fieldPlacemarks = fields.map(field => {
      const coordinateString = field.coordinates
        .map(coord => `${coord.lng},${coord.lat}${coord.elevation ? ',' + coord.elevation : ''}`)
        .join(' ')

      return `
    <Placemark>
      <name>${this.escapeXml(field.name || 'Field')}</name>
      <description>
        <![CDATA[
          <b>Field ID:</b> ${field.id}<br/>
          <b>Name:</b> ${field.name}<br/>
          ${field.area ? `<b>Area:</b> ${field.area} ${field.areaUnit || 'ha'}<br/>` : ''}
          ${field.metadata?.source ? `<b>Source:</b> ${field.metadata.source}<br/>` : ''}
        ]]>
      </description>
      <styleUrl>#fieldBoundaryStyle</styleUrl>
      <Polygon>
        <extrude>0</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${coordinateString}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`
    }).join('')

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Field Boundaries Collection</name>
    <description>Multiple field boundaries exported on ${new Date().toLocaleString()}</description>

    <Style id="fieldBoundaryStyle">
      <LineStyle>
        <color>ff00ff00</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>7f00ff00</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>

    ${fieldPlacemarks}

  </Document>
</kml>`

    return kmlContent
  }
}
