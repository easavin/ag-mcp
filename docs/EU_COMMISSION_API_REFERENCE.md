# EU Commission Agri-food Data Portal API Reference

## Overview

The EU Commission Agri-food Data Portal integration provides access to comprehensive agricultural market data from the European Commission's Directorate-General for Agriculture and Rural Development. This integration offers market prices, production statistics, trade data, and market dashboards for all major agricultural sectors across EU member states.

## Key Features

- **No Authentication Required**: Open access to agricultural market data
- **Comprehensive Coverage**: All major agricultural sectors (beef, dairy, cereals, etc.)
- **Multi-State Data**: Information for EU as a whole and individual member states
- **Multiple Data Types**: Prices, production, trade, and dashboard views
- **Real-time Updates**: Current market conditions and historical trends

## Base URL

```
https://your-domain.com/api/eu-agri
```

## Available Endpoints

### 1. Market Data Endpoint

**GET/POST** `/api/eu-agri/markets`

#### Query Parameters (GET)

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `sector` | string | No | Market sector (see sectors below) | `CEREALS` |
| `dataType` | string | No | Type of data to retrieve | `prices` |
| `memberState` | string | No | EU member state code | `EU` |
| `limit` | number | No | Maximum number of results | `20` |

#### Request Body (POST - for search)

```json
{
  "query": "beef prices",
  "sector": "BEEF",
  "dataType": "prices",
  "limit": 10
}
```

#### Example Requests

```bash
# Get cereal prices for EU
GET /api/eu-agri/markets?sector=CEREALS&dataType=prices&memberState=EU&limit=10

# Get beef production data for Germany
GET /api/eu-agri/markets?sector=BEEF&dataType=production&memberState=DE

# Get market dashboard for dairy sector
GET /api/eu-agri/markets?sector=DAIRY&dataType=dashboard

# Search for price data
POST /api/eu-agri/markets
{
  "query": "wheat prices",
  "dataType": "prices",
  "limit": 5
}
```

## Market Sectors

| Sector Code | Description | Products Included |
|-------------|-------------|-------------------|
| `BEEF` | Beef and cattle | Beef carcasses, live cattle, beef cuts |
| `PIGMEAT` | Pork and pigs | Pig carcasses, piglets, pork cuts |
| `DAIRY` | Milk and dairy products | Raw milk, butter, cheese, milk powder |
| `EGGS_POULTRY` | Eggs and poultry | Eggs, broiler chickens, turkey |
| `SHEEP_GOAT` | Sheep and goat meat | Lamb, mutton, goat meat |
| `CEREALS` | Cereal grains | Wheat, barley, maize, oats, rye |
| `RICE` | Rice products | Paddy rice, husked rice, milled rice |
| `OILSEEDS` | Oilseeds and protein crops | Rapeseed, sunflower seeds, soybeans |
| `FRUITS_VEGETABLES` | Fresh produce | Tomatoes, apples, citrus fruits |
| `SUGAR` | Sugar products | Sugar beet, white sugar |
| `OLIVE_OIL` | Olive oil and olives | Extra virgin olive oil, virgin olive oil |
| `WINE` | Wine products | Red wine, white wine, sparkling wine |
| `FERTILIZER` | Fertilizers | Nitrogen, phosphorus, potash fertilizers |
| `ORGANIC` | Organic products | Organic wheat, milk, beef |

## Data Types

### 1. Market Prices (`prices`)

Current and historical market prices for agricultural products.

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "product": "Wheat",
      "category": "weekly",
      "memberState": "EU",
      "price": 256.53,
      "currency": "EUR",
      "unit": "tonne",
      "date": "2025-06-22",
      "quality": "Feed quality"
    }
  ],
  "metadata": {
    "source": "EU Commission Agri-food Data Portal",
    "lastUpdated": "2025-06-22T18:28:16.164Z",
    "disclaimer": "Data provided by European Commission DG Agriculture and Rural Development",
    "dataProvider": "European Commission"
  }
}
```

### 2. Production Data (`production`)

Production statistics by member state and product.

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "product": "Wheat",
      "sector": "cereals",
      "memberState": "EU",
      "quantity": 45.67,
      "unit": "million tonnes",
      "period": "2025-06",
      "year": 2025,
      "month": 6
    }
  ],
  "metadata": { /* ... */ }
}
```

### 3. Trade Data (`trade`)

Import and export statistics with partner countries.

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "product": "Wheat",
      "sector": "cereals",
      "tradeType": "import",
      "partnerCountry": "US",
      "quantity": 2.5,
      "value": 450000,
      "unit": "million tonnes",
      "period": "2025-06",
      "year": 2025,
      "month": 6
    }
  ],
  "metadata": { /* ... */ }
}
```

### 4. Market Dashboard (`dashboard`)

Comprehensive market overview with key indicators.

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "sector": "cereals",
    "title": "Cereals Market Dashboard",
    "description": "Overview of EU cereals market conditions...",
    "keyIndicators": [
      {
        "name": "Average EU Price",
        "value": 256.53,
        "unit": "EUR/tonne",
        "trend": "up",
        "change": "4.4%"
      }
    ],
    "priceHighlights": [ /* Recent price data */ ],
    "productionHighlights": [ /* Recent production data */ ],
    "lastUpdated": "2025-06-22T18:28:23.494Z"
  },
  "metadata": { /* ... */ }
}
```

