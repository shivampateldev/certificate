const express = require('express');
const multer = require('multer');
const s3Service = require('../services/s3Service');
const sesService = require('../services/sesService');
const { getCloudStatus } = require('../services/cloudService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Get AWS services status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getCloudStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Upload file to S3
 */
router.post('/s3/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const { category = 'general', batchId } = req.body;
    
    // Generate S3 key based on file type and category
    let s3Key;
    if (category === 'certificate') {
      s3Key = s3Service.getCertificatePath(batchId || 'default', 'general') + req.file.originalname;
    } else if (category === 'template') {
      s3Key = s3Service.getTemplatePath(category) + req.file.originalname;
    } else {
      s3Key = `uploads/${category}/${Date.now()}-${req.file.originalname}`;
    }

    // Create temporary file for upload
    const tempPath = `temp/${Date.now()}-${req.file.originalname}`;
    const fs = require('fs');
    
    // Ensure temp directory exists
    if (!fs.existsSync('temp')) {
      fs.mkdirSync('temp', { recursive: true });
    }
    
    fs.writeFileSync(tempPath, req.file.buffer);

    try {
      const result = await s3Service.uploadFile(tempPath, s3Key);
      
      // Clean up temp file
      fs.unlinkSync(tempPath);
      
      res.json({
        success: true,
        result
      });
    } catch (uploadError) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw uploadError;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get presigned URL for S3 object
 */
router.get('/s3/presigned-url/:key(*)', async (req, res) => {
  try {
    const { key } = req.params;
    const { expiresIn = 3600 } = req.query;
    
    const url = await s3Service.getPresignedUrl(key, parseInt(expiresIn));
    
    res.json({
      success: true,
      url
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List S3 objects
 */
router.get('/s3/list', async (req, res) => {
  try {
    const { prefix = '', maxKeys = 100 } = req.query;
    
    const result = await s3Service.listFiles(prefix, parseInt(maxKeys));
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete S3 object
 */
router.delete('/s3/:key(*)', async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await s3Service.deleteFile(key);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send email via SES
 */
router.post('/ses/send-email', async (req, res) => {
  try {
    const { to, from, subject, htmlBody, textBody, attachments } = req.body;
    
    if (!to || !from || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, from, subject'
      });
    }

    const result = await sesService.sendEmail({
      to,
      from,
      subject,
      htmlBody,
      textBody,
      attachments
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send bulk emails via SES
 */
router.post('/ses/send-bulk', async (req, res) => {
  try {
    const { recipients, template, attachments } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required'
      });
    }

    if (!template || !template.subject || !template.from) {
      return res.status(400).json({
        success: false,
        error: 'Template with subject and from fields is required'
      });
    }

    const results = await sesService.sendBulkEmails(recipients, template, attachments);
    
    const summary = {
      total: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length
    };
    
    res.json({
      success: true,
      summary,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verify email address with SES
 */
router.post('/ses/verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const result = await sesService.verifyEmail(email);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get SES sending statistics
 */
router.get('/ses/statistics', async (req, res) => {
  try {
    const stats = await sesService.getSendingStatistics();
    const quota = await sesService.getSendingQuota();
    
    res.json({
      success: true,
      statistics: stats.statistics,
      quota: quota.quota
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;