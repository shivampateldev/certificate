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
        const totalEmailsSent = logs.filter(l => l.status === 'sent' || l.status === 'delivered').length;
        const totalEmailsDelivered = logs.filter(l => l.status === 'delivered').length;
        const deliveryRate = totalEmailsSent > 0 ? Math.round((totalEmailsDelivered / totalEmailsSent) * 100) : 0;

        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentGenerations = generations.filter(g => new Date(g.generated_at) >= sevenDaysAgo);
        const recentCertificates = recentGenerations.reduce((sum, g) => sum + (g.certificate_count || 0), 0);

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
            recentBatches: batches.filter(b => new Date(b.created_at) >= sevenDaysAgo).length,
            recentCampaigns: campaigns.filter(c => new Date(c.created_at) >= sevenDaysAgo).length
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
          }
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
          timeline: {}
        };

        // Group by batch
        for (const batch of batches) {
          const batchGenerations = generations.filter(g => g.batch_id === batch.id);
          const totalCerts = batchGenerations.reduce((sum, g) => sum + (g.certificate_count || 0), 0);
          report.byBatch[batch.id] = {
            batch_name: batch.batch_name,
            generation_count: batchGenerations.length,
            total_certificates: totalCerts,
            completed: batchGenerations.filter(g => g.status === 'completed').length
          };
        }

        // Timeline
        for (const g of generations) {
          const dateStr = g.generated_at || new Date().toISOString();
          const date = typeof dateStr === 'string' ? dateStr.split('T')[0] : new Date(dateStr).toISOString().split('T')[0];
          report.timeline[date] = (report.timeline[date] || 0) + (g.certificate_count || 0);
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

    // GET /api/reports/emails - Email campaign statistics
    if (urlPath === '/api/reports/emails' && method === 'GET') {
      try {
        const campaigns = await EmailCampaignModel.getAll?.() || [];
        const logs = await EmailLogModel.getAll?.() || [];

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
          timeline: {}
        };

        // Group by campaign
        for (const campaign of campaigns) {
          const campaignLogs = logs.filter(l => l.campaign_id === campaign.id);
          report.by_campaign[campaign.id] = {
            subject: campaign.subject,
            status: campaign.status,
            recipient_count: campaign.recipient_count,
            sent_count: campaign.sent_count,
            failed_count: campaign.failed_count,
            created_at: campaign.created_at,
            sent_at: campaign.sent_at,
            logs: campaignLogs
          };
        }

        // Timeline
        for (const log of logs) {
          const dateStr = log.created_at || new Date().toISOString();
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
