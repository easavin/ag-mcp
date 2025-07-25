# AgMCP Deployment Guide

This guide covers deploying the Agricultural Management & Chat Platform (AgMCP) to production with proper authentication and John Deere integration.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- Redis (optional, for production caching)
- John Deere Developer Account
- LLM API keys (OpenAI and/or Google)
- Domain name and SSL certificate

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secret-jwt-key-here

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# John Deere API
JOHN_DEERE_CLIENT_ID=your_client_id
JOHN_DEERE_CLIENT_SECRET=your_client_secret
JOHN_DEERE_ENVIRONMENT=production

# LLM APIs
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

## �� Docker Deployment

### Option 1: Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd AgMCP
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

5. **Access the application:**
   - Application: http://localhost:3000
   - Health check: http://localhost:3000/api/health

### Option 2: Docker Build

1. **Build the Docker image:**
   ```bash
   docker build -t agmcp .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name agmcp-app \
     -p 3000:3000 \
     --env-file .env.local \
     agmcp
   ```

## ☁️ Cloud Deployment

### Vercel (Recommended for Serverless)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard:**
   - Go to your project settings
   - Add all environment variables from `.env.local`

### AWS ECS/Fargate

1. **Push image to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   docker tag agmcp:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/agmcp:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/agmcp:latest
   ```

2. **Create ECS task definition:**
   ```json
   {
     "family": "agmcp",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "agmcp",
         "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/agmcp:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "DATABASE_URL",
             "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:agmcp/database-url"
           }
         ]
       }
     ]
   }
   ```

### Google Cloud Run

1. **Build and push to Google Container Registry:**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/agmcp
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy agmcp \
     --image gcr.io/PROJECT-ID/agmcp \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production \
     --set-secrets DATABASE_URL=agmcp-database-url:latest
   ```

## 🗄️ Database Setup

### PostgreSQL

1. **Create database:**
   ```sql
   CREATE DATABASE agmcp;
   CREATE USER agmcp_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE agmcp TO agmcp_user;
   ```

2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed database (optional):**
   ```bash
   npx prisma db seed
   ```

### Database Backup

Set up automated backups:

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
rm backup_$DATE.sql
```

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Obtain SSL certificate:**
   ```bash
   # Using Let's Encrypt
   certbot certonly --webroot -w /var/www/html -d your-domain.com
   ```

2. **Configure Nginx:**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Firewall Configuration

```bash
# UFW (Ubuntu)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

## 📊 Monitoring & Logging

### Health Checks

The application provides a health check endpoint at `/api/health`:

```bash
curl https://your-domain.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "database": { "status": "healthy", "latency": "5ms" },
    "llm": { "status": "healthy", "providers": { "gemini": true, "openai": true } }
  }
}
```

### Logging

Configure structured logging:

```javascript
// In production, use a logging service like Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Monitoring Tools

Recommended monitoring stack:

- **Application Performance:** New Relic, DataDog, or Sentry
- **Infrastructure:** Prometheus + Grafana
- **Uptime:** Pingdom, UptimeRobot
- **Logs:** ELK Stack (Elasticsearch, Logstash, Kibana)

## 🔄 CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that:

1. **Runs tests** on every push/PR
2. **Builds Docker image** on main branch
3. **Deploys to staging** on develop branch
4. **Deploys to production** on main branch

### Manual Deployment

If not using automated CI/CD:

```bash
# 1. Run tests
npm test
npm run test:e2e

# 2. Build application
npm run build

# 3. Build Docker image
docker build -t agmcp:latest .

