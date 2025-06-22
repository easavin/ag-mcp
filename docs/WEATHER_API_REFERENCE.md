# Weather API Reference

## Overview

The Weather API integration provides comprehensive agricultural weather data using the Open-Meteo API. This integration is designed specifically for farming applications and includes soil conditions, spray recommendations, and agricultural insights.

**API Provider:** Open-Meteo (https://open-meteo.com)  
**Cost:** Free for non-commercial use, no API key required  
**Coverage:** Global weather data with agricultural variables  
**Update Frequency:** Hourly updates, 7-day forecasts (up to 16 days available)

## Features

### Core Weather Data
- **Current Conditions:** Temperature, humidity, precipitation, wind, pressure
- **Forecasts:** 7-day daily and 24-hour hourly forecasts
- **Weather Codes:** WMO standard weather condition mapping

### Agricultural Specific Data
- **Soil Temperature:** Surface, 6cm, 18cm depth measurements
- **Soil Moisture:** Multi-layer moisture content (0-1cm, 1-3cm, 3-9cm)
- **Evapotranspiration:** ET₀ reference values for irrigation planning
- **UV Index:** Sun exposure risk assessment
- **Spray Conditions:** Real-time suitability analysis for field operations

### Location Services
- **Geocoding:** Search locations by name worldwide
- **Coordinate Support:** Direct latitude/longitude input
- **Field Integration:** Use farm management platform field boundaries

## API Endpoints

### Main Weather Endpoint
```
GET  /api/weather?latitude={lat}&longitude={lon}&days={days}&type={type}
POST /api/weather
```

**Parameters:**
- `latitude` (required): Latitude coordinate (-90 to 90)
- `longitude` (required): Longitude coordinate (-180 to 180)  
- `days` (optional): Forecast days (default: 7, max: 16)
- `type` (optional): Response type (`current`, `agricultural`, `operations`)

**POST Body:**
```json
{
  "location": "Iowa City, IA" | {"latitude": 41.66, "longitude": -91.53},
  "days": 7,
  "type": "agricultural"
}
```

### Location Search Endpoint
```
GET /api/weather/locations?q={query}&count={count}
```

**Parameters:**
- `q` (required): Location search query
- `count` (optional): Number of results (default: 10)

## Response Format

### Agricultural Weather Response
```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 41.668526,
      "longitude": -91.51684,
      "name": "Iowa City",
      "country": "United States",
      "elevation": 209
    },
    "current": {
      "temperature": 30.3,
      "humidity": 68,
      "precipitation": 0,
      "windSpeed": 26.9,
      "windDirection": 208,
      "pressure": 988.1,
      "weatherCondition": "Clear sky",
      "isDay": true
    },
    "forecast": {
      "daily": [
        {
          "date": "2025-06-22",
          "maxTemp": 35.5,
          "minTemp": 25,
          "precipitation": 0,
          "precipitationProbability": 0,
          "windSpeed": 31.2,
          "weatherCondition": "Mainly clear",
          "sunrise": "2025-06-22T05:32",
          "sunset": "2025-06-22T20:44",
          "uvIndex": 7.85
        }
      ],
      "hourly": [
        {
          "time": "2025-06-22T00:00",
          "temperature": 28.5,
          "precipitation": 0,
          "precipitationProbability": 0,
          "windSpeed": 19.8,
          "humidity": 68
        }
      ]
    },
    "agriculture": {
      "soilTemperature": {
        "surface": 25.3,
        "depth6cm": 26.0,
        "depth18cm": 25.7
      },
      "soilMoisture": {
        "surface": 0.207,
        "shallow": 0.212,
        "medium": 0.226
      },
      "evapotranspiration": 0.1,
      "uvIndex": 0,
      "sprayConditions": {
        "suitable": false,
        "windSpeed": 26.9,
        "humidity": 68,
        "temperature": 30.3,
        "notes": [
          "Wind too strong - high drift risk",
          "Temperature too high - evaporation risk"
        ]
      }
    }
  },
  "timestamp": "2025-06-22T15:14:17.983Z"
}
```

## Weather Condition Codes

The API uses WMO (World Meteorological Organization) weather codes:

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1, 2, 3 | Mainly clear, partly cloudy, overcast |
| 45, 48 | Fog and depositing rime fog |
| 51, 53, 55 | Drizzle: Light, moderate, dense |
| 61, 63, 65 | Rain: Slight, moderate, heavy |
| 71, 73, 75 | Snow fall: Slight, moderate, heavy |
| 80, 81, 82 | Rain showers: Slight, moderate, violent |
| 95, 96, 99 | Thunderstorm with hail |

## Spray Condition Evaluation

The API automatically evaluates spray application conditions based on:

### Wind Speed
- **Ideal:** 3-15 km/h
- **Too Calm:** < 3 km/h (drift and poor coverage risk)
- **Too Strong:** > 15 km/h (high drift risk)

### Temperature  
- **Ideal:** 10-25°C
- **Too Low:** < 10°C (reduced efficacy)
- **Too High:** > 25°C (evaporation risk)

### Humidity
- **Ideal:** 50-95%
- **Too Low:** < 50% (increased evaporation risk)

## Usage Examples

### Basic Weather Query
```bash
curl "http://localhost:3000/api/weather?latitude=41.66&longitude=-91.53&type=agricultural"
```

### Location Search
```bash
curl "http://localhost:3000/api/weather/locations?q=Iowa%20City"
```

### Field-Specific Weather (via POST)
```bash
curl -X POST "http://localhost:3000/api/weather" \
  -H "Content-Type: application/json" \
  -d '{"location": "Iowa City, IA", "days": 7}'
```

## Integration with Farm Management Platforms

### Field Boundary Integration
When integrated with farm management platforms (John Deere, Auravant), the weather API can:

1. **Extract Field Coordinates:** Use field boundary center points
2. **Field-Specific Forecasts:** Get weather for individual fields
3. **Operation Planning:** Combine weather with field operation schedules

### Example Field Weather Flow
```typescript
// 1. Get field from farm platform
const fields = await johnDeereAPI.getFields(organizationId)
const targetField = fields.find(f => f.name === "North Field")

// 2. Extract field center coordinates
const coordinates = extractFieldCenter(targetField.boundary)

// 3. Get weather for field location
const weather = await weatherAPI.getAgriculturalWeather(
  coordinates.latitude,
  coordinates.longitude
)

// 4. Combine with field context
const response = formatFieldWeatherResponse(targetField, weather)
```

## Error Handling

### Common HTTP Status Codes
- `200 OK`: Successful request
- `400 Bad Request`: Invalid parameters (missing lat/lon, invalid coordinates)
- `404 Not Found`: Location not found (for location search)
- `500 Internal Server Error`: API or network error

### Error Response Format
```json
{
  "error": "Invalid latitude or longitude values",
  "details": "Latitude must be between -90 and 90"
}
```

## Rate Limits and Best Practices

### Rate Limiting
- **Open-Meteo:** No explicit rate limits for free tier
- **Recommended:** Cache responses for 15-30 minutes for same location
- **Batch Requests:** For multiple fields, batch requests when possible

### Best Practices
1. **Cache Weather Data:** Don't request same location data frequently
2. **Use Appropriate Forecast Days:** Only request needed forecast length
3. **Handle Network Errors:** Implement retry logic with exponential backoff
4. **Validate Coordinates:** Ensure lat/lon are within valid ranges
5. **Fallback Handling:** Provide graceful degradation if weather unavailable

## Data Sources and Accuracy

### Weather Models Used
Open-Meteo combines data from multiple national weather services:
- **ECMWF IFS:** European Centre for Medium-Range Weather Forecasts
- **NOAA GFS:** Global Forecast System (US)
- **DWD ICON:** German Weather Service
- **Météo-France ARPEGE:** French Meteorological Service

### Update Schedule
- **Current Weather:** Updated hourly
- **Forecasts:** Updated 4 times daily (00, 06, 12, 18 UTC)
- **Soil Data:** Updated daily
- **Historical Data:** Available up to 2 years back

### Accuracy Notes
- **Temperature:** ±1-2°C typical accuracy
- **Precipitation:** Probability-based, timing may vary ±3-6 hours
- **Wind:** ±2-5 km/h typical accuracy
- **Soil Conditions:** Model-based estimates, not direct measurements

## Agricultural Applications

### Planting Decisions
- **Soil Temperature:** Optimal germination conditions
- **Moisture Levels:** Seedbed preparation timing
- **Weather Windows:** Avoid planting before storms

### Spray Applications
- **Wind Conditions:** Drift prevention
- **Temperature/Humidity:** Efficacy optimization
- **Rain Forecasts:** Application timing

### Harvest Planning
- **Moisture Conditions:** Field accessibility
- **Weather Windows:** Equipment operation planning
- **Crop Drying:** Post-harvest handling

### Irrigation Management
- **Evapotranspiration:** Water requirement calculations
- **Precipitation Forecasts:** Irrigation scheduling
- **Soil Moisture:** Current field conditions

## Testing and Development

### Test Endpoints
Use the test page at `/weather-test` to:
- Test location search functionality
- View complete agricultural weather data
- Validate spray condition analysis
- Check forecast accuracy

### Sample Test Locations
```javascript
// Major agricultural regions for testing
const testLocations = [
  { name: "Iowa City, IA", lat: 41.66, lon: -91.53 }, // Corn Belt
  { name: "Fresno, CA", lat: 36.74, lon: -119.77 },   // Central Valley
  { name: "Lincoln, NE", lat: 40.81, lon: -96.68 },   // Great Plains
  { name: "Ames, IA", lat: 42.03, lon: -93.62 }       // Research area
]
```

## Support and Resources

### Documentation Links
- **Open-Meteo API Docs:** https://open-meteo.com/en/docs
- **Weather Variables:** https://open-meteo.com/en/docs#weathervariables
- **Geocoding API:** https://open-meteo.com/en/docs/geocoding-api

### Agricultural Weather Resources
- **WMO Guidelines:** Weather codes and standards
- **Spray Application Guidelines:** University extension resources
- **Evapotranspiration:** FAO-56 reference methods

---

**Last Updated:** January 2025  
**API Version:** 1.0  
**Next Review:** After integration completion 