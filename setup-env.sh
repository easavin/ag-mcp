#!/bin/bash

echo "Setting up environment file for Ag Assistant..."

# Create .env.local file
cat > .env.local << 'ENVEOF'
# John Deere API Configuration
# Get these from your John Deere Developer Portal: https://developer.deere.com/
JOHN_DEERE_CLIENT_ID=your_client_id_here
JOHN_DEERE_CLIENT_SECRET=your_client_secret_here
JOHN_DEERE_ENVIRONMENT=sandbox

# Application URL (for OAuth redirects)
# For local development, use: http://localhost:3000
# For production, use your actual domain: https://yourdomain.com
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL="file:./dev.db"

# LLM API Keys
# Google Gemini API Key - Get from https://ai.google.dev/
GOOGLE_API_KEY=your_google_api_key_here

# OpenAI API Key (fallback) - Get from https://platform.openai.com/
OPENAI_API_KEY=your_openai_api_key_here

# Response Quality Control
# Enable LLM response validation to improve answer quality
ENABLE_REASONING_VALIDATION=true

# Satshot GIS Configuration
# Get these from your Satshot account: https://www.satshot.com/
SATSHOT_USERNAME=your_username_here
SATSHOT_PASSWORD=your_password_here
SATSHOT_SERVER=us  # us, ca, or mexico

# MCP Server Enablement Flags
ENABLE_MCP_ARCHITECTURE=true
ENABLE_MCP_JOHN_DEERE=true
ENABLE_MCP_WEATHER=true
ENABLE_MCP_USDA=true
ENABLE_MCP_EU_COMMISSION=true
ENABLE_MCP_AURAVANT=true
ENABLE_MCP_SATSHOT=true
ENVEOF

echo "✅ Created .env.local file"
echo ""
echo "⚠️  IMPORTANT: You need to update the following values in .env.local:"
echo "   1. JOHN_DEERE_CLIENT_ID - Get from https://developer.deere.com/"
echo "   2. JOHN_DEERE_CLIENT_SECRET - Get from https://developer.deere.com/"
echo "   3. GOOGLE_API_KEY - Get from https://ai.google.dev/"
echo "   4. OPENAI_API_KEY - Get from https://platform.openai.com/ (optional, used as fallback)"
echo "   5. SATSHOT_USERNAME - Get from https://www.satshot.com/"
echo "   6. SATSHOT_PASSWORD - Get from https://www.satshot.com/"
echo ""
echo "📖 See docs/ENVIRONMENT_SETUP.md for detailed setup instructions"
echo ""
echo "🔄 After updating the values, restart your development server:"
echo "   npm run dev" 