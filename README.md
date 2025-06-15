# Ag MCP - Agricultural Model Context Protocol Chat Interface

A Claude-style chat interface that connects to John Deere Operations Center via MCP (Model Context Protocol), allowing farmers to interact with their farming data through natural conversation and upload prescription shapefiles.

## Features

- 🚜 **John Deere Integration**: Connect to Operations Center for real-time farm data
- 💬 **Natural Language Chat**: Ask questions about your fields, equipment, and operations
- 📁 **File Upload**: Drag & drop prescription files (shapefiles, KML, GeoJSON)
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 🔐 **Secure Authentication**: OAuth2 integration with John Deere

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Radix UI
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- John Deere Developer Account (for API access)

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
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ChatLayout.tsx   # Main chat interface layout
│   ├── MessageBubble.tsx # Individual message component
│   └── ChatInput.tsx    # Message input with file upload
├── lib/                 # Utility functions
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
└── api/                 # API routes
```

## Roadmap

This project follows a phased development approach:

### ✅ Phase 1: Foundation & Core Infrastructure
- [x] Next.js project setup with TypeScript
- [x] Basic chat UI components
- [x] Chat history sidebar
- [x] File upload capability

### 🚧 Phase 2: Data Layer & State Management
- [ ] Database setup (SQLite/PostgreSQL)
- [ ] State management with Zustand
- [ ] Chat session persistence

### 📋 Phase 3: John Deere Integration
- [ ] OAuth2 authentication flow
- [ ] MCP server implementation
- [ ] John Deere API client

### 📋 Phase 4: MCP Implementation
- [ ] Core MCP resources (fields, equipment, operations)
- [ ] Prescription file upload to John Deere
- [ ] Natural language processing integration

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
