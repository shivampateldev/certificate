# AWS Deployment Completion Spec

## Overview
Complete the AWS deployment of the Certificate Management Platform that was started but failed due to CloudFormation target group name length constraints.

## Current State
- ✅ ECR repository created: `certificate-management-platform`
- ✅ Docker image built and pushed successfully
- ✅ Git repository initialized and code committed
- ❌ CloudFormation deployment failed due to target group name length limit (32 characters max)
- ❌ Application not accessible via Load Balancer

## Problem Statement
The CloudFormation deployment failed with the error that the target group name "production-certificate-management-tg" exceeds the 32-character limit imposed by AWS Application Load Balancer target groups.

## User Stories

### Story 1: Fix CloudFormation Template
**As a** DevOps engineer  
**I want** the CloudFormation template to use compliant resource names  
**So that** the infrastructure can be deployed successfully  

**Acceptance Criteria:**
- Target group name must be ≤ 32 characters
- All other resource names should follow AWS naming conventions
- Template should maintain the same functionality
- Resource names should be descriptive but concise

### Story 2: Deploy Infrastructure Successfully
**As a** developer  
**I want** the infrastructure to deploy without errors  
**So that** the application can be hosted on AWS  

**Acceptance Criteria:**
- CloudFormation stack deploys successfully
- ECS cluster is created and running
- Application Load Balancer is accessible
- Security groups allow proper traffic flow
- All AWS resources are properly tagged

### Story 3: Verify Application Accessibility
**As a** user  
**I want** to access the application via the Load Balancer URL  
**So that** I can use the certificate management platform  

**Acceptance Criteria:**
- Application responds to HTTP requests on port 80
- Health check endpoint `/api/health` returns 200 OK
- Frontend serves correctly from the Load Balancer
- Database connectivity works in the cloud environment
- File uploads work with proper permissions

### Story 4: Configure Production Environment
**As a** system administrator  
**I want** production-specific configurations to be applied  
**So that** the application runs optimally in the cloud  

**Acceptance Criteria:**
- Environment variables are set for production
- Database connection uses production settings
- AWS services (S3, SES) are properly configured
- Logging is configured for CloudWatch
- Security best practices are implemented

## Technical Requirements

### CloudFormation Template Fixes
1. **Target Group Name**: Shorten from "production-certificate-management-tg" to "prod-cert-mgmt-tg" (17 chars)
2. **Load Balancer Name**: Ensure it's within limits
3. **Security Group Names**: Verify they're within AWS limits
4. **ECS Service/Cluster Names**: Ensure compliance

### Infrastructure Components
1. **VPC and Networking**
   - VPC with public subnets in 2 AZs
   - Internet Gateway and routing
   - Security groups for ALB and ECS

2. **Application Load Balancer**
   - Internet-facing ALB
   - Target group for ECS tasks
   - Health check configuration
   - HTTP listener on port 80

3. **ECS Fargate Service**
   - ECS cluster
   - Task definition with proper resource allocation
   - Service with desired count of 1
   - Auto-scaling capabilities (future)

4. **IAM Roles and Policies**
   - ECS execution role
   - ECS task role with S3 permissions
   - CloudWatch logging permissions

### Application Configuration
1. **Environment Variables**
   - NODE_ENV=production
   - PORT=5000
   - Database connection strings
   - AWS service configurations

2. **Health Check**
   - Endpoint: `/api/health`
   - Expected response: 200 OK
   - Timeout: 5 seconds
   - Interval: 30 seconds

### Deployment Process
1. **Pre-deployment Checks**
   - AWS credentials configured
   - Docker image available in ECR
   - CloudFormation template validated

2. **Deployment Steps**
   - Deploy CloudFormation stack
   - Verify ECS service starts
   - Check Load Balancer health
   - Validate application accessibility

3. **Post-deployment Verification**
   - Application responds correctly
   - Database connectivity works
   - File operations function properly
   - Monitoring and logging active

## Files to Modify

### Primary Files
- `infrastructure/cloudformation/simple-ecs.yml` - Fix resource names
- `scripts/deploy.ps1` - Update deployment script if needed

### Verification Files
- `server/index.js` - Ensure health endpoint exists
- `server/.env` - Production environment template

## Success Criteria
1. CloudFormation stack deploys without errors
2. ECS service shows as "RUNNING" status
3. Load Balancer health checks pass
4. Application accessible via ALB DNS name
5. All core features work in production environment

## Risk Mitigation
1. **Rollback Plan**: Keep previous working local setup
2. **Monitoring**: Set up CloudWatch alarms for service health
3. **Backup**: Ensure database backups are configured
4. **Security**: Review security group rules before deployment

## Dependencies
- AWS CLI configured with proper permissions
- Docker installed and running
- ECR repository with latest image
- Git repository with committed changes

## Timeline
- **Phase 1**: Fix CloudFormation template (30 minutes)
- **Phase 2**: Deploy infrastructure (15 minutes)
- **Phase 3**: Verify and test application (30 minutes)
- **Phase 4**: Production configuration and monitoring (45 minutes)

**Total Estimated Time**: 2 hours

## Notes
- This continues from the previous deployment attempt
- ECR image is already available: `122610482445.dkr.ecr.us-east-1.amazonaws.com/certificate-management-platform:latest`
- Focus on fixing the immediate CloudFormation issue first
- Ensure all AWS resource names comply with service-specific limits