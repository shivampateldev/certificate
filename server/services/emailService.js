const sesService = require('./sesService');
const emailTrackingService = require('./emailTrackingService');
const { EmailCampaign, EmailDeliveryLog, Participant, Batch } = require('../models');
const { Op } = require('sequelize');

class EmailService {
  /**
   * Create a new email campaign
   * @param {object} campaignData - Campaign configuration
   * @returns {Promise<object>} Created campaign
   */
  async createCampaign(campaignData) {
    try {
      const { batchId, subject, bodyTemplate, scheduledAt } = campaignData;

      // Validate batch exists and get participant count
      const batch = await Batch.findByPk(batchId, {
        include: [{
          model: Participant,
          as: 'participants'
        }]
      });

      if (!batch) {
        throw new Error('Batch not found');
      }

      const totalRecipients = batch.participants ? batch.participants.length : 0;

      // Create campaign
      const campaign = await EmailCampaign.create({
        batchId,
        subject,
        bodyTemplate,
        totalRecipients,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'draft'
      });

      return {
        success: true,
        campaign: await this.getCampaignById(campaign.id)
      };
    } catch (error) {
      console.error('Error creating email campaign:', error);
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  /**
   * Send email campaign
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Send results
   */
  async sendCampaign(campaignId) {
    try {
      const campaign = await EmailCampaign.findByPk(campaignId, {
        include: [{
          model: Batch,
          as: 'batch',
          include: [{
            model: Participant,
            as: 'participants'
          }]
        }]
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        throw new Error(`Cannot send campaign with status: ${campaign.status}`);
      }

      // Update campaign status to sending
      await campaign.update({
        status: 'sending',
        startedAt: new Date()
      });

      // Start tracking the campaign
      emailTrackingService.startTracking(campaignId, (progressData) => {
        console.log(`Campaign ${campaignId} progress:`, progressData);
      });

      const participants = campaign.batch.participants;
      if (!participants || participants.length === 0) {
        throw new Error('No participants found in batch');
      }

      // Prepare email template
      const emailTemplate = {
        from: process.env.SES_FROM_EMAIL || 'noreply@example.com',
        subject: campaign.subject,
        htmlBody: this.generateHtmlTemplate(campaign.bodyTemplate),
        textBody: this.generateTextTemplate(campaign.bodyTemplate)
      };

      // Send emails in batches
      const results = await this.sendBulkEmails(campaign, participants, emailTemplate);

      // Update campaign statistics
      const successCount = results.filter(r => r.status === 'sent').length;
      const failureCount = results.filter(r => r.status === 'failed').length;

      await campaign.update({
        emailsSent: successCount,
        emailsFailed: failureCount,
        status: failureCount === 0 ? 'completed' : 'completed',
        completedAt: new Date()
      });

      // Stop tracking and update final progress
      await emailTrackingService.updateProgress(campaignId, {
        completed: true,
        finalStats: { sent: successCount, failed: failureCount }
      });
      emailTrackingService.stopTracking(campaignId);

      return {
        success: true,
        campaign: await this.getCampaignById(campaignId),
        results: {
          total: results.length,
          sent: successCount,
          failed: failureCount
        }
      };
    } catch (error) {
      console.error('Error sending email campaign:', error);
      
      // Update campaign status to failed and stop tracking
      await EmailCampaign.update(
        { status: 'failed', completedAt: new Date() },
        { where: { id: campaignId } }
      );
      
      emailTrackingService.stopTracking(campaignId);

      throw new Error(`Failed to send campaign: ${error.message}`);
    }
  }

  /**
   * Send bulk emails to participants
   * @param {object} campaign - Email campaign
   * @param {Array} participants - List of participants
   * @param {object} emailTemplate - Email template
   * @returns {Promise<Array>} Send results
   */
  async sendBulkEmails(campaign, participants, emailTemplate) {
    const results = [];
    const batchSize = 10; // SES rate limit consideration

    for (let i = 0; i < participants.length; i += batchSize) {
      const batch = participants.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (participant) => {
        try {
          // Personalize email content
          const personalizedTemplate = this.personalizeEmailTemplate(emailTemplate, participant);
          
          // Send email via SES
          const sesResult = await sesService.sendEmail({
            to: participant.email,
            from: emailTemplate.from,
            subject: personalizedTemplate.subject,
            htmlBody: personalizedTemplate.htmlBody,
            textBody: personalizedTemplate.textBody
          });

          // Log successful delivery using tracking service
          await emailTrackingService.logDeliveryStatus({
            campaignId: campaign.id,
            participantId: participant.id,
            emailAddress: participant.email,
            deliveryStatus: 'sent',
            sesMessageId: sesResult.messageId
          });

          return {
            participantId: participant.id,
            email: participant.email,
            status: 'sent',
            messageId: sesResult.messageId
          };
        } catch (error) {
          console.error(`Failed to send email to ${participant.email}:`, error);

          // Log failed delivery using tracking service
          await emailTrackingService.logDeliveryStatus({
            campaignId: campaign.id,
            participantId: participant.id,
            emailAddress: participant.email,
            deliveryStatus: 'failed',
            errorMessage: error.message
          });

          return {
            participantId: participant.id,
            email: participant.email,
            status: 'failed',
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect SES rate limits
      if (i + batchSize < participants.length) {
        await this.delay(1000); // 1 second delay
      }

      // Update campaign progress through tracking service
      await emailTrackingService.updateProgress(campaign.id, {
        batchCompleted: {
          batchNumber: Math.ceil(i / batchSize) + 1,
          totalBatches: Math.ceil(participants.length / batchSize),
          processed: Math.min(i + batchSize, participants.length),
          total: participants.length
        }
      });
    }

    return results;
  }

  /**
   * Get campaign by ID with full details
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Campaign details
   */
  async getCampaignById(campaignId) {
    try {
      const campaign = await EmailCampaign.findByPk(campaignId, {
        include: [
          {
            model: Batch,
            as: 'batch',
            attributes: ['id', 'name', 'eventCategories', 'totalParticipants']
          },
          {
            model: EmailDeliveryLog,
            as: 'deliveryLogs',
            attributes: ['deliveryStatus', 'deliveryTime', 'errorMessage']
          }
        ]
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return campaign;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw new Error(`Failed to fetch campaign: ${error.message}`);
    }
  }

  /**
   * Get campaign status and progress
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Campaign status
   */
  async getCampaignStatus(campaignId) {
    try {
      const campaign = await this.getCampaignById(campaignId);
      
      const deliveryStats = await this.getDeliveryStatistics(campaignId);

      return {
        success: true,
        status: {
          id: campaign.id,
          status: campaign.status,
          totalRecipients: campaign.totalRecipients,
          emailsSent: campaign.emailsSent,
          emailsDelivered: campaign.emailsDelivered,
          emailsFailed: campaign.emailsFailed,
          startedAt: campaign.startedAt,
          completedAt: campaign.completedAt,
          progress: campaign.totalRecipients > 0 
            ? Math.round((campaign.emailsSent / campaign.totalRecipients) * 100) 
            : 0,
          deliveryStats
        }
      };
    } catch (error) {
      console.error('Error getting campaign status:', error);
      throw new Error(`Failed to get campaign status: ${error.message}`);
    }
  }

  /**
   * Get delivery statistics for a campaign
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Delivery statistics
   */
  async getDeliveryStatistics(campaignId) {
    try {
      const stats = await EmailDeliveryLog.findAll({
        where: { campaignId },
        attributes: [
          'deliveryStatus',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        group: ['deliveryStatus'],
        raw: true
      });

      const deliveryStats = {
        sent: 0,
        delivered: 0,
        bounced: 0,
        failed: 0,
        complained: 0
      };

      stats.forEach(stat => {
        if (deliveryStats.hasOwnProperty(stat.deliveryStatus)) {
          deliveryStats[stat.deliveryStatus] = parseInt(stat.count);
        }
      });

      return deliveryStats;
    } catch (error) {
      console.error('Error getting delivery statistics:', error);
      throw new Error(`Failed to get delivery statistics: ${error.message}`);
    }
  }

  /**
   * Retry failed email deliveries with enhanced tracking
   * @param {number} campaignId - Campaign ID
   * @param {object} options - Retry options
   * @returns {Promise<object>} Retry results
   */
  async retryFailedEmails(campaignId, options = {}) {
    try {
      const { maxRetries = 3, delayBetweenRetries = 2000 } = options;
      
      const campaign = await EmailCampaign.findByPk(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get failed delivery logs using tracking service
      const failedLogs = await emailTrackingService.getFailedDeliveries(campaignId);

      if (failedLogs.length === 0) {
        return {
          success: true,
          message: 'No failed emails to retry',
          retryCount: 0
        };
      }

      // Start retry tracking
      emailTrackingService.startTracking(campaignId, (progressData) => {
        console.log(`Retry progress for campaign ${campaignId}:`, progressData);
      });

      // Prepare email template
      const emailTemplate = {
        from: process.env.SES_FROM_EMAIL || 'noreply@example.com',
        subject: campaign.subject,
        htmlBody: this.generateHtmlTemplate(campaign.bodyTemplate),
        textBody: this.generateTextTemplate(campaign.bodyTemplate)
      };

      const retryResults = [];
      let retrySuccessCount = 0;

      // Retry failed emails with exponential backoff
      for (let i = 0; i < failedLogs.length; i++) {
        const log = failedLogs[i];
        let retryAttempts = 0;
        let retrySuccess = false;

        while (retryAttempts < maxRetries && !retrySuccess) {
          try {
            // Add exponential backoff delay
            if (retryAttempts > 0) {
              const delay = delayBetweenRetries * Math.pow(2, retryAttempts - 1);
              await this.delay(delay);
            }

            const sendEmailFunction = async (participant, campaign) => {
              const personalizedTemplate = this.personalizeEmailTemplate(emailTemplate, participant);
              
              return await sesService.sendEmail({
                to: participant.email,
                from: emailTemplate.from,
                subject: personalizedTemplate.subject,
                htmlBody: personalizedTemplate.htmlBody,
                textBody: personalizedTemplate.textBody
              });
            };

            const retryResult = await emailTrackingService.retryDelivery(log.id, sendEmailFunction);
            
            if (retryResult.success) {
              retrySuccess = true;
              retrySuccessCount++;
              retryResults.push({
                participantId: log.participantId,
                email: log.participant.email,
                status: 'success',
                attempts: retryAttempts + 1,
                messageId: retryResult.messageId
              });
            } else {
              retryAttempts++;
              if (retryAttempts >= maxRetries) {
                retryResults.push({
                  participantId: log.participantId,
                  email: log.participant.email,
                  status: 'failed',
                  attempts: retryAttempts,
                  error: retryResult.error
                });
              }
            }
          } catch (error) {
            retryAttempts++;
            console.error(`Retry attempt ${retryAttempts} failed for ${log.participant.email}:`, error);
            
            if (retryAttempts >= maxRetries) {
              retryResults.push({
                participantId: log.participantId,
                email: log.participant.email,
                status: 'failed',
                attempts: retryAttempts,
                error: error.message
              });
            }
          }
        }

        // Update progress
        await emailTrackingService.updateProgress(campaignId, {
          retryProgress: {
            processed: i + 1,
            total: failedLogs.length,
            successCount: retrySuccessCount
          }
        });
      }

      // Update campaign statistics
      await emailTrackingService.updateCampaignStatistics(campaignId);
      
      // Stop retry tracking
      emailTrackingService.stopTracking(campaignId);

      return {
        success: true,
        retryCount: failedLogs.length,
        successCount: retrySuccessCount,
        failedCount: failedLogs.length - retrySuccessCount,
        results: retryResults,
        summary: {
          totalAttempted: failedLogs.length,
          successful: retrySuccessCount,
          stillFailed: failedLogs.length - retrySuccessCount,
          successRate: failedLogs.length > 0 
            ? Math.round((retrySuccessCount / failedLogs.length) * 100) 
            : 0
        }
      };
    } catch (error) {
      console.error('Error retrying failed emails:', error);
      emailTrackingService.stopTracking(campaignId);
      throw new Error(`Failed to retry emails: ${error.message}`);
    }
  }

  /**
   * Get all campaigns with pagination
   * @param {object} options - Query options
   * @returns {Promise<object>} Campaigns list
   */
  async getAllCampaigns(options = {}) {
    try {
      const { page = 1, limit = 10, status, batchId } = options;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (status) whereClause.status = status;
      if (batchId) whereClause.batchId = batchId;

      const { count, rows } = await EmailCampaign.findAndCountAll({
        where: whereClause,
        include: [{
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'eventCategories', 'totalParticipants']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        campaigns: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }
  }

  /**
   * Personalize email template with participant data
   * @param {object} template - Email template
   * @param {object} participant - Participant data
   * @returns {object} Personalized template
   */
  personalizeEmailTemplate(template, participant) {
    const personalizedSubject = template.subject
      .replace(/{{name}}/g, participant.name || 'Participant')
      .replace(/{{certificateId}}/g, participant.certificateId || 'N/A')
      .replace(/{{email}}/g, participant.email || '');

    const personalizedHtmlBody = template.htmlBody
      .replace(/{{name}}/g, participant.name || 'Participant')
      .replace(/{{certificateId}}/g, participant.certificateId || 'N/A')
      .replace(/{{email}}/g, participant.email || '');

    const personalizedTextBody = template.textBody
      .replace(/{{name}}/g, participant.name || 'Participant')
      .replace(/{{certificateId}}/g, participant.certificateId || 'N/A')
      .replace(/{{email}}/g, participant.email || '');

    return {
      subject: personalizedSubject,
      htmlBody: personalizedHtmlBody,
      textBody: personalizedTextBody
    };
  }

  /**
   * Generate HTML template from body template
   * @param {string} bodyTemplate - Plain text template
   * @returns {string} HTML template
   */
  generateHtmlTemplate(bodyTemplate) {
    // Convert plain text to HTML with basic formatting
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Certificate Notification</h2>
          </div>
          <div class="content">
            ${bodyTemplate.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text template from body template
   * @param {string} bodyTemplate - Body template
   * @returns {string} Text template
   */
  generateTextTemplate(bodyTemplate) {
    return `
Certificate Notification

${bodyTemplate}

---
This is an automated message. Please do not reply to this email.
    `.trim();
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new EmailService();