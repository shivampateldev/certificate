const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @route POST /api/emails/campaign
 * @desc Create a new email campaign
 * @access Public
 */
router.post('/campaign', [
  body('batchId')
    .isInt({ min: 1 })
    .withMessage('Batch ID must be a positive integer'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Subject must be between 1 and 500 characters'),
  body('bodyTemplate')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Body template is required'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled time must be a valid ISO 8601 date')
], handleValidationErrors, async (req, res) => {
  try {
    const result = await emailService.createCampaign(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating email campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/emails/send/:campaignId
 * @desc Send email campaign
 * @access Public
 */
router.post('/send/:campaignId', [
  param('campaignId')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = await emailService.sendCampaign(parseInt(campaignId));
    res.json(result);
  } catch (error) {
    console.error('Error sending email campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/emails/campaign/:id/status
 * @desc Get campaign status and progress
 * @access Public
 */
router.get('/campaign/:id/status', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await emailService.getCampaignStatus(parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error getting campaign status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/emails/campaign/:id
 * @desc Get campaign details by ID
 * @access Public
 */
router.get('/campaign/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await emailService.getCampaignById(parseInt(id));
    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/emails/campaigns
 * @desc Get all email campaigns with pagination
 * @access Public
 */
router.get('/campaigns', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status value'),
  query('batchId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Batch ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      status: req.query.status,
      batchId: req.query.batchId
    };
    
    const result = await emailService.getAllCampaigns(options);
    res.json(result);
  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/emails/campaign/:id/retry
 * @desc Retry failed email deliveries for a campaign
 * @access Public
 */
router.post('/campaign/:id/retry', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await emailService.retryFailedEmails(parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error retrying failed emails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/emails/campaign/:id/delivery-stats
 * @desc Get delivery statistics for a campaign
 * @access Public
 */
router.get('/campaign/:id/delivery-stats', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryStats = await emailService.getDeliveryStatistics(parseInt(id));
    res.json({
      success: true,
      deliveryStats
    });
  } catch (error) {
    console.error('Error getting delivery statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/emails/campaign/:id
 * @desc Update email campaign
 * @access Public
 */
router.put('/campaign/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Subject must be between 1 and 500 characters'),
  body('bodyTemplate')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Body template cannot be empty'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled time must be a valid ISO 8601 date'),
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'cancelled'])
    .withMessage('Invalid status value for update')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { EmailCampaign } = require('../models');
    
    const campaign = await EmailCampaign.findByPk(parseInt(id));
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Only allow updates for draft or scheduled campaigns
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update campaign that is already sending or completed'
      });
    }

    await campaign.update(req.body);
    
    const updatedCampaign = await emailService.getCampaignById(parseInt(id));
    res.json({
      success: true,
      campaign: updatedCampaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/emails/campaign/:id
 * @desc Delete email campaign (only if draft or scheduled)
 * @access Public
 */
router.delete('/campaign/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { EmailCampaign, EmailDeliveryLog } = require('../models');
    
    const campaign = await EmailCampaign.findByPk(parseInt(id));
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Only allow deletion for draft or scheduled campaigns
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete campaign that is already sending or completed'
      });
    }

    // Delete associated delivery logs first
    await EmailDeliveryLog.destroy({
      where: { campaignId: parseInt(id) }
    });

    // Delete campaign
    await campaign.destroy();

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/emails/campaign/:id/delivery-logs
 * @desc Get delivery logs for a campaign with pagination
 * @access Public
 */
router.get('/campaign/:id/delivery-logs', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['sent', 'delivered', 'bounced', 'failed', 'complained'])
    .withMessage('Invalid delivery status'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term must not be empty')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const emailTrackingService = require('../services/emailTrackingService');
    
    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 50,
      status: req.query.status,
      search: req.query.search
    };
    
    const result = await emailTrackingService.getDeliveryLogs(parseInt(id), options);
    res.json(result);
  } catch (error) {
    console.error('Error getting delivery logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/emails/campaign/:id/progress
 * @desc Get real-time campaign progress
 * @access Public
 */
router.get('/campaign/:id/progress', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const emailTrackingService = require('../services/emailTrackingService');
    
    const progress = await emailTrackingService.getCampaignProgress(parseInt(id));
    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Error getting campaign progress:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/emails/campaign/:id/statistics-summary
 * @desc Get comprehensive delivery statistics summary
 * @access Public
 */
router.get('/campaign/:id/statistics-summary', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const emailTrackingService = require('../services/emailTrackingService');
    
    const summary = await emailTrackingService.getDeliveryStatisticsSummary(parseInt(id));
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting statistics summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/emails/campaign/:id/retry-advanced
 * @desc Retry failed emails with advanced options
 * @access Public
 */
router.post('/campaign/:id/retry-advanced', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),
  body('maxRetries')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Max retries must be between 1 and 5'),
  body('delayBetweenRetries')
    .optional()
    .isInt({ min: 1000, max: 30000 })
    .withMessage('Delay must be between 1000 and 30000 milliseconds')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const options = {
      maxRetries: req.body.maxRetries || 3,
      delayBetweenRetries: req.body.delayBetweenRetries || 2000
    };
    
    const result = await emailService.retryFailedEmails(parseInt(id), options);
    res.json(result);
  } catch (error) {
    console.error('Error retrying failed emails with advanced options:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/emails/tracking/active-sessions
 * @desc Get all active tracking sessions
 * @access Public
 */
router.get('/tracking/active-sessions', async (req, res) => {
  try {
    const emailTrackingService = require('../services/emailTrackingService');
    const activeSessions = emailTrackingService.getActiveTrackingSessions();
    
    res.json({
      success: true,
      activeSessions,
      count: activeSessions.length
    });
  } catch (error) {
    console.error('Error getting active tracking sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;