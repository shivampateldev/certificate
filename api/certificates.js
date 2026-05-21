/**
 * Certificates API
 * Handles certificate generation, preview, and download
 */

const {
  CertificateGenerationModel,
  GeneratedCertificateModel,
  TemplateModel,
  TemplateFieldModel,
  ParticipantModel,
  BatchModel
} = require('./models');
const FileHandler = require('./utils/fileHandler');

module.exports.config = { api: { bodyParser: false } };

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlPath = req.url.split('?')[0];
  const { method } = req;

  try {
    // POST /api/certificates/preview - Preview certificate for participant
    if (urlPath === '/api/certificates/preview' && method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { template_id, participant_id } = JSON.parse(body);

          if (!template_id || !participant_id) {
            return res.status(400).json({
              success: false,
              error: { message: 'template_id and participant_id are required' }
            });
          }

          // Get template and fields
          const template = await TemplateModel.getById(template_id);
          if (!template) {
            return res.status(404).json({
              success: false,
              error: { message: 'Template not found' }
            });
          }

          const fields = await TemplateFieldModel.getByTemplateId(template_id);

          // Get participant
          const participant = await ParticipantModel.getById(participant_id);
          if (!participant) {
            return res.status(404).json({
              success: false,
              error: { message: 'Participant not found' }
            });
          }

          // Prepare field data for rendering
          const fieldData = {};
          for (const field of fields) {
            const fieldName = field.field_name.toLowerCase();
            
            if (fieldName === 'name') {
              fieldData[field.id] = participant.name;
            } else if (fieldName === 'email') {
              fieldData[field.id] = participant.email;
            } else if (fieldName === 'certificate_id') {
              fieldData[field.id] = participant.certificate_id;
            } else if (participant.custom_fields && participant.custom_fields[fieldName]) {
              fieldData[field.id] = participant.custom_fields[fieldName];
            } else {
              fieldData[field.id] = '';
            }
          }

          return res.json({
            success: true,
            data: {
              template,
              fields,
              participant,
              fieldData
            }
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: { message: error.message }
          });
        }
      });
      return;
    }

    // POST /api/certificates/generate - Generate certificates for batch
    if (urlPath === '/api/certificates/generate' && method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { template_id, batch_id } = JSON.parse(body);

          if (!template_id || !batch_id) {
            return res.status(400).json({
              success: false,
              error: { message: 'template_id and batch_id are required' }
            });
          }

          // Verify template exists
          const template = await TemplateModel.getById(template_id);
          if (!template) {
            return res.status(404).json({
              success: false,
              error: { message: 'Template not found' }
            });
          }

          // Get participants in batch
          const participants = await ParticipantModel.getByBatchId(batch_id);
          if (participants.length === 0) {
            return res.status(400).json({
              success: false,
              error: { message: 'No participants in batch' }
            });
          }

          // Create generation record
          const generation = await CertificateGenerationModel.create({
            template_id,
            batch_id,
            certificate_count: participants.length
          });

          // Get template fields
          const fields = await TemplateFieldModel.getByTemplateId(template_id);

          // Generate certificates (in real implementation, this would be async)
          const results = [];
          for (const participant of participants) {
            try {
              // Prepare field data
              const fieldData = {};
              for (const field of fields) {
                const fieldName = field.field_name.toLowerCase();
                
                if (fieldName === 'name') {
                  fieldData[field.id] = participant.name;
                } else if (fieldName === 'email') {
                  fieldData[field.id] = participant.email;
                } else if (fieldName === 'certificate_id') {
                  fieldData[field.id] = participant.certificate_id;
                } else if (participant.custom_fields && participant.custom_fields[fieldName]) {
                  fieldData[field.id] = participant.custom_fields[fieldName];
                } else {
                  fieldData[field.id] = '';
                }
              }

              // Create certificate record
              const fileName = `${participant.certificate_id}_${Date.now()}.pdf`;
              const filePath = FileHandler.getStoragePath('certificates') + '/' + fileName;

              const cert = await GeneratedCertificateModel.create({
                generation_id: generation.id,
                participant_id: participant.id,
                template_id,
                file_path: filePath,
                file_name: fileName
              });

              results.push({
                participant_id: participant.id,
                certificate_id: cert.id,
                status: 'generated',
                file_name: fileName
              });
            } catch (error) {
              results.push({
                participant_id: participant.id,
                status: 'failed',
                error: error.message
              });
            }
          }

          // Update generation status
          const successCount = results.filter(r => r.status === 'generated').length;
          await CertificateGenerationModel.update(generation.id, {
            status: successCount === participants.length ? 'completed' : 'completed',
            completed_at: new Date().toISOString()
          });

          return res.json({
            success: true,
            data: {
              generation,
              results,
              summary: {
                total: participants.length,
                generated: successCount,
                failed: results.length - successCount
              }
            }
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: { message: error.message }
          });
        }
      });
      return;
    }

    // GET /api/certificates/generation/:generationId - Get generation details
    const generationMatch = urlPath.match(/^\/api\/certificates\/generation\/([^/]+)$/);
    if (generationMatch && method === 'GET') {
      try {
        const generation = await CertificateGenerationModel.getById(generationMatch[1]);
        if (!generation) {
          return res.status(404).json({
            success: false,
            error: { message: 'Generation not found' }
          });
        }

        const certificates = await GeneratedCertificateModel.getByGenerationId(generation.id);

        return res.json({
          success: true,
          data: {
            generation,
            certificates,
            count: certificates.length
          }
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/certificates/event-categories - Get event categories
    if (urlPath === '/api/certificates/event-categories' && method === 'GET') {
      try {
        const categories = [
          { id: '1', name: 'Graduation', value: 'graduation' },
          { id: '2', name: 'Certification', value: 'certification' },
          { id: '3', name: 'Achievement', value: 'achievement' },
          { id: '4', name: 'Participation', value: 'participation' },
          { id: '5', name: 'Completion', value: 'completion' },
          { id: '6', name: 'Award', value: 'award' },
          { id: '7', name: 'Training', value: 'training' },
          { id: '8', name: 'Workshop', value: 'workshop' }
        ];
        return res.json({
          success: true,
          data: categories,
          count: categories.length
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/certificates/batch/:batchId - Get all generations for batch
    const batchMatch = urlPath.match(/^\/api\/certificates\/batch\/([^/]+)$/);
    if (batchMatch && method === 'GET') {
      try {
        const generations = await CertificateGenerationModel.getByBatchId(batchMatch[1]);
        return res.json({
          success: true,
          data: generations,
          count: generations.length
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/certificates/download/:certificateId - Download certificate
    const downloadMatch = urlPath.match(/^\/api\/certificates\/download\/([^/]+)$/);
    if (downloadMatch && method === 'GET') {
      try {
        const cert = await GeneratedCertificateModel.getByGenerationId(downloadMatch[1]);
        if (!cert || cert.length === 0) {
          return res.status(404).json({
            success: false,
            error: { message: 'Certificate not found' }
          });
        }

        // In real implementation, would serve the actual file
        return res.json({
          success: true,
          data: {
            message: 'Certificate download would be served here',
            certificate: cert[0]
          }
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
