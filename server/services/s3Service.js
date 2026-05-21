const { s3, bucketName } = require('../config/aws');
const fs = require('fs');
const path = require('path');

class S3Service {
  /**
   * Upload file to S3
   * @param {string} filePath - Local file path
   * @param {string} key - S3 object key
   * @param {object} options - Additional options
   * @returns {Promise<object>} Upload result with URL
   */
  async uploadFile(filePath, key, options = {}) {
    try {
      const fileContent = fs.readFileSync(filePath);
      const contentType = this.getContentType(filePath);

      const params = {
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
        ...options
      };

      const result = await s3.upload(params).promise();
      
      return {
        success: true,
        url: result.Location,
        key: result.Key,
        etag: result.ETag
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Download file from S3
   * @param {string} key - S3 object key
   * @param {string} downloadPath - Local download path
   * @returns {Promise<object>} Download result
   */
  async downloadFile(key, downloadPath) {
    try {
      const params = {
        Bucket: bucketName,
        Key: key
      };

      const result = await s3.getObject(params).promise();
      fs.writeFileSync(downloadPath, result.Body);

      return {
        success: true,
        localPath: downloadPath,
        contentType: result.ContentType,
        lastModified: result.LastModified
      };
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download file from S3: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 object key
   * @returns {Promise<object>} Delete result
   */
  async deleteFile(key) {
    try {
      const params = {
        Bucket: bucketName,
        Key: key
      };

      await s3.deleteObject(params).promise();
      
      return {
        success: true,
        message: `File ${key} deleted successfully`
      };
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for file access
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: bucketName,
        Key: key,
        Expires: expiresIn
      };

      const url = await s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('S3 presigned URL error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * List files in S3 bucket with prefix
   * @param {string} prefix - Object key prefix
   * @param {number} maxKeys - Maximum number of keys to return
   * @returns {Promise<Array>} List of objects
   */
  async listFiles(prefix = '', maxKeys = 1000) {
    try {
      const params = {
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await s3.listObjectsV2(params).promise();
      
      return {
        success: true,
        files: result.Contents.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          etag: obj.ETag
        })),
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken
      };
    } catch (error) {
      console.error('S3 list error:', error);
      throw new Error(`Failed to list files from S3: ${error.message}`);
    }
  }

  /**
   * Check if bucket exists and is accessible
   * @returns {Promise<boolean>} Bucket accessibility status
   */
  async checkBucketAccess() {
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
      return true;
    } catch (error) {
      console.error('S3 bucket access error:', error);
      return false;
    }
  }

  /**
   * Get content type based on file extension
   * @param {string} filePath - File path
   * @returns {string} Content type
   */
  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.json': 'application/json',
      '.txt': 'text/plain'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Create organized folder structure for certificates
   * @param {string} batchId - Batch identifier
   * @param {string} category - Event category
   * @returns {string} Folder path
   */
  getCertificatePath(batchId, category) {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `certificates/${date}/${sanitizedCategory}/batch_${batchId}/`;
  }

  /**
   * Create organized folder structure for templates
   * @param {string} category - Template category
   * @returns {string} Folder path
   */
  getTemplatePath(category) {
    const sanitizedCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `templates/${sanitizedCategory}/`;
  }

  /**
   * Upload certificate with versioning support
   * @param {string} filePath - Local certificate file path
   * @param {string} batchId - Batch identifier
   * @param {string} certificateId - Certificate identifier
   * @param {string} category - Event category
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Upload result with versioning info
   */
  async uploadCertificate(filePath, batchId, certificateId, category, metadata = {}) {
    try {
      const certificatePath = this.getCertificatePath(batchId, category);
      const key = `${certificatePath}${certificateId}.pdf`;

      const uploadMetadata = {
        batchId: batchId.toString(),
        certificateId,
        category,
        uploadedAt: new Date().toISOString(),
        ...metadata
      };

      const result = await this.uploadFile(filePath, key, {
        Metadata: uploadMetadata,
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA' // Infrequent Access for cost optimization
      });

      return {
        ...result,
        certificatePath,
        metadata: uploadMetadata
      };

    } catch (error) {
      throw new Error(`Certificate upload failed: ${error.message}`);
    }
  }

  /**
   * Get certificates for a specific batch
   * @param {string} batchId - Batch identifier
   * @param {string} category - Event category
   * @returns {Promise<Array>} List of certificates in the batch
   */
  async getBatchCertificates(batchId, category) {
    try {
      const certificatePath = this.getCertificatePath(batchId, category);
      const result = await this.listFiles(certificatePath);

      return {
        success: true,
        batchId,
        category,
        certificatePath,
        certificates: result.files.map(file => ({
          key: file.key,
          certificateId: path.basename(file.key, '.pdf'),
          size: file.size,
          lastModified: file.lastModified,
          downloadUrl: null // Will be generated on demand
        })),
        totalCount: result.files.length
      };

    } catch (error) {
      throw new Error(`Failed to get batch certificates: ${error.message}`);
    }
  }

  /**
   * Generate download URL for a single certificate
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} Download URL
   */
  async generateDownloadUrl(key, expiresIn = 3600) {
    try {
      return await this.getPresignedUrl(key, expiresIn);
    } catch (error) {
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Generate download URLs for multiple certificates
   * @param {Array} certificateKeys - Array of S3 keys
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<Array>} Array of download URLs
   */
  async generateBatchDownloadUrls(certificateKeys, expiresIn = 3600) {
    try {
      const urls = await Promise.all(
        certificateKeys.map(async (key) => {
          try {
            const url = await this.getPresignedUrl(key, expiresIn);
            return {
              key,
              certificateId: path.basename(key, '.pdf'),
              downloadUrl: url,
              expiresAt: new Date(Date.now() + (expiresIn * 1000)).toISOString()
            };
          } catch (error) {
            return {
              key,
              certificateId: path.basename(key, '.pdf'),
              error: error.message
            };
          }
        })
      );

      return urls;

    } catch (error) {
      throw new Error(`Failed to generate download URLs: ${error.message}`);
    }
  }

  /**
   * Set up S3 lifecycle policy for certificate storage
   * @returns {Promise<object>} Lifecycle configuration result
   */
  async setupCertificateLifecycle() {
    try {
      const lifecycleConfig = {
        Bucket: bucketName,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: 'CertificateLifecycle',
              Status: 'Enabled',
              Filter: {
                Prefix: 'certificates/'
              },
              Transitions: [
                {
                  Days: 30,
                  StorageClass: 'STANDARD_IA'
                },
                {
                  Days: 90,
                  StorageClass: 'GLACIER'
                },
                {
                  Days: 365,
                  StorageClass: 'DEEP_ARCHIVE'
                }
              ]
            },
            {
              ID: 'TemplateLifecycle',
              Status: 'Enabled',
              Filter: {
                Prefix: 'templates/'
              },
              Transitions: [
                {
                  Days: 90,
                  StorageClass: 'STANDARD_IA'
                }
              ]
            }
          ]
        }
      };

      await s3.putBucketLifecycleConfiguration(lifecycleConfig).promise();

      return {
        success: true,
        message: 'Lifecycle policy configured successfully',
        rules: lifecycleConfig.LifecycleConfiguration.Rules.length
      };

    } catch (error) {
      console.error('Lifecycle setup error:', error);
      throw new Error(`Failed to setup lifecycle policy: ${error.message}`);
    }
  }

  /**
   * Delete certificates for a batch
   * @param {string} batchId - Batch identifier
   * @param {string} category - Event category
   * @returns {Promise<object>} Deletion result
   */
  async deleteBatchCertificates(batchId, category) {
    try {
      const certificatePath = this.getCertificatePath(batchId, category);
      const listResult = await this.listFiles(certificatePath);

      if (listResult.files.length === 0) {
        return {
          success: true,
          message: 'No certificates found to delete',
          deletedCount: 0
        };
      }

      // Delete all certificates in the batch
      const deletePromises = listResult.files.map(file => 
        this.deleteFile(file.key)
      );

      const deleteResults = await Promise.allSettled(deletePromises);
      
      const successful = deleteResults.filter(result => result.status === 'fulfilled').length;
      const failed = deleteResults.filter(result => result.status === 'rejected').length;

      return {
        success: failed === 0,
        message: `Deleted ${successful} certificates, ${failed} failed`,
        deletedCount: successful,
        failedCount: failed,
        batchId,
        category
      };

    } catch (error) {
      throw new Error(`Failed to delete batch certificates: ${error.message}`);
    }
  }

  /**
   * Get storage statistics for certificates
   * @returns {Promise<object>} Storage statistics
   */
  async getCertificateStorageStats() {
    try {
      const certificateFiles = await this.listFiles('certificates/', 10000);
      const templateFiles = await this.listFiles('templates/', 1000);

      const certificateStats = {
        totalFiles: certificateFiles.files.length,
        totalSize: certificateFiles.files.reduce((sum, file) => sum + file.size, 0),
        oldestFile: certificateFiles.files.length > 0 ? 
          Math.min(...certificateFiles.files.map(f => new Date(f.lastModified).getTime())) : null,
        newestFile: certificateFiles.files.length > 0 ? 
          Math.max(...certificateFiles.files.map(f => new Date(f.lastModified).getTime())) : null
      };

      const templateStats = {
        totalFiles: templateFiles.files.length,
        totalSize: templateFiles.files.reduce((sum, file) => sum + file.size, 0)
      };

      return {
        success: true,
        certificates: {
          ...certificateStats,
          totalSizeMB: Math.round(certificateStats.totalSize / (1024 * 1024) * 100) / 100,
          oldestFile: certificateStats.oldestFile ? new Date(certificateStats.oldestFile).toISOString() : null,
          newestFile: certificateStats.newestFile ? new Date(certificateStats.newestFile).toISOString() : null
        },
        templates: {
          ...templateStats,
          totalSizeMB: Math.round(templateStats.totalSize / (1024 * 1024) * 100) / 100
        }
      };

    } catch (error) {
      throw new Error(`Failed to get storage statistics: ${error.message}`);
    }
  }
}

module.exports = new S3Service();