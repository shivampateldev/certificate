# Certificate Management Platform - NestJS Backend

Production-ready NestJS backend for the Certificate Management Platform with complete authentication, file handling, certificate generation, email delivery, and analytics.

## Features

### Core Modules (14 Total)
1. **Authentication** - JWT with refresh tokens, password reset, 2FA support
2. **Users** - User management, roles, and permissions
3. **Organizations** - Multi-tenant organization management
4. **Templates** - Certificate template management with image upload
5. **Campaigns** - Certificate generation campaigns
6. **Participants** - Participant management with CSV import
7. **Certificates** - Certificate generation, verification, and delivery
8. **Email** - Real SMTP email sending with multiple providers
9. **Files** - File upload, storage, and processing
10. **Analytics** - Comprehensive analytics and reporting
11. **Jobs** - Background job processing with BullMQ
12. **Audit** - Audit logging and security events
13. **Health** - Health check endpoints
14. **API Keys** - API key management and authentication

### Key Features
- ✅ JWT authentication with refresh tokens
- ✅ Real SMTP email sending (Gmail, SendGrid, Mailgun, AWS SES)
- ✅ File upload handling (PNG, JPG, PDF)
- ✅ Certificate generation engine
- ✅ Mass email system
- ✅ Analytics and reporting
- ✅ Background job processing with BullMQ
- ✅ Comprehensive error handling
- ✅ Input validation with class-validator
- ✅ Swagger API documentation
- ✅ Docker support
- ✅ PostgreSQL with Prisma ORM
- ✅ Audit logging
- ✅ API key management

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- npm or yarn

## Installation

### 1. Clone and Install Dependencies

```bash
cd nestjs-backend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/certificate_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_FROM_EMAIL=noreply@certificateplatform.com

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run start:dev
```

Server will be available at `http://localhost:3001`

## Docker Setup

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t certificate-backend .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:password@host:5432/db \
  -e JWT_SECRET=your-secret \
  certificate-backend
```

## API Documentation

Swagger documentation available at: `http://localhost:3001/api/docs`

### Authentication

All endpoints (except `/auth/register` and `/auth/login`) require JWT token:

```bash
Authorization: Bearer <access_token>
```

### Example Requests

#### Register User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```

#### Create Organization
```bash
POST /api/v1/organizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "description": "Leading certificate platform",
  "email": "contact@acme.com"
}
```

#### Upload Template
```bash
POST /api/v1/templates
Authorization: Bearer <token>
Content-Type: multipart/form-data

- image: <file>
- name: "Technical Certificate"
- description: "For technical workshops"
- categories: ["Technical"]
```

#### Send Email
```bash
POST /api/v1/email/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Your Certificate",
  "htmlContent": "<h1>Congratulations!</h1>",
  "attachments": [
    {
      "filename": "certificate.pdf",
      "path": "/path/to/certificate.pdf"
    }
  ]
}
```

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── app.controller.ts      # Root controller
├── app.service.ts         # Root service
├── common/                # Shared utilities
│   ├── filters/           # Exception filters
│   ├── interceptors/      # Request/response interceptors
│   ├── guards/            # Authentication guards
│   └── prisma/            # Prisma service
├── modules/               # Feature modules
│   ├── auth/              # Authentication
│   ├── users/             # User management
│   ├── organizations/     # Organization management
│   ├── templates/         # Template management
│   ├── campaigns/         # Campaign management
│   ├── participants/      # Participant management
│   ├── certificates/      # Certificate management
│   ├── email/             # Email service
│   ├── files/             # File handling
│   ├── analytics/         # Analytics
│   ├── jobs/              # Background jobs
│   ├── audit/             # Audit logging
│   ├── health/            # Health checks
│   └── api-keys/          # API key management
└── prisma/
    └── schema.prisma      # Database schema
```

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key entities:

- **User** - Application users
- **Organization** - Multi-tenant organizations
- **Template** - Certificate templates
- **Campaign** - Certificate generation campaigns
- **Participant** - Campaign participants
- **Certificate** - Generated certificates
- **EmailLog** - Email delivery tracking
- **Analytics** - Usage analytics
- **AuditLog** - Security audit logs
- **ApiKey** - API key management

See `prisma/schema.prisma` for complete schema.

## Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Deployment

### Production Build

```bash
npm run build
npm run start:prod
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:prod_password@prod_host:5432/prod_db
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
SMTP_HOST=<your-smtp-host>
SMTP_PORT=<your-smtp-port>
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password>
REDIS_HOST=<redis-host>
REDIS_PORT=<redis-port>
REDIS_PASSWORD=<redis-password>
```

### Docker Production Deployment

```bash
# Build production image
docker build -t certificate-backend:latest .

# Push to registry
docker push certificate-backend:latest

# Deploy with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Email Configuration

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SECURE=false
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.com
SMTP_PASS=your-mailgun-password
SMTP_SECURE=false
```

## Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
psql -U postgres -h localhost

# Verify DATABASE_URL in .env
# Format: postgresql://user:password@host:port/database
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Email Not Sending
```bash
# Check SMTP configuration in .env
# Verify credentials are correct
# Check email logs: GET /api/v1/email/logs
```

### Port Already in Use
```bash
# Change PORT in .env or use different port
PORT=3002 npm run start:dev
```

## Performance Optimization

- Database query optimization with Prisma
- Redis caching for frequently accessed data
- Background job processing with BullMQ
- File compression and optimization
- Request rate limiting
- Pagination for large datasets

## Security

- JWT authentication with secure tokens
- Password hashing with bcryptjs
- Input validation with class-validator
- CORS protection
- Helmet security headers
- Audit logging for all actions
- API key management
- SQL injection prevention with Prisma

## Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub or contact support@certificateplatform.com
