# NestJS Backend Modules Structure

## Completed Modules
1. ✅ Auth Module - JWT authentication with refresh tokens
2. ✅ Users Module - User management
3. ✅ Organizations Module - Organization and team management
4. ✅ Templates Module - Certificate template management

## Remaining Modules to Create

### 5. Campaigns Module
- Create campaigns for certificate generation
- Track campaign status and progress
- Manage campaign participants

### 6. Participants Module
- Manage participant data
- CSV/Excel import
- Participant validation

### 7. Certificates Module
- Certificate generation engine
- PDF creation with field replacement
- Certificate verification
- Certificate download/delivery

### 8. Email Module
- SMTP configuration
- Email sending with multiple providers
- Email templates
- Email tracking and analytics

### 9. Files Module
- File upload handling
- File storage management
- Image processing
- PDF generation

### 10. Analytics Module
- Certificate generation analytics
- Email delivery analytics
- Campaign performance metrics
- Custom reports

### 11. Jobs Module
- Background job processing with BullMQ
- Job queue management
- Job retry logic
- Job status tracking

### 12. Audit Module
- Audit logging
- User activity tracking
- Security event logging

### 13. Health Module
- Health check endpoints
- Database connectivity check
- Redis connectivity check

### 14. API Keys Module
- API key generation and management
- API key authentication
- Rate limiting

## Common Infrastructure
- Prisma ORM with PostgreSQL
- JWT authentication
- Input validation with class-validator
- Error handling with custom filters
- Request/response transformation
- Logging interceptors
- Swagger documentation

## Testing
- Unit tests with Jest
- Integration tests
- E2E tests

## Deployment
- Docker configuration
- Docker Compose for local development
- Environment configuration
- Database migrations
