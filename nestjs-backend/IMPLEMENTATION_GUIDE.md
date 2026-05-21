# NestJS Backend Implementation Guide

## Project Overview

This is a complete, production-ready NestJS backend for the Certificate Management Platform with all 14 required modules fully implemented.

## What's Included

### ✅ Complete Implementation

#### 1. Authentication Module
- JWT authentication with access and refresh tokens
- User registration and login
- Password change functionality
- Token refresh mechanism
- Passport.js integration (JWT and Local strategies)

#### 2. Users Module
- User CRUD operations
- User profile management
- Role and status management
- User listing with pagination

#### 3. Organizations Module
- Multi-tenant organization management
- Organization member management
- Role-based access control
- Organization settings

#### 4. Templates Module
- Certificate template upload (PNG, JPG, PDF)
- Template field management
- Template publishing workflow
- Template usage tracking
- Base64 image storage

#### 5. Campaigns Module
- Campaign creation and management
- Campaign status tracking
- Campaign statistics
- Certificate generation tracking

#### 6. Participants Module
- Participant management
- CSV import functionality
- Participant status tracking
- Participant statistics

#### 7. Certificates Module
- Certificate generation
- Certificate verification with unique codes
- Certificate status management
- Certificate revocation
- Certificate statistics

#### 8. Email Module
- Real SMTP email sending
- Support for multiple providers (Gmail, SendGrid, Mailgun, AWS SES)
- Email logging and tracking
- Bulk email sending
- Email retry mechanism
- Email statistics

#### 9. Files Module
- File upload handling
- Image processing with Sharp
- File storage management
- File cleanup utilities
- Support for PNG, JPG, PDF

#### 10. Analytics Module
- Dashboard statistics
- Certificate analytics
- Email analytics
- Campaign analytics
- Report generation
- Analytics recording

#### 11. Jobs Module
- Background job processing with BullMQ
- Certificate generation jobs
- Email sending jobs
- Report generation jobs
- Job status tracking
- Job retry mechanism

#### 12. Audit Module
- Audit logging for all actions
- User activity tracking
- Resource change tracking
- Security event logging
- Audit log retrieval and filtering

#### 13. Health Module
- Health check endpoints
- Database connectivity check
- Readiness and liveness probes
- Uptime tracking

#### 14. API Keys Module
- API key generation and management
- API key validation
- Permission management
- Key rotation
- Key revocation

### Infrastructure

#### Database (Prisma + PostgreSQL)
- Complete schema with 14 entities
- Relationships and constraints
- Indexes for performance
- Migration support

#### Authentication & Security
- JWT with refresh tokens
- Password hashing with bcryptjs
- Input validation with class-validator
- CORS protection
- Helmet security headers
- Audit logging

#### Error Handling
- Global exception filter
- Custom error responses
- Validation error handling
- Comprehensive logging

#### API Documentation
- Swagger/OpenAPI integration
- Endpoint documentation
- Request/response schemas
- Authentication documentation

#### Deployment
- Docker support
- Docker Compose for local development
- Environment configuration
- Production-ready setup

## Quick Start

### 1. Installation

```bash
cd nestjs-backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Start Development

```bash
npm run start:dev
```

### 5. Access API

- API: http://localhost:3001/api/v1
- Swagger Docs: http://localhost:3001/api/docs
- Health Check: http://localhost:3001/api/v1/health

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/change-password` - Change password

### Users
- `GET /api/v1/users` - List users
- `GET /api/v1/users/:id` - Get user
- `GET /api/v1/users/profile` - Get current user profile
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `PATCH /api/v1/users/:id/role` - Update user role
- `PATCH /api/v1/users/:id/status` - Update user status

### Organizations
- `POST /api/v1/organizations` - Create organization
- `GET /api/v1/organizations` - List organizations
- `GET /api/v1/organizations/:id` - Get organization
- `PATCH /api/v1/organizations/:id` - Update organization
- `DELETE /api/v1/organizations/:id` - Delete organization
- `POST /api/v1/organizations/:id/members` - Add member
- `DELETE /api/v1/organizations/:id/members/:userId` - Remove member
- `PATCH /api/v1/organizations/:id/members/:userId/role` - Update member role

### Templates
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates` - List templates
- `GET /api/v1/templates/:id` - Get template
- `PATCH /api/v1/templates/:id` - Update template
- `DELETE /api/v1/templates/:id` - Delete template
- `POST /api/v1/templates/:id/publish` - Publish template
- `PATCH /api/v1/templates/:id/fields` - Update template fields

### Campaigns
- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns` - List campaigns
- `GET /api/v1/campaigns/:id` - Get campaign
- `PATCH /api/v1/campaigns/:id` - Update campaign
- `DELETE /api/v1/campaigns/:id` - Delete campaign
- `GET /api/v1/campaigns/:id/stats` - Get campaign stats
- `PATCH /api/v1/campaigns/:id/status` - Update campaign status

### Participants
- `POST /api/v1/participants` - Create participant
- `GET /api/v1/participants` - List participants
- `GET /api/v1/participants/:id` - Get participant
- `PATCH /api/v1/participants/:id` - Update participant
- `DELETE /api/v1/participants/:id` - Delete participant
- `POST /api/v1/participants/import-csv` - Import from CSV
- `GET /api/v1/participants/stats/overview` - Get stats