## EU Member States

The API supports data for the following EU member states:

| Code | Country | Code | Country | Code | Country |
|------|---------|------|---------|------|---------|
| `AT` | Austria | `BE` | Belgium | `BG` | Bulgaria |
| `CY` | Cyprus | `CZ` | Czech Republic | `DE` | Germany |
| `DK` | Denmark | `EE` | Estonia | `ES` | Spain |
| `FI` | Finland | `FR` | France | `GR` | Greece |
| `HR` | Croatia | `HU` | Hungary | `IE` | Ireland |
| `IT` | Italy | `LT` | Lithuania | `LU` | Luxembourg |
| `LV` | Latvia | `MT` | Malta | `NL` | Netherlands |
| `PL` | Poland | `PT` | Portugal | `RO` | Romania |
| `SE` | Sweden | `SI` | Slovenia | `SK` | Slovakia |

Use `EU` for European Union aggregate data.

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "data": [],
  "metadata": {
    "source": "EU Commission Agri-food Data Portal",
    "lastUpdated": "2025-06-22T18:28:16.164Z",
    "disclaimer": "Data provided by European Commission DG Agriculture and Rural Development",
    "dataProvider": "European Commission"
  },
  "error": "Error description"
}
```

### Common Error Codes

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| `400` | Bad Request | Invalid parameters or missing required fields |
| `404` | Not Found | Requested resource not found |
| `500` | Internal Server Error | Server-side error processing request |

## Integration Examples

### JavaScript/TypeScript

```typescript
import { euAgriAPI, MARKET_SECTORS } from '@/lib/eu-agri-api'

// Get current beef prices for Germany
const beefPrices = await euAgriAPI.getMarketPrices(
  MARKET_SECTORS.BEEF,
  {
    memberState: 'DE',
    limit: 10
  }
)

// Get production data for cereals
const cerealProduction = await euAgriAPI.getProductionData(
  MARKET_SECTORS.CEREALS,
  {
    memberState: 'EU',
    year: 2025
  }
)

// Get market dashboard
const dashboard = await euAgriAPI.getMarketDashboard(
  MARKET_SECTORS.DAIRY
)
```

### REST API Calls

```javascript
// Fetch market prices
const response = await fetch('/api/eu-agri/markets?sector=BEEF&dataType=prices&memberState=DE')
const data = await response.json()

// Search for data
const searchResponse = await fetch('/api/eu-agri/markets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'dairy prices',
    sector: 'DAIRY',
    limit: 5
  })
})
const searchData = await searchResponse.json()
```

## Agricultural Applications

### Market Analysis
- **Price Monitoring**: Track price trends across different member states
- **Seasonal Patterns**: Analyze seasonal price variations for planning
- **Market Comparison**: Compare prices between different EU regions

### Production Planning
- **Yield Benchmarking**: Compare production statistics with EU averages
- **Crop Selection**: Use market data to inform planting decisions
- **Supply Chain**: Understand production volumes for logistics planning

### Trade Intelligence
- **Export Opportunities**: Identify potential export markets
- **Import Trends**: Monitor import patterns and competition
- **Market Positioning**: Understand trade flows and market dynamics

### Risk Management
- **Price Volatility**: Monitor price stability for risk assessment
- **Market Trends**: Identify long-term market direction
- **Diversification**: Use multi-sector data for portfolio decisions

## Data Quality and Limitations

### Data Sources
- **Primary Source**: European Commission DG Agriculture and Rural Development
- **Member State Reporting**: Data collected from national authorities
- **Quality Assurance**: Regular validation and consolidation processes

### Update Frequency
- **Prices**: Weekly updates for most sectors
- **Production**: Monthly and annual statistics
- **Trade**: Monthly trade statistics with 2-month delay
- **Dashboards**: Weekly compilation of key indicators

### Coverage Notes
- Some historical data may be limited for newer member states
- Organic product data may have limited coverage
- Small-scale or regional products may not be included
- Data accuracy depends on member state reporting quality

## Rate Limits and Usage

### API Limits
- No authentication required for basic access
- Reasonable use policy applies
- No hard rate limits currently implemented
- Consider caching for production applications

### Best Practices
- Cache responses when possible to reduce API calls
- Use appropriate `limit` parameters to control response size
- Monitor error rates and implement retry logic
- Respect the data source and attribution requirements

## Support and Resources

### Documentation
- **Official Portal**: https://agridata.ec.europa.eu/extensions/DataPortal/
- **API Documentation**: https://agridata.ec.europa.eu/extensions/DataPortal/API_Documentation.html
- **Help Desk**: agri-ext-helpdesk@ec.europa.eu

### Integration Support
- Test your integration using the test page: `/eu-agri-test`
- Monitor the console for detailed error messages
- Check network requests for API response details
- Use browser developer tools for debugging

## Version History

### v1.0.0 (Current)
- Initial implementation with mock data structure
- Support for all major agricultural sectors
- Complete API interface matching EU Commission structure
- Integration with multi-source chat interface
- Comprehensive test page and documentation

### Future Enhancements
- Real-time API connection to EU Commission endpoints
- Enhanced search and filtering capabilities
- Historical data analysis tools
- Export functionality for data analysis
- Advanced visualization components 