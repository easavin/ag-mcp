# Environment Setup

This document explains how to set up the required environment variables for the Ag Assistant application.

## Required Environment Variables

Create a `.env.local` file in the root directory of your project with the following variables:

```bash
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
```

## John Deere Developer Setup

1. **Create a John Deere Developer Account**
   - Go to https://developer.deere.com/
   - Sign up for a developer account
   - Complete the registration process

2. **Create an Application**
   - Log into the John Deere Developer Portal
   - Create a new application
   - Set the redirect URI to: `http://localhost:3000/api/auth/johndeere/callback`
   - Request the following scopes: `ag1`, `ag2`, `ag3`

3. **Get Your Credentials**
   - Copy your Client ID and Client Secret
   - Add them to your `.env.local` file

## Environment Configuration

### Development
```bash
JOHN_DEERE_ENVIRONMENT=sandbox
NEXTAUTH_URL=http://localhost:3000
```

### Production
```bash
JOHN_DEERE_ENVIRONMENT=production
NEXTAUTH_URL=https://yourdomain.com
```

## Troubleshooting

### "undefined/api/auth/johndeere/callback" Error
This error occurs when the `NEXTAUTH_URL` environment variable is not set. Make sure you have:
1. Created the `.env.local` file
2. Set `NEXTAUTH_URL=http://localhost:3000` for local development
3. Restarted your development server after adding the environment variables

### "John Deere API credentials not configured" Error
This error occurs when the John Deere credentials are missing. Make sure you have:
1. Set `JOHN_DEERE_CLIENT_ID` with your actual client ID
2. Set `JOHN_DEERE_CLIENT_SECRET` with your actual client secret
3. Both values should not contain the placeholder text

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your client secret secure and never expose it in client-side code
- Use different credentials for development and production environments
- Regularly rotate your API credentials 