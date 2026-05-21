const { EmailCampaign, EmailDeliveryLog, Participant } = require('../models');
const { Op } = require('sequelize');

class EmailTrackingService {
  constructor() {
    this.activeTracking = new Map(); // Store active campaign tracking
    this.progressCallbacks = new Map(); // Store progress callbacks for real-time updates
  }

  /**
   * Start tracking an email campaign
   * @param {number} campaignId - Campaign ID to track
   * @param {function} progressCallback - Callback for progress updates
   */
  startTracking(campaignId, progressCallback = null) {
    this.activeTracking.set(campaignId, {
      startTime: new Date(),
      lastUpdate: new Date(),
      status: 'active'
    });

    if (progressCallback) {
      this.progressCallbacks.set(campaignId, progressCallback);
    }

    console.log(`Started tracking campaign ${campaignId}`);
  }

  /**
   * Stop tracking an email campaign
   * @param {number} campaignId - Campaign ID to stop tracking
   */
  stopTracking(campaignId) {
    this.activeTracking.delete(campaignId);
    this.progressCallbacks.delete(campaignId);
    console.log(`Stopped tracking campaign ${campaignId}`);
  }

  /**
   * Update campaign progress and notify callbacks
   * @param {number} campaignId - Campaign ID
   * @param {object} progressData - Progress information
   */
  async updateProgress(campaignId, progressData) {
    try {
      const tracking = this.activeTracking.get(campaignId);
      if (!tracking) {
        return; // Not actively tracking this campaign
      }

      tracking.lastUpdate = new Date();

      // Get current campaign statistics
      const stats = await this.getCampaignProgress(campaignId);
      
      // Merge with provided progress data
      const fullProgressData = {
        ...stats,
        ...progressData,
        timestamp: new Date()
      };

      // Notify progress callback if exists
      const callback = this.progressCallbacks.get(campaignId);
      if (callback && typeof callback === 'function') {
        try {
          callback(fullProgressData);
        } catch (error) {
          console.error(`Error in progress callback for campaign ${campaignId}:`, error);
        }
      }

      // Update campaign statistics in database
      await this.updateCampaignStatistics(campaignId);

      return fullProgressData;
    } catch (error) {
      console.error(`Error updating progress for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get real-time campaign progress
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Progress data
   */
  async getCampaignProgress(campaignId) {
    try {
      const campaign = await EmailCampaign.findByPk(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get delivery statistics from logs
      const deliveryStats = await EmailDeliveryLog.findAll({
        where: { campaignId },
        attributes: [
          'deliveryStatus',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        group: ['deliveryStatus'],
        raw: true
      });

      const stats = {
        sent: 0,
        delivered: 0,
        bounced: 0,
        failed: 0,
        complained: 0
      };

      deliveryStats.forEach(stat => {
        if (stats.hasOwnProperty(stat.deliveryStatus)) {
          stats[stat.deliveryStatus] = parseInt(stat.count);
        }
      });

      const totalProcessed = Object.values(stats).reduce((sum, count) => sum + count, 0);
      const progressPercentage = campaign.totalRecipients > 0 
        ? Math.round((totalProcessed / campaign.totalRecipients) * 100) 
        : 0;

      return {
        campaignId,
        status: campaign.status,
        totalRecipients: campaign.totalRecipients,
        totalProcessed,
        progressPercentage,
        deliveryStats: stats,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        isActive: this.activeTracking.has(campaignId)
      };
    } catch (error) {
      console.error(`Error getting campaign progress for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Update campaign statistics in database
   * @param {number} campaignId - Campaign ID
   */
  async updateCampaignStatistics(campaignId) {
    try {
      const deliveryStats = await EmailDeliveryLog.findAll({
        where: { campaignId },
        attributes: [
          'deliveryStatus',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        group: ['deliveryStatus'],
        raw: true
      });

      const stats = {
        sent: 0,
        delivered: 0,
        failed: 0
      };

      deliveryStats.forEach(stat => {
        if (stat.deliveryStatus === 'sent') {
          stats.sent = parseInt(stat.count);
        } else if (stat.deliveryStatus === 'delivered') {
          stats.delivered = parseInt(stat.count);
        } else if (stat.deliveryStatus === 'failed' || stat.deliveryStatus === 'bounced') {
          stats.failed += parseInt(stat.count);
        }
      });

      await EmailCampaign.update({
        emailsSent: stats.sent,
        emailsDelivered: stats.delivered,
        emailsFailed: stats.failed
      }, {
        where: { id: campaignId }
      });
    } catch (error) {
      console.error(`Error updating campaign statistics for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Log email delivery status
   * @param {object} deliveryData - Delivery log data
   */
  async logDeliveryStatus(deliveryData) {
    try {
      const {
        campaignId,
        participantId,
        emailAddress,
        deliveryStatus,
        sesMessageId,
        errorMessage
      } = deliveryData;

      // Create or update delivery log
      const [log, created] = await EmailDeliveryLog.findOrCreate({
        where: {
          campaignId,
          participantId
        },
        defaults: {
          emailAddress,
          deliveryStatus,
          deliveryTime: new Date(),
          sesMessageId,
          errorMessage
        }
      });

      if (!created) {
        // Update existing log
        await log.update({
          deliveryStatus,
          deliveryTime: new Date(),
          sesMessageId,
          errorMessage
        });
      }

      // Update campaign progress if actively tracking
      if (this.activeTracking.has(campaignId)) {
        await this.updateProgress(campaignId, {
          lastDelivery: {
            participantId,
            emailAddress,
            status: deliveryStatus,
            timestamp: new Date()
          }
        });
      }

      return log;
    } catch (error) {
      console.error('Error logging delivery status:', error);
      throw error;
    }
  }

  /**
   * Get delivery logs for a campaign with pagination
   * @param {number} campaignId - Campaign ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Delivery logs with pagination
   */
  async getDeliveryLogs(campaignId, options = {}) {
    try {
      const { page = 1, limit = 50, status, search } = options;
      const offset = (page - 1) * limit;

      const whereClause = { campaignId };
      
      if (status) {
        whereClause.deliveryStatus = status;
      }

      if (search) {
        whereClause[Op.or] = [
          { emailAddress: { [Op.iLike]: `%${search}%` } },
          { '$participant.name$': { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await EmailDeliveryLog.findAndCountAll({
        where: whereClause,
        include: [{
          model: Participant,
          as: 'participant',
          attributes: ['id', 'name', 'email', 'certificateId']
        }],
        order: [['deliveryTime', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        logs: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error(`Error getting delivery logs for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get failed deliveries for retry
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<Array>} Failed delivery logs
   */
  async getFailedDeliveries(campaignId) {
    try {
      const failedLogs = await EmailDeliveryLog.findAll({
        where: {
          campaignId,
          deliveryStatus: { [Op.in]: ['failed', 'bounced'] }
        },
        include: [{
          model: Participant,
          as: 'participant',
          attributes: ['id', 'name', 'email', 'certificateId']
        }],
        order: [['deliveryTime', 'DESC']]
      });

      return failedLogs;
    } catch (error) {
      console.error(`Error getting failed deliveries for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Retry failed email delivery
   * @param {number} logId - Delivery log ID
   * @param {function} sendEmailFunction - Function to send email
   * @returns {Promise<object>} Retry result
   */
  async retryDelivery(logId, sendEmailFunction) {
    try {
      const log = await EmailDeliveryLog.findByPk(logId, {
        include: [{
          model: Participant,
          as: 'participant'
        }, {
          model: EmailCampaign,
          as: 'campaign'
        }]
      });

      if (!log) {
        throw new Error('Delivery log not found');
      }

      if (log.deliveryStatus !== 'failed' && log.deliveryStatus !== 'bounced') {
        throw new Error('Can only retry failed or bounced deliveries');
      }

      try {
        // Attempt to send email again
        const result = await sendEmailFunction(log.participant, log.campaign);
        
        // Update log with success
        await log.update({
          deliveryStatus: 'sent',
          deliveryTime: new Date(),
          sesMessageId: result.messageId,
          errorMessage: null
        });

        // Update campaign progress
        await this.updateProgress(log.campaignId, {
          retrySuccess: {
            participantId: log.participantId,
            timestamp: new Date()
          }
        });

        return {
          success: true,
          messageId: result.messageId,
          participant: log.participant
        };
      } catch (error) {
        // Update log with retry failure
        await log.update({
          errorMessage: `Retry failed: ${error.message}`,
          deliveryTime: new Date()
        });

        return {
          success: false,
          error: error.message,
          participant: log.participant
        };
      }
    } catch (error) {
      console.error(`Error retrying delivery for log ${logId}:`, error);
      throw error;
    }
  }

  /**
   * Get campaign delivery statistics summary
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Statistics summary
   */
  async getDeliveryStatisticsSummary(campaignId) {
    try {
      const campaign = await EmailCampaign.findByPk(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const deliveryStats = await EmailDeliveryLog.findAll({
        where: { campaignId },
        attributes: [
          'deliveryStatus',
          [require('sequelize').fn('COUNT', '*'), 'count'],
          [require('sequelize').fn('MIN', require('sequelize').col('deliveryTime')), 'firstDelivery'],
          [require('sequelize').fn('MAX', require('sequelize').col('deliveryTime')), 'lastDelivery']
        ],
        group: ['deliveryStatus'],
        raw: true
      });

      const stats = {
        sent: { count: 0, firstDelivery: null, lastDelivery: null },
        delivered: { count: 0, firstDelivery: null, lastDelivery: null },
        bounced: { count: 0, firstDelivery: null, lastDelivery: null },
        failed: { count: 0, firstDelivery: null, lastDelivery: null },
        complained: { count: 0, firstDelivery: null, lastDelivery: null }
      };

      deliveryStats.forEach(stat => {
        if (stats.hasOwnProperty(stat.deliveryStatus)) {
          stats[stat.deliveryStatus] = {
            count: parseInt(stat.count),
            firstDelivery: stat.firstDelivery,
            lastDelivery: stat.lastDelivery
          };
        }
      });

      const totalProcessed = Object.values(stats).reduce((sum, stat) => sum + stat.count, 0);
      const successRate = totalProcessed > 0 
        ? Math.round(((stats.sent.count + stats.delivered.count) / totalProcessed) * 100) 
        : 0;

      return {
        campaignId,
        totalRecipients: campaign.totalRecipients,
        totalProcessed,
        successRate,
        deliveryStats: stats,
        campaignStatus: campaign.status,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt
      };
    } catch (error) {
      console.error(`Error getting delivery statistics summary for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active tracking sessions
   * @returns {Array} Active tracking sessions
   */
  getActiveTrackingSessions() {
    return Array.from(this.activeTracking.entries()).map(([campaignId, tracking]) => ({
      campaignId,
      ...tracking
    }));
  }

  /**
   * Clean up old tracking sessions
   * @param {number} maxAgeHours - Maximum age in hours
   */
  cleanupOldSessions(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    
    for (const [campaignId, tracking] of this.activeTracking.entries()) {
      if (tracking.lastUpdate < cutoffTime) {
        this.stopTracking(campaignId);
        console.log(`Cleaned up old tracking session for campaign ${campaignId}`);
      }
    }
  }
}

module.exports = new EmailTrackingService();