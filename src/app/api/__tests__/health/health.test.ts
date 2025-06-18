import { NextRequest } from 'next/server'
import { GET } from '../../health/route'

describe('GET /api/health', () => {
  it('should return health status', async () => {
    // Arrange
    const request = new NextRequest('http://localhost/api/health')

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      version: expect.any(String),
    })
  })

  it('should return valid timestamp', async () => {
    // Arrange
    const request = new NextRequest('http://localhost/api/health')

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    const timestamp = new Date(data.timestamp)
    expect(timestamp).toBeInstanceOf(Date)
    expect(timestamp.getTime()).toBeCloseTo(Date.now(), -3) // Within 1 second
  })
}) 