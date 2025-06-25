import { GET } from '../../health/route'

describe('GET /api/health', () => {
  it('should return health status', async () => {
    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      status: expect.any(String),
      timestamp: expect.any(String),
      version: expect.any(String),
      environment: expect.any(String),
      uptime: expect.any(Number),
      responseTime: expect.any(String),
      services: expect.any(Object),
      system: expect.any(Object),
    })
  })

  it('should return valid timestamp', async () => {
    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    const timestamp = new Date(data.timestamp)
    expect(timestamp).toBeInstanceOf(Date)
    expect(timestamp.getTime()).toBeCloseTo(Date.now(), -3) // Within 1 second
  })
}) 