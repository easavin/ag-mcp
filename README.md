# Ag MCP - Agricultural Model Context Protocol Chat Interface

A Claude-style chat interface that connects to agricultural platforms (John Deere Operations Center, Auravant) and weather data via MCP (Model Context Protocol), allowing farmers to interact with their farming data through natural conversation and upload prescription shapefiles.

## Features

- 🚜 **John Deere Integration**: Connect to Operations Center for real-time farm data
- 🌾 **Auravant Integration**: Connect to livestock and field management platform
- 🌤️ **Weather Data**: Real-time weather conditions, forecasts, and agricultural insights
- �� **Natural Language Chat**: Ask questions about your fields, equipment, operations, and weather
- �� **File Upload**: Drag & drop prescription files (shapefiles, KML, GeoJSON)
- 📊 **Multi-Source Data**: Combine data from multiple platforms for comprehensive insights
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 🔐 **Secure Authentication**: OAuth2 integration with farm management platforms

## Integrations

### Farm Management Platforms
- **John Deere Operations Center**: Fields, equipment, operations, work records
- **Auravant**: Livestock management, work orders, field operations

### Environmental Data
- **Weather API (Open-Meteo)**: Current conditions, forecasts, soil data, spray conditions

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Weather API**: Open-Meteo (free, no API key required)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- John Deere Developer Account (for API access)
- Auravant Account (for livestock/field management)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ag-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- Get John Deere API credentials from [MyJohnDeere Developer Portal](https://developer.deere.com/)
- Add your preferred LLM API key (OpenAI or Anthropic)
- Weather data requires no API key (uses Open-Meteo free tier)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

```env
# John Deere API
JOHN_DEERE_CLIENT_ID=your_client_id_here
JOHN_DEERE_CLIENT_SECRET=your_client_secret_here
JOHN_DEERE_ENVIRONMENT=sandbox

# LLM API (choose one)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Application
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Weather API (Open-Meteo) - No API key required
# Weather data is automatically available
```

## Usage Examples

### Weather Queries
- "What's the current weather?"
- "Show me the 7-day forecast"
- "Are conditions good for spraying?"
- "What's the weather on my North Field?" (combines farm data + weather)

### Farm Management Queries
- "Show me my fields"
- "What equipment is available?"
- "Recent operations on Field 5"
- "Upload prescription for corn planting"

### Multi-Source Queries
- "Weather and equipment status for today"
- "Should I spray tomorrow based on weather and field conditions?"
- "Compare weather across all my fields"

## Documentation

### API References
- [Weather API Reference](./docs/WEATHER_API_REFERENCE.md) - Complete weather API documentation
- [John Deere API Reference](./docs/JOHN_DEERE_API_REFERENCE.md) - Farm platform integration
- [Auravant API Reference](./docs/AURAVANT_API_REFERENCE.md) - Livestock platform integration
- [Climate FieldView API Reference](./docs/CLIMATE_FIELDVIEW_API_REFERENCE.md) - Future integration

### Integration Plans
- [Weather Integration Plan](./docs/WEATHER_INTEGRATION_PLAN.md) - Weather UI integration roadmap
- [Climate FieldView Integration Plan](./docs/CLIMATE_FIELDVIEW_INTEGRATION_PLAN.md) - Multi-platform architecture
- [Auravant Integration Plan](./docs/AURAVANT_INTEGRATION_PLAN.md) - Livestock integration
- [Implementation Steps Summary](./docs/IMPLEMENTATION_STEPS_SUMMARY.md) - Quick implementation guide

### Setup Guides
- [Environment Setup](./docs/ENVIRONMENT_SETUP.md) - Development environment configuration
- [Phase 3 Setup](./docs/PHASE3_SETUP.md) - Advanced setup instructions

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier

### Testing

- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:weather` - Test weather API integration
- Visit `/weather-test` for interactive weather API testing

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/             # API routes
│   │   ├── weather/     # Weather API endpoints
│   │   ├── johndeere/   # John Deere API endpoints
│   │   └── auravant/    # Auravant API endpoints
│   └── weather-test/    # Weather API test page
├── components/          # React components
│   ├── ChatLayout.tsx   # Main chat interface layout
│   ├── MessageBubble.tsx # Individual message component
│   ├── ChatInput.tsx    # Message input with file upload
│   └── MultiSourceSelector.tsx # Data source selection
├── lib/                 # Utility functions
│   ├── weather-api.ts   # Weather API client
│   ├── johndeere-api.ts # John Deere API client
│   └── mcp-tools.ts     # MCP tool implementations
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
└── docs/                # Documentation
```

## Roadmap

This project follows a phased development approach:

### ✅ Phase 1: Foundation & Core Infrastructure
- [x] Next.js project setup with TypeScript
- [x] Basic chat UI components
- [x] Chat history sidebar
- [x] File upload capability

### ✅ Phase 2: Data Layer & State Management
- [x] Database setup (SQLite/PostgreSQL)
- [x] State management with Zustand
- [x] Chat session persistence

### ✅ Phase 3: Platform Integrations
- [x] John Deere OAuth2 authentication flow
- [x] John Deere API client and MCP implementation
- [x] Weather API integration (Open-Meteo)
- [x] Auravant platform integration
- [x] Multi-source data selection

### 🚧 Phase 4: Enhanced Features
- [ ] Climate FieldView integration
- [ ] Advanced weather visualizations
- [ ] Cross-platform data analysis
- [ ] Mobile app development

### 📋 Phase 5: Advanced Analytics
- [ ] Predictive analytics
- [ ] Machine learning insights
- [ ] Custom reporting
- [ ] API marketplace

## Weather Integration

The weather integration provides comprehensive agricultural weather data:

### Features
- **Current Conditions**: Temperature, humidity, wind, precipitation
- **7-Day Forecasts**: Daily and hourly weather predictions
- **Agricultural Data**: Soil temperature, soil moisture, evapotranspiration
- **Spray Conditions**: Real-time suitability analysis for field operations
- **Field-Specific Weather**: Weather data for individual farm fields

### Benefits
- **Free Access**: No API key required, completely free
- **Agricultural Focus**: Designed specifically for farming applications
- **Global Coverage**: Weather data available worldwide
- **Real-Time Updates**: Hourly updates and accurate forecasts

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email [your-email] or open an issue on GitHub.

## Acknowledgments

- **Open-Meteo**: Free weather API providing agricultural weather data
- **John Deere**: Farm management platform integration
- **Auravant**: Livestock and field management platform
- **Anthropic Claude**: LLM integration for natural language processing