# 4. Deploy
docker-compose up -d
```

## 🚨 Troubleshooting

### Common Issues

1. **Database connection errors:**
   ```bash
   # Check database connectivity
   npx prisma db pull
   
   # Reset database (development only)
   npx prisma migrate reset
   ```

2. **Memory issues:**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

3. **File upload issues:**
   ```bash
   # Check upload directory permissions
   chmod 755 uploads/
   chown www-data:www-data uploads/
   ```

### Performance Optimization

1. **Enable caching:**
   ```bash
   # Redis for session storage and caching
   REDIS_URL=redis://localhost:6379
   ```

2. **Database optimization:**
   ```sql
   -- Add indexes for frequently queried fields
   CREATE INDEX idx_messages_session_id ON messages(session_id);
   CREATE INDEX idx_messages_created_at ON messages(created_at);
   ```

3. **CDN setup:**
   - Use CloudFront, CloudFlare, or similar for static assets
   - Configure proper cache headers

## 📋 Maintenance

### Regular Tasks

1. **Update dependencies:**
   ```bash
   npm audit
   npm update
   ```

2. **Database maintenance:**
   ```bash
   # Vacuum PostgreSQL
   psql $DATABASE_URL -c "VACUUM ANALYZE;"
   ```

3. **Log rotation:**
   ```bash
   # Configure logrotate
   /var/log/agmcp/*.log {
       daily
       rotate 30
       compress
       delaycompress
       missingok
       notifempty
   }
   ```

### Backup Strategy

1. **Database backups:** Daily automated backups to S3/GCS
2. **File uploads:** Sync to cloud storage
3. **Configuration:** Version control all config files
4. **Secrets:** Use proper secret management (AWS Secrets Manager, etc.)

## 🆘 Support

For deployment issues:

1. Check the health endpoint: `/api/health`
2. Review application logs
3. Verify environment variables
4. Check database connectivity
5. Ensure all required services are running

For additional help, refer to the project documentation or create an issue in the repository.

## Authentication System

The application uses NextAuth.js with credentials provider:

### Demo User (Development)
- **Email**: admin@farm.com
- **Password**: admin123

### Production Setup

1. **Update Password Authentication**: Replace the hardcoded password check in `src/app/api/auth/[...nextauth]/route.ts` with proper password hashing:

```typescript
// Replace this line:
const isPasswordValid = credentials.password === 'admin123'

// With proper bcrypt verification:
const isPasswordValid = await compare(credentials.password, user.hashedPassword)
```

2. **Add User Registration**: Create a registration endpoint to allow new users to sign up.

3. **Add Password Reset**: Implement password reset functionality.

## John Deere Integration Setup

1. **John Deere Developer Portal**:
   - Go to https://developer.deere.com/
   - Create application
   - Set redirect URI: `https://yourdomain.com/api/auth/johndeere/callback`
   - Request scopes: `ag1`, `ag2`, `ag3`, `eq1`, `files`, `offline_access`

2. **Environment Configuration**:
   - Set `JOHN_DEERE_ENVIRONMENT=production`
   - Update redirect URI in production

## Vercel Deployment

### 1. Connect Repository
- Connect your GitHub repository to Vercel
- Set environment variables in Vercel dashboard

### 2. Database Setup
```bash
# Use a managed PostgreSQL service like Neon, Supabase, or PlanetScale
# Update DATABASE_URL in Vercel environment variables
```

### 3. Build Configuration
The application includes proper `next.config.js` and builds automatically.

## Security Considerations

### 1. Environment Variables
- Never commit `.env.local` or `.env` files
- Use strong, unique secrets for `NEXTAUTH_SECRET`
- Rotate API keys regularly

### 2. Authentication
- Implement proper password hashing
- Add rate limiting for auth endpoints
- Use HTTPS in production

### 3. Database
- Use connection pooling
- Regular backups
- Restrict database access

### 4. API Security
- Validate all inputs
- Implement proper error handling
- Monitor API usage

## Monitoring and Maintenance

### 1. Health Checks
- `/api/health` endpoint included
- Monitor database connectivity
- Check John Deere API status

### 2. Logging
- Application logs to console
- Set up log aggregation (e.g., Datadog, LogRocket)
- Monitor error rates

### 3. Performance
- Monitor LLM API usage
- Database query optimization
- CDN for static assets

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Check `NEXTAUTH_SECRET` is set
   - Verify `NEXTAUTH_URL` matches domain
   - Ensure user exists in database

2. **John Deere Connection**:
   - Verify redirect URI matches exactly
   - Check API credentials
   - Confirm required scopes

3. **LLM Integration**:
   - Validate API keys
   - Check rate limits
   - Monitor token usage

### Database Issues
```bash
# Reset database if needed
npx prisma migrate reset
npm run db:seed
```

### Logs
```bash
# Docker logs
docker-compose logs -f app

# Application logs
npm run dev # for development debugging
```

## Scaling Considerations

- Use Redis for session storage
- Implement database read replicas
- CDN for file uploads
- Load balancing for multiple instances
- Queue system for heavy operations

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Check John Deere Developer Portal status 