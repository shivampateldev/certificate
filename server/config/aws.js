const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// S3 Configuration
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  signatureVersion: 'v4'
});

// SES Configuration
const ses = new AWS.SES({
  region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1'
});

// RDS Configuration (for connection string if needed)
const rdsConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

module.exports = {
  AWS,
  s3,
  ses,
  rdsConfig,
  bucketName: process.env.AWS_S3_BUCKET || 'certificate-management-platform'
};