### Certificates
- `GET /api/v1/certificates` - List certificates
- `GET /api/v1/certificates/:id` - Get certificate
- `GET /api/v1/certificates/verify/:code` - Verify certificate
- `PATCH /api/v1/certificates/:id/status` - Update status
- `POST /api/v1/certificates/:id/revoke` - Revoke certificate
- `GET /api/v1/certificates/stats/overview` - Get stats
- `GET /api/v1/certificates/campaign/:campaignId/list` - Get campaign certificates

### Email
- `POST /api/v1/email/send` - Send email
- `POST /api/v1/email/send-bulk` - Send bulk emails
- `GET /api/v1/email/logs` - Get email logs
- `GET /api/v1/email/stats` - Get email statistics
- `POST /api/v1/email/retry-failed` - Retry failed emails

### Files
- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files/list` - List files
- `GET /api/v1/files/:fileName` - Download file
- `DELETE /api/v1/files/:fileName` - Delete file

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard stats
- `GET /api/v1/analytics/certificates` - Certificate analytics
- `GET /api/v1/analytics/emails` - Email analytics
- `GET /api/v1/analytics/campaigns/:campaignId` - Campaign analytics
- `POST /api/v1/analytics/reports` - Generate report

### Jobs
- `GET /api/v1/jobs/stats` - Get all queue stats
- `GET /api/v1/jobs/stats/:queueName` - Get queue stats
- `GET /api/v1/jobs/:queueName/:jobId` - Get job status
- `POST /api/v1/jobs/:queueName/:jobId/retry` - Retry job
- `POST /api/v1/jobs/:queueName/:jobId/cancel` - Cancel job

### Audit
- `GET /api/v1/audit/logs` - Get audit logs
- `GET /api/v1/audit/user/:userId` - Get user activity
- `GET /api/v1/audit/resource/:resource/:resourceId` - Get resource activity
- `GET /api/v1/audit/security-events` - Get security events

### Health
- `GET /api/v1/health` - Health check
- `GET /api/v1/health/ready` - Readiness check
- `GET /api/v1/health/live` - Liveness check

### API Keys
- `POST /api/v1/api-keys` - Create API key
- `GET /api/v1/api-keys` - List API keys
- `GET /api/v1/api-keys/:id` - Get API key
- `PATCH /api/v1/api-keys/:id/permissions` - Update permissions
- `POST /api/v1/api-keys/:id/revoke` - Revoke key
- `DELETE /api/v1/api-keys/:id` - Delete key
- `POST /api/v1/api-keys/:id/rotate` - Rotate key

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/certificate_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=3600
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRATION=604800

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_FROM_EMAIL=noreply@certificateplatform.com
SMTP_FROM_NAME=Certificate Platform

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
ALLOWED_TEMPLATE_TYPES=image/png,image/jpeg,application/pdf

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000
```

## Testing

### Unit Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:cov
```

### E2E Tests
```bash
npm run test:e2e
```

## Deployment

### Docker
```bash
docker build -t certificate-backend .
docker run -p 3001:3001 certificate-backend
```

### Docker Compose
```bash
docker-compose up -d
```

### Production Build
```bash
npm run build
npm run start:prod
```

## Database Migrations

### Create Migration
```bash
npm run prisma:migrate
```

### View Database
```bash
npm run prisma:studio
```

### Reset Database (Development Only)
```bash
npm run db:reset
```

## Troubleshooting

### Port Already in Use
```bash
PORT=3002 npm run start:dev
```

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### Redis Connection Error
- Verify Redis is running
- Check REDIS_HOST and REDIS_PORT in .env

### Email Not Sending
- Verify SMTP credentials
- Check email logs: GET /api/v1/email/logs
- Enable "Less secure app access" for Gmail

## Performance Tips

1. Use pagination for large datasets
2. Enable Redis caching
3. Use background jobs for long-running tasks
4. Optimize database queries with Prisma
5. Compress files before upload
6. Use CDN for static files

## Security Best Practices

1. Change JWT_SECRET in production
2. Use strong SMTP passwords
3. Enable HTTPS in production
4. Implement rate limiting
5. Regular security audits
6. Keep dependencies updated
7. Use environment variables for secrets
8. Enable audit logging

## Support

For issues and questions:
1. Check the README.md
2. Review API documentation at /api/docs
3. Check application logs
4. Open an issue on GitHub

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure environment: `cp .env.example .env`
3. ✅ Setup database: `npm run prisma:migrate`
4. ✅ Seed data: `npm run prisma:seed`
5. ✅ Start server: `npm run start:dev`
6. ✅ Access API: http://localhost:3001/api/docs

## Project Structure

```
nestjs-backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── common/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── guards/
│   │   └── prisma/
│   └── modules/
│       ├── auth/
│       ├── users/
│       ├── organizations/
│       ├── templates/
│       ├── campaigns/
│       ├── participants/
│       ├── certificates/
│       ├── email/
│       ├── files/
│       ├── analytics/
│       ├── jobs/
│       ├── audit/
│       ├── health/
│       └── api-keys/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── test/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

---

**Ready to deploy!** 🚀
