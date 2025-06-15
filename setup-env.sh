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
ENVEOF

echo "✅ Created .env.local file"
echo ""
echo "⚠️  IMPORTANT: You need to update the following values in .env.local:"
echo "   1. JOHN_DEERE_CLIENT_ID - Get from https://developer.deere.com/"
echo "   2. JOHN_DEERE_CLIENT_SECRET - Get from https://developer.deere.com/"
echo ""
echo "📖 See docs/ENVIRONMENT_SETUP.md for detailed setup instructions"
echo ""
echo "🔄 After updating the values, restart your development server:"
echo "   npm run dev" 