# Certificate Management Platform - AWS Infrastructure

This directory contains all the AWS infrastructure components for the Certificate Management Platform, including CloudFormation templates, deployment scripts, and configuration files.

## Architecture Overview

The platform is deployed on AWS using a containerized architecture with the following components:

### Core Infrastructure
- **ECS Fargate**: Containerized application hosting with auto-scaling
- **Application Load Balancer**: Traffic distribution with SSL termination
- **RDS PostgreSQL**: Multi-AZ database with automated backups
- **S3**: Secure file storage for certificates and templates
- **SES**: Email delivery service for certificate distribution

### Monitoring & Security
- **CloudWatch**: Comprehensive logging and monitoring
- **WAF**: Web application firewall protection
- **IAM**: Least-privilege access control
- **KMS**: Encryption key management
- **VPC**: Isolated network environment

### Optional Components
- **SSL/TLS**: Custom domain with SSL certificate
- **CloudFront**: Global CDN for improved performance
- **Blue-Green Deployment**: Zero-downtime deployments
- **CodeDeploy**: Automated deployment pipeline

## Directory Structure

```
infrastructure/
├── cloudformation/           # CloudFormation templates
│   ├── ecs-infrastructure.yml       # Main infrastructure stack
│   ├── monitoring-security.yml     # Monitoring and security
│   ├── ssl-certificate.yml         # SSL/TLS configuration
│   ├── blue-green-deployment.yml   # Blue-green deployment
│   └── ecr-repository.yml          # Container registry
├── deploy-infrastructure.ps1        # PowerShell deployment script
├── deploy-infrastructure.sh         # Bash deployment script
├── validate-deployment.ps1          # Deployment validation script
└── README.md                       # This file
```

## Quick Start

### Prerequisites

1. **AWS CLI** (v2.0+) installed and configured
2. **Docker** (v20.0+) for container operations
3. **PowerShell** (Windows) or **Bash** (Linux/macOS)
4. **jq** (Linux/macOS only) for JSON processing

### Basic Deployment

#### Windows (PowerShell)
```powershell
# Deploy to production
.\infrastructure\deploy-infrastructure.ps1 production

# Deploy to staging
.\infrastructure\deploy-infrastructure.ps1 staging -AwsRegion us-west-2

# Deploy with custom domain
.\infrastructure\deploy-infrastructure.ps1 production -DomainName certificates.example.com -HostedZoneId Z123456789
```

#### Linux/macOS (Bash)
```bash
# Deploy to production
./infrastructure/deploy-infrastructure.sh production

# Deploy to staging
AWS_REGION=us-west-2 ./infrastructure/deploy-infrastructure.sh staging

# Deploy with custom domain
DOMAIN_NAME=certificates.example.com HOSTED_ZONE_ID=Z123456789 ./infrastructure/deploy-infrastructure.sh production
```

### Advanced Deployment Options

#### Enable Blue-Green Deployment
```powershell
# PowerShell
.\infrastructure\deploy-infrastructure.ps1 production -EnableBlueGreen

# Bash
ENABLE_BLUE_GREEN=true ./infrastructure/deploy-infrastructure.sh production
```

#### Skip SSL Configuration
```powershell
# PowerShell
.\infrastructure\deploy-infrastructure.ps1 production -SkipSSL

# Bash
SKIP_SSL=true ./infrastructure/deploy-infrastructure.sh production
```

#### Deploy Without Monitoring
```powershell
# PowerShell
.\infrastructure\deploy-infrastructure.ps1 production -DeployMonitoring:$false

# Bash
DEPLOY_MONITORING=false ./infrastructure/deploy-infrastructure.sh production
```

## CloudFormation Stacks

### 1. ECR Repository Stack
**File**: `ecr-repository.yml`  
**Stack Name**: `certificate-management-{env}-ecr`

Creates the container registry with:
- Image scanning enabled
- Lifecycle policies for cleanup
- Cross-account access policies

### 2. Main Infrastructure Stack
**File**: `ecs-infrastructure.yml`  
**Stack Name**: `certificate-management-{env}`

Deploys the core infrastructure:
- VPC with public/private subnets
- ECS Fargate cluster and service
- Application Load Balancer
- RDS PostgreSQL database
- S3 bucket for file storage
- Security groups and IAM roles

### 3. Monitoring and Security Stack
**File**: `monitoring-security.yml`  
**Stack Name**: `certificate-management-{env}-monitoring`

Adds monitoring and security features:
- CloudWatch dashboards and alarms
- WAF web ACL for protection
- Custom metrics and log filters
- SNS topics for alerts
- Enhanced security configurations

### 4. SSL Certificate Stack
**File**: `ssl-certificate.yml`  
**Stack Name**: `certificate-management-{env}-ssl`

Configures SSL/TLS:
- ACM certificate with DNS validation
- Route 53 DNS records
- HTTPS listener configuration
- Security headers via Lambda@Edge
- Optional CloudFront distribution

