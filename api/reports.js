/**
 * Reports API
 * Provides analytics and reporting on all platform activities
 */

const {
  ParticipantModel,
  BatchModel,
  TemplateModel,
  CertificateGenerationModel,
  EmailCampaignModel,
  EmailLogModel
} = require('./models');

module.exports.config = { api: { bodyParser: false } };

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlPath = req.url.split('?')[0];
  const { method } = req;

  try {
    // GET /api/reports/dashboard - Dashboard statistics
    if (urlPath === '/api/reports/dashboard' && method === 'GET') {
      try {
        const participants = await ParticipantModel.getAll();
        const batches = await BatchModel.getAll();
        const templates = await TemplateModel.getAll();
        const generations = await CertificateGenerationModel.getAll?.() || [];
        const campaigns = await EmailCampaignModel.getAll?.() || [];
        const logs = await EmailLogModel.getAll?.() || [];

        // Calculate total certificates
        const totalCertificates = generations.reduce((sum, g) => sum + (g.certificate_count || 0), 0);
        
        // Calculate email stats
        const emailDeliveryStats = {
          delivered: logs.filter(l => l.status === 'delivered').length,
          sent: logs.filter(l => l.status === 'sent').length,
          failed: logs.filter(l => l.status === 'failed').length,
          bounced: logs.filter(l => l.status === 'bounced').length
        };

        const totalAttempted = emailDeliveryStats.delivered + emailDeliveryStats.sent + emailDeliveryStats.failed + emailDeliveryStats.bounced;
        const totalEmailsSent = emailDeliveryStats.delivered + emailDeliveryStats.sent;
        const deliveryRate = totalAttempted > 0 ? Math.round((totalEmailsSent / totalAttempted) * 100) : 0;

        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentGenerations = generations.filter(g => new Date(g.generated_at || g.created_at || Date.now()) >= sevenDaysAgo);
        const recentCertificates = recentGenerations.reduce((sum, g) => sum + (g.certificate_count || 0), 0);

        // Generate dynamic trendData for last 6 months
        const trendData = {
          labels: [],
          certificates: [],
          emails: []
        };
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const label = d.toLocaleString('default', { month: 'short' });
          const month = d.getMonth();
          const year = d.getFullYear();

          // Count certificates generated in this month/year
          const certCount = generations
            .filter(g => {
              const gDate = new Date(g.generated_at || g.created_at || Date.now());
              return gDate.getMonth() === month && gDate.getFullYear() === year;
            })
            .reduce((sum, g) => sum + (g.certificate_count || 0), 0);

          // Count emails sent in this month/year
          const emailCount = logs
            .filter(l => {
              const lDate = new Date(l.sent_at || l.created_at || Date.now());
              return lDate.getMonth() === month && lDate.getFullYear() === year && (l.status === 'sent' || l.status === 'delivered');
            }).length;

          trendData.labels.push(label);
          trendData.certificates.push(certCount);
          trendData.emails.push(emailCount);
        }

        // Calculate statistics
        const stats = {
          summary: {
            totalCertificates,
            totalBatches: batches.length,
            totalEmailCampaigns: campaigns.length,
            totalEmailsSent,
            deliveryRate
          },
          recentActivity: {
            recentCertificates,
            recentBatches: batches.filter(b => new Date(b.created_at || Date.now()) >= sevenDaysAgo).length,
            recentCampaigns: campaigns.filter(c => new Date(c.created_at || Date.now()) >= sevenDaysAgo).length
          },
          participants: {
            total: participants.length,
            byBatch: {}
          },
          batches: {
            total: batches.length,
            active: batches.filter(b => b.status !== 'archived').length
          },
          templates: {
            total: templates.length,
            active: templates.filter(t => t.is_active).length
          },
          certificates: {
            total: generations.length,
            generated: generations.filter(g => g.status === 'completed').length,
            failed: generations.filter(g => g.status === 'failed').length
          },
          emails: {
            total: campaigns.length,
            sent: campaigns.filter(c => c.status === 'completed').length,
            pending: campaigns.filter(c => c.status === 'draft' || c.status === 'sending').length
          },
          trendData,
          emailDeliveryStats
        };

        // Count participants by batch
        for (const batch of batches) {
          const batchParticipants = participants.filter(p => p.batch_id === batch.id);
          stats.participants.byBatch[batch.id] = {
            batch_name: batch.batch_name,
            count: batchParticipants.length
          };
        }

        return res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/reports/participants - Participant statistics
    if (urlPath === '/api/reports/participants' && method === 'GET') {
      try {
        const participants = await ParticipantModel.getAll();
        const batches = await BatchModel.getAll();

        const report = {
          total: participants.length,
          byBatch: {},
          byEmail: {},
          timeline: {}
        };

        // Group by batch
        for (const batch of batches) {
          const batchParticipants = participants.filter(p => p.batch_id === batch.id);
          report.byBatch[batch.id] = {
            batch_name: batch.batch_name,
            count: batchParticipants.length,
            created_at: batch.created_at
          };
        }

        // Count by creation date
        for (const p of participants) {
          const dateStr = p.created_at || new Date().toISOString();
          const date = typeof dateStr === 'string' ? dateStr.split('T')[0] : new Date(dateStr).toISOString().split('T')[0];
          report.timeline[date] = (report.timeline[date] || 0) + 1;
        }

        return res.json({
          success: true,
          data: report
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/reports/templates - Template statistics
    if (urlPath === '/api/reports/templates' && method === 'GET') {
      try {
        const templates = await TemplateModel.getAll();
        const generations = await CertificateGenerationModel.getAll?.() || [];

        const report = {
          total: templates.length,
          active: templates.filter(t => t.is_active).length,
          byTemplate: {}
        };

        // Count usage by template
        for (const template of templates) {
          const templateGenerations = generations.filter(g => g.template_id === template.id);
          report.byTemplate[template.id] = {
            template_name: template.template_name,
            file_type: template.file_type,
            usage_count: templateGenerations.length,
            certificates_generated: templateGenerations.reduce((sum, g) => sum + (g.certificate_count || 0), 0),
            uploaded_at: template.uploaded_at
          };
        }

        return res.json({
          success: true,
          data: report
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/reports/certificates - Certificate generation statistics
    if (urlPath === '/api/reports/certificates' && method === 'GET') {
      try {
        const generations = await CertificateGenerationModel.getAll?.() || [];
        const batches = await BatchModel.getAll();

        const report = {
          total: generations.length,
          completed: generations.filter(g => g.status === 'completed').length,
          failed: generations.filter(g => g.status === 'failed').length,
          pending: generations.filter(g => g.status === 'pending').length,
          byBatch: {},
          categoryBreakdown: {},
          timeline: {}
        };

        // Group by batch and build categoryBreakdown
        for (const batch of batches) {
          const batchGenerations = generations.filter(g => g.batch_id === batch.id);
          const totalCerts = batchGenerations.reduce((sum, g) => sum + (g.certificate_count || 0), 0);
          report.byBatch[batch.id] = {
            batch_name: batch.batch_name,
            generation_count: batchGenerations.length,
            total_certificates: totalCerts,
            completed: batchGenerations.filter(g => g.status === 'completed').length,
            created_at: batch.created_at || new Date().toISOString()
          };

          // Use batch_name as the category for categoryBreakdown
          report.categoryBreakdown[batch.batch_name] = (report.categoryBreakdown[batch.batch_name] || 0) + totalCerts;
        }

        // Timeline
        for (const g of generations) {
          const dateStr = g.generated_at || new Date().toISOString();
          const date = typeof dateStr === 'string' ? dateStr.split('T')[0] : new Date(dateStr).toISOString().split('T')[0];
          report.timeline[date] = (report.timeline[date] || 0) + (g.certificate_count || 0);
        }

        // Pagination
        const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
        const page = parseInt(urlParams.get('page') || '1');
        const limit = parseInt(urlParams.get('limit') || '20');
        const total = Object.keys(report.byBatch).length;
        const totalPages = Math.ceil(total / limit);

        const byBatchEntries = Object.entries(report.byBatch);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedByBatch = Object.fromEntries(byBatchEntries.slice(startIndex, endIndex));

        report.byBatch = paginatedByBatch;
        report.pagination = {
          page,
          limit,
          total,
          totalPages
        };

        return res.json({
          success: true,
          data: report
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/reports/emails - Email campaign statistics
    if (urlPath === '/api/reports/emails' && method === 'GET') {
      try {
        const campaigns = await EmailCampaignModel.getAll?.() || [];
        const logs = await EmailLogModel.getAll?.() || [];
        const batches = await BatchModel.getAll().catch(() => []);

        const report = {
          total_campaigns: campaigns.length,
          total_emails: logs.length,
          by_status: {
            pending: logs.filter(l => l.status === 'pending').length,
            sent: logs.filter(l => l.status === 'sent').length,
            delivered: logs.filter(l => l.status === 'delivered').length,
            failed: logs.filter(l => l.status === 'failed').length,
            bounced: logs.filter(l => l.status === 'bounced').length
          },
          by_campaign: {},
          campaigns: [],
          timeline: {}
        };

        // Group by campaign
        for (const campaign of campaigns) {
          const campaignLogs = logs.filter(l => l.campaign_id === campaign.id);
          
          // Map batch name if available
          let batchName = '-';
          if (campaign.batch_id) {
            const batch = batches.find(b => b.id === campaign.batch_id);
            if (batch) batchName = batch.batch_name;
          }

          report.by_campaign[campaign.id] = {
            subject: campaign.subject,
            status: campaign.status,
            recipient_count: campaign.recipient_count,
            sent_count: campaign.sent_count,
            failed_count: campaign.failed_count,
            created_at: campaign.created_at,
            sent_at: campaign.sent_at,
            batch_name: batchName,
            logs: campaignLogs
          };
        }

        // Flat array of campaigns sorted by creation date for graphs
        report.campaigns = campaigns.map(campaign => {
          const totalRecipients = campaign.recipient_count || 0;
          const sent = campaign.sent_count || 0;
          const failed = campaign.failed_count || 0;
          const delivered = Math.max(0, sent - failed);
          const deliveryRate = totalRecipients > 0 ? Math.round((delivered / totalRecipients) * 100) : 0;
          
          let batchName = '-';
          if (campaign.batch_id) {
            const batch = batches.find(b => b.id === campaign.batch_id);
            if (batch) batchName = batch.batch_name;
          }

          return {
            id: campaign.id,
            subject: campaign.subject || '(No subject)',
            batchName,
            totalRecipients,
            emailsSent: sent,
            emailsDelivered: delivered,
            emailsFailed: failed,
            deliveryRate,
            status: campaign.status || 'unknown',
            createdAt: campaign.created_at || new Date().toISOString()
          };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Timeline
        for (const log of logs) {
          const dateStr = log.created_at || new Date().toISOString();
          const date = typeof dateStr === 'string' ? dateStr.split('T')[0] : new Date(dateStr).toISOString().split('T')[0];
          report.timeline[date] = (report.timeline[date] || 0) + 1;
        }

        // Pagination for by_campaign
        const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
        const page = parseInt(urlParams.get('page') || '1');
        const limit = parseInt(urlParams.get('limit') || '20');
        const total = Object.keys(report.by_campaign).length;
        const totalPages = Math.ceil(total / limit);

        const byCampaignEntries = Object.entries(report.by_campaign);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedByCampaign = Object.fromEntries(byCampaignEntries.slice(startIndex, endIndex));

        report.by_campaign = paginatedByCampaign;
        report.pagination = {
          page,
          limit,
          total,
          totalPages
        };

        return res.json({
          success: true,
          data: report
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/reports/batches - Batch history
    if (urlPath === '/api/reports/batches' && method === 'GET') {
      try {
        const batches = await BatchModel.getAll();
        const participants = await ParticipantModel.getAll();
        const generations = await CertificateGenerationModel.getAll?.() || [];

        const report = batches.map(batch => {
          const batchParticipants = participants.filter(p => p.batch_id === batch.id);
          const batchGenerations = generations.filter(g => g.batch_id === batch.id);

          return {
            ...batch,
            participant_count: batchParticipants.length,
            generation_count: batchGenerations.length,
            certificates_generated: batchGenerations.reduce((sum, g) => sum + (g.certificate_count || 0), 0)
          };
        });

        return res.json({
          success: true,
          data: report,
          count: report.length
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: { message: 'Endpoint not found' }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
}

module.exports = handler;
