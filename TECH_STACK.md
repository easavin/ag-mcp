# AgMCP Technology Stack Documentation

## Overview
AgMCP (Agricultural Management Control Platform) is a modern full-stack web application designed for precision agriculture and farm management. This document outlines the complete technology stack, architecture, and integrations used in the project.

## Core Technologies

### Frontend Framework
- **Next.js 14.0.4** - React-based full-stack framework
  - App Router for modern routing
  - Server-side rendering (SSR) and static site generation (SSG)
  - API routes for backend functionality
  - Built-in optimization features

### Programming Languages
- **TypeScript** - Primary language for type-safe development
- **JavaScript** - Supporting language for certain configurations
- **SQL** - Database queries and migrations

### UI/UX Framework
- **React 18** - Component-based user interface library
- **Tailwind CSS 3** - Utility-first CSS framework
- **Lucide React** - Icon library for consistent iconography
- **Custom CSS** - Additional styling for complex components

## Backend Architecture

### Runtime Environment
- **Node.js** - JavaScript runtime for server-side execution
- **Next.js API Routes** - Serverless API endpoints

### Database Stack
- **SQLite** - Development database (via Prisma)
- **Prisma ORM** - Type-safe database access layer
  - Schema definition and migration management
  - Type-safe database queries
  - Database seeding capabilities

### Authentication & Authorization
- **NextAuth.js** - Complete authentication solution
  - Session management
  - JWT token handling
  - Credentials provider for email/password authentication
  - Secure session storage

### External API Integrations
- **John Deere API** - Agricultural equipment and farm data
  - OAuth 2.0 authentication flow
  - RESTful API integration
  - Real-time farm data access (fields, equipment, operations)

## AI/ML Services

### Large Language Models (LLM)
- **OpenAI GPT-4o-mini** - Primary LLM service
- **Google Gemini 2.0 Flash** - Alternative LLM service
- **Function Calling** - Structured AI interactions with external APIs

### AI Framework Integration
- **MCP (Model Context Protocol)** - AI tool integration framework
- **Custom MCP Tools** - Agricultural-specific AI tools for:
  - Field operation scheduling
  - Equipment maintenance alerts
  - Field recommendations
  - Operation history analysis

## Development Tools

### Package Management
- **npm** - Node.js package manager
- **package.json** - Dependency management and scripts

### Code Quality & Testing
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Jest** - Unit testing framework
- **Playwright** - End-to-end testing
- **TypeScript** - Static type checking

### Build & Development
- **Webpack** - Module bundler (via Next.js)
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## State Management

### Client-Side State
- **Zustand** - Lightweight state management
  - Chat store for conversation management
  - Auth store for user authentication state
  - File store for file upload management

### Server-Side State
- **React Server Components** - Server-side state management
- **API Routes** - Server-side data fetching and mutations

## UI Components & Libraries

### Component Libraries
- **Custom React Components** - Purpose-built UI components
- **React Markdown** - Markdown rendering for AI responses
- **Lucide React** - Icon components

### Responsive Design
- **CSS Grid & Flexbox** - Layout systems
- **Mobile-first design** - Responsive breakpoints
- **Custom responsive components**

## File Handling & Storage

### File Upload
- **Built-in Next.js file handling** - Multipart form data processing
- **Client-side file validation** - Type and size checking
- **Drag & drop interface** - User-friendly file uploads

### File Processing
- **Agricultural file format support**:
  - Shapefiles (.shp, .dbf, .shx)
  - GeoJSON files
  - Prescription maps
  - Farm boundary data

## API Architecture

### RESTful APIs
- **John Deere Integration APIs**:
  - `/api/johndeere/organizations` - Organization management
  - `/api/johndeere/organizations/[orgId]/fields` - Field data
  - `/api/johndeere/organizations/[orgId]/equipment` - Equipment data
  - `/api/johndeere/organizations/[orgId]/operations` - Operation records

### Authentication APIs
- **NextAuth.js APIs**:
  - `/api/auth/[...nextauth]` - Authentication handling
  - `/api/auth/johndeere/*` - John Deere OAuth flow
  - `/api/user` - User profile management

### Chat & AI APIs
- **LLM Integration APIs**:
  - `/api/chat/completion` - AI conversation endpoint
  - `/api/chat/sessions` - Session management
  - `/api/mcp/tools` - MCP tool execution

## Security Features

### Authentication Security
- **JWT Tokens** - Secure session management
- **CSRF Protection** - Cross-site request forgery prevention
- **Secure Cookies** - HttpOnly and Secure flags
- **Session Expiration** - Automatic logout

### API Security
- **Rate Limiting** - API abuse prevention
- **CORS Configuration** - Cross-origin request control
- **Input Validation** - Server-side data validation
- **Error Handling** - Secure error responses

### Data Protection
- **Environment Variables** - Secure configuration management
- **API Key Management** - Encrypted storage of sensitive keys
- **OAuth 2.0** - Secure third-party authentication

## Development Environment

### Environment Configuration
- **Environment Variables**:
  - `DATABASE_URL` - Database connection string
  - `NEXTAUTH_SECRET` - Authentication secret
  - `NEXTAUTH_URL` - Application base URL
  - `OPENAI_API_KEY` - OpenAI service key
  - `GOOGLE_API_KEY` - Google AI service key
  - `JOHNDEERE_CLIENT_ID` - John Deere API client ID
  - `JOHNDEERE_CLIENT_SECRET` - John Deere API secret

### Development Scripts
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "jest",
  "test:e2e": "playwright test"
}
```

## Production Deployment

### Build Process
- **Next.js Build** - Optimized production build
- **Static Asset Optimization** - Image and CSS optimization
- **Code Splitting** - Automatic bundle optimization

### Docker Support
- **Dockerfile** - Containerized deployment
- **docker-compose.yml** - Multi-service orchestration
- **Environment isolation** - Containerized dependencies

## Monitoring & Logging

### Application Monitoring
- **Console Logging** - Development debugging
- **Error Boundaries** - React error handling
- **Request Logging** - API request tracking

### Performance Monitoring
- **Next.js Analytics** - Built-in performance metrics
- **Client-side Error Tracking** - Runtime error detection
- **API Response Monitoring** - External service health

## Agricultural Domain Features

### John Deere Integration
- **Equipment Data** - Tractor, harvester, and implement information
- **Field Management** - Boundary mapping and field operations
- **Operations Tracking** - Planting, harvesting, and maintenance records
- **File Management** - Prescription maps and agricultural documents

### AI-Powered Features
- **Natural Language Queries** - Conversational farm data access
- **Intelligent Recommendations** - AI-driven farming insights
- **Automated Scheduling** - Smart operation planning
- **Data Visualization** - Interactive charts and maps

## Future Technology Considerations

### Scalability
- **Database Migration** - PostgreSQL for production
- **Microservices Architecture** - Service decomposition
- **Caching Layer** - Redis for performance optimization

### Additional Integrations
- **Climate FieldView** - Additional data source integration
- **Weather APIs** - Real-time weather data
- **Satellite Imagery** - Field monitoring capabilities
- **IoT Sensors** - Real-time field condition monitoring

## Development Workflow

### Version Control
- **Git** - Source code management
- **GitHub** - Repository hosting and collaboration

### Code Standards
- **TypeScript Strict Mode** - Enhanced type safety
- **ESLint Configuration** - Code quality enforcement
- **Prettier Configuration** - Consistent code formatting
- **Conventional Commits** - Standardized commit messages

This technology stack provides a robust, scalable, and maintainable foundation for agricultural management applications, combining modern web technologies with domain-specific agricultural integrations and AI capabilities. 