const { Batch, Participant, EmailCampaign, EmailDeliveryLog, CertificateIdLog, Template } = require('../models');
const { Op } = require('sequelize');
const { Parser } = require('json2csv');

class ReportingService {
  /**
   * Get dashboard summary statistics
   */
  async getDashboardStats(dateRange = {}) {
    const { startDate, endDate } = dateRange;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    try {
      // Get certificate statistics
      const totalCertificates = await Participant.count({ where: whereClause });
      const totalBatches = await Batch.count({ where: whereClause });
      
      // Get email statistics
      const totalEmailCampaigns = await EmailCampaign.count({ where: whereClause });
      const totalEmailsSent = await EmailDeliveryLog.count({
        where: {
          ...whereClause,
          deliveryStatus: { [Op.in]: ['sent', 'delivered'] }
        }
      });
      
      // Get delivery statistics
      const emailStats = await EmailDeliveryLog.findAll({
        attributes: [
          'deliveryStatus',
          [EmailDeliveryLog.sequelize.fn('COUNT', EmailDeliveryLog.sequelize.col('id')), 'count']
        ],
        where: whereClause,
        group: ['deliveryStatus'],
        raw: true
      });

      // Get recent activity (last 7 days)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);
      
      const recentBatches = await Batch.count({
        where: {
          createdAt: { [Op.gte]: recentDate }
        }
      });

      const recentCertificates = await Participant.count({
        where: {
          createdAt: { [Op.gte]: recentDate }
        }
      });

      // Calculate delivery rates
      const deliveryStats = emailStats.reduce((acc, stat) => {
        acc[stat.deliveryStatus] = parseInt(stat.count);
        return acc;
      }, {});

      const totalEmails = Object.values(deliveryStats).reduce((sum, count) => sum + count, 0);
      const deliveryRate = totalEmails > 0 ? ((deliveryStats.delivered || 0) / totalEmails * 100).toFixed(2) : 0;
      const bounceRate = totalEmails > 0 ? ((deliveryStats.bounced || 0) / totalEmails * 100).toFixed(2) : 0;

      return {
        summary: {
          totalCertificates,
          totalBatches,
          totalEmailCampaigns,
          totalEmailsSent,
          deliveryRate: parseFloat(deliveryRate),
          bounceRate: parseFloat(bounceRate)
        },
        recentActivity: {
          recentBatches,
          recentCertificates
        },
        emailDeliveryStats: deliveryStats
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard stats: ${error.message}`);
    }
  }

  /**
   * Get certificate generation reports
   */
  async getCertificateReports(filters = {}) {
    const { startDate, endDate, eventCategories, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    const batchWhereClause = {};

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (eventCategories && eventCategories.length > 0) {
      batchWhereClause.eventCategories = {
        [Op.overlap]: eventCategories
      };
    }

    try {
      const { count, rows } = await Participant.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Batch,
            as: 'batch',
            where: batchWhereClause,
            include: [
              {
                model: Template,
                as: 'template',
                attributes: ['id', 'name']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Get category statistics
      const categoryStats = await Batch.findAll({
        attributes: [
          'eventCategories',
          [Batch.sequelize.fn('COUNT', Batch.sequelize.col('participants.id')), 'certificateCount']
        ],
        include: [
          {
            model: Participant,
            as: 'participants',
            attributes: []
          }
        ],
        where: batchWhereClause,
        group: ['Batch.id', 'eventCategories'],
        raw: false
      });

      // Process category statistics
      const categoryBreakdown = {};
      categoryStats.forEach(batch => {
        if (batch.eventCategories) {
          batch.eventCategories.forEach(category => {
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
          });
        }
      });

      return {
        certificates: rows.map(participant => ({
          id: participant.id,
          name: participant.name,
          email: participant.email,
          certificateId: participant.certificateId,
          batchName: participant.batch?.name,
          eventCategories: participant.batch?.eventCategories,
          templateName: participant.batch?.template?.name,
          createdAt: participant.createdAt,
          cloudUrl: participant.cloudUrl
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        },
        categoryBreakdown
      };
    } catch (error) {
      throw new Error(`Failed to get certificate reports: ${error.message}`);
    }
  }

  /**
   * Get email campaign analytics
   */
  async getEmailCampaignReports(filters = {}) {
    const { startDate, endDate, campaignIds, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    const whereClause = {};

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (campaignIds && campaignIds.length > 0) {
      whereClause.id = { [Op.in]: campaignIds };
    }

    try {
      const { count, rows } = await EmailCampaign.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Batch,
            as: 'batch',
            attributes: ['id', 'name', 'eventCategories']
          },
          {
            model: EmailDeliveryLog,
            as: 'deliveryLogs',
            attributes: ['deliveryStatus'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Calculate detailed statistics for each campaign
      const campaignsWithStats = await Promise.all(rows.map(async (campaign) => {
        const deliveryStats = await EmailDeliveryLog.findAll({
          attributes: [
            'deliveryStatus',
            [EmailDeliveryLog.sequelize.fn('COUNT', EmailDeliveryLog.sequelize.col('id')), 'count']
          ],
          where: { campaignId: campaign.id },
          group: ['deliveryStatus'],
          raw: true
        });

        const stats = deliveryStats.reduce((acc, stat) => {
          acc[stat.deliveryStatus] = parseInt(stat.count);
          return acc;
        }, {});

        const totalSent = Object.values(stats).reduce((sum, count) => sum + count, 0);
        const deliveryRate = totalSent > 0 ? ((stats.delivered || 0) / totalSent * 100).toFixed(2) : 0;
        const bounceRate = totalSent > 0 ? ((stats.bounced || 0) / totalSent * 100).toFixed(2) : 0;

        return {
          id: campaign.id,
          subject: campaign.subject,
          batchName: campaign.batch?.name,
          eventCategories: campaign.batch?.eventCategories,
          totalRecipients: campaign.totalRecipients,
          emailsSent: campaign.emailsSent,
          emailsDelivered: campaign.emailsDelivered,
          emailsFailed: campaign.emailsFailed,
          status: campaign.status,
          createdAt: campaign.createdAt,
          completedAt: campaign.completedAt,
          deliveryRate: parseFloat(deliveryRate),
          bounceRate: parseFloat(bounceRate),
          deliveryStats: stats
        };
      }));

      // Get overall email statistics
      const overallStats = await EmailDeliveryLog.findAll({
        attributes: [
          'deliveryStatus',
          [EmailDeliveryLog.sequelize.fn('COUNT', EmailDeliveryLog.sequelize.col('id')), 'count']
        ],
        include: [
          {
            model: EmailCampaign,
            as: 'campaign',
            where: whereClause,
            attributes: []
          }
        ],
        group: ['deliveryStatus'],
        raw: true
      });

      const overallDeliveryStats = overallStats.reduce((acc, stat) => {
        acc[stat.deliveryStatus] = parseInt(stat.count);
        return acc;
      }, {});

      return {
        campaigns: campaignsWithStats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        },
        overallStats: overallDeliveryStats
      };
    } catch (error) {
      throw new Error(`Failed to get email campaign reports: ${error.message}`);
    }
  }

  /**
   * Export report data in various formats
   */
  async exportReportData(reportType, format, filters = {}) {
    try {
      let data = [];
      let filename = '';

      switch (reportType) {
        case 'certificates':
          const certReport = await this.getCertificateReports({ ...filters, limit: 10000 });
          data = certReport.certificates;
          filename = `certificate-report-${new Date().toISOString().split('T')[0]}`;
          break;

        case 'emails':
          const emailReport = await this.getEmailCampaignReports({ ...filters, limit: 10000 });
          data = emailReport.campaigns;
          filename = `email-campaign-report-${new Date().toISOString().split('T')[0]}`;
          break;

        case 'dashboard':
          const dashboardStats = await this.getDashboardStats(filters);
          data = [dashboardStats.summary];
          filename = `dashboard-summary-${new Date().toISOString().split('T')[0]}`;
          break;

        default:
          throw new Error('Invalid report type');
      }

      if (format === 'csv') {
        const parser = new Parser();
        return {
          data: parser.parse(data),
          filename: `${filename}.csv`,
          contentType: 'text/csv'
        };
      } else if (format === 'json') {
        return {
          data: JSON.stringify(data, null, 2),
          filename: `${filename}.json`,
          contentType: 'application/json'
        };
      } else {
        throw new Error('Unsupported export format');
      }
    } catch (error) {
      throw new Error(`Failed to export report data: ${error.message}`);
    }
  }

  /**
   * Get event category statistics
   */
  async getEventCategoryStats(dateRange = {}) {
    const { startDate, endDate } = dateRange;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    try {
      const batches = await Batch.findAll({
        where: whereClause,
        include: [
          {
            model: Participant,
            as: 'participants',
            attributes: ['id']
          }
        ]
      });

      const categoryStats = {};
      const categoryTrends = {};

      batches.forEach(batch => {
        if (batch.eventCategories) {
          batch.eventCategories.forEach(category => {
            if (!categoryStats[category]) {
              categoryStats[category] = {
                batches: 0,
                certificates: 0
              };
            }
            categoryStats[category].batches += 1;
            categoryStats[category].certificates += batch.participants.length;

            // Track monthly trends
            const month = batch.createdAt.toISOString().substring(0, 7);
            if (!categoryTrends[month]) {
              categoryTrends[month] = {};
            }
            if (!categoryTrends[month][category]) {
              categoryTrends[month][category] = 0;
            }
            categoryTrends[month][category] += batch.participants.length;
          });
        }
      });

      return {
        categoryStats,
        categoryTrends
      };
    } catch (error) {
      throw new Error(`Failed to get event category stats: ${error.message}`);
    }
  }
}

module.exports = new ReportingService();