### 5. Blue-Green Deployment Stack
**File**: `blue-green-deployment.yml`  
**Stack Name**: `certificate-management-{env}-blue-green`

Enables zero-downtime deployments:
- CodeDeploy application and deployment group
- Auto-rollback configuration
- CloudWatch alarms for monitoring
- Blue-green deployment policies

## Environment Configuration

### Production Environment
- **ECS Tasks**: 2 instances for high availability
- **RDS**: Multi-AZ deployment with 7-day backups
- **Monitoring**: 30-day log retention
- **Security**: Enhanced security groups and encryption
- **Auto-scaling**: 2-10 tasks based on CPU/memory

### Staging Environment
- **ECS Tasks**: 1 instance for cost optimization
- **RDS**: Single-AZ deployment with 1-day backups
- **Monitoring**: 7-day log retention
- **Security**: Standard security configuration
- **Auto-scaling**: 1-5 tasks based on load

### Development Environment
- **ECS Tasks**: 1 instance
- **RDS**: Single-AZ, minimal storage
- **Monitoring**: 3-day log retention
- **Security**: Development-friendly configuration
- **Auto-scaling**: Fixed 1 task

## Deployment Validation

After deployment, validate the infrastructure health:

```powershell
# PowerShell
.\infrastructure\validate-deployment.ps1 production

# Check specific environment
.\infrastructure\validate-deployment.ps1 staging -AwsRegion us-west-2
```

The validation script checks:
- CloudFormation stack status
- ECS service health
- Database connectivity
- Load balancer health checks
- S3 bucket accessibility
- Overall system health

## Monitoring and Alerting

### CloudWatch Dashboards
Access dashboards at: `https://console.aws.amazon.com/cloudwatch/home?region={region}#dashboards`

### Key Metrics Monitored
- **Application**: CPU, memory, response time, error rate
- **Database**: CPU, connections, storage, performance
- **Load Balancer**: Request count, response time, error codes
- **Custom**: Certificate generation, email delivery

### Alerting
Alerts are sent via SNS to configured email addresses for:
- High CPU/memory utilization
- Database connection issues
- Application errors
- High response times
- Storage space warnings

## Security Features

### Network Security
- VPC with isolated subnets
- Security groups with least privilege
- NAT gateways for outbound access
- WAF protection against common attacks

### Data Security
- Encryption at rest (RDS, S3)
- Encryption in transit (TLS 1.3)
- IAM roles with minimal permissions
- Secrets stored in Systems Manager

### Application Security
- Non-root container execution
- Security headers enforcement
- Input validation and sanitization
- Regular security scanning

## Cost Optimization

### Estimated Monthly Costs (US East 1)
- **Production**: $150-200/month
- **Staging**: $50-75/month
- **Development**: $30-50/month

### Cost Optimization Features
- Fargate Spot instances for non-production
- S3 lifecycle policies
- CloudWatch log retention policies
- Auto-scaling based on demand
- Resource right-sizing

## Troubleshooting

### Common Issues

#### Stack Deployment Failures
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name certificate-management-production

# Check specific resource status
aws cloudformation describe-stack-resources --stack-name certificate-management-production
```

#### ECS Service Issues
```bash
# Check service status
aws ecs describe-services --cluster certificate-management-production-cluster --services certificate-management-production-service

# Check task logs
aws logs tail /ecs/production-certificate-management --follow
```

#### Database Connectivity
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier production-certificate-management-db

# Test connectivity from ECS task
aws ecs execute-command --cluster <cluster> --task <task-arn> --container certificate-management-container --interactive --command "/bin/sh"
```

### Rollback Procedures

#### Standard Rollback
```bash
# Rollback CloudFormation stack
aws cloudformation cancel-update-stack --stack-name certificate-management-production

# Rollback ECS service
aws ecs update-service --cluster <cluster> --service <service> --task-definition <previous-task-def>
```

#### Blue-Green Rollback
```bash
# Stop deployment and rollback
aws deploy stop-deployment --deployment-id <deployment-id> --auto-rollback-enabled
```

## Maintenance

### Regular Tasks
- **Weekly**: Review CloudWatch alarms and logs
- **Monthly**: Update container images with security patches
- **Quarterly**: Review and update IAM policies
- **Annually**: Review backup and disaster recovery procedures

### Updates and Patches
1. Test changes in development environment
2. Deploy to staging for validation
3. Use blue-green deployment for production
4. Monitor metrics after deployment
5. Rollback if issues detected

## Support

### AWS Resources
- [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [RDS Documentation](https://docs.aws.amazon.com/rds/)
- [S3 Documentation](https://docs.aws.amazon.com/s3/)

### Emergency Procedures
1. Check CloudWatch alarms and dashboards
2. Review application logs in CloudWatch
3. Validate ECS service and task health
4. Check database performance metrics
5. Contact AWS support if needed

For additional support, refer to the main project documentation or contact the development team.