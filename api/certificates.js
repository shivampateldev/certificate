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

// Helper to get request body (compat with Express and Serverless)
async function getRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return req.body;
    }
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

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
      try {
        const body = await getRequestBody(req);
        const { template_id, participant_id } = body;

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
    }

    // POST /api/certificates/generate - Generate certificates in background
    if (urlPath === '/api/certificates/generate' && method === 'POST') {
      try {
        const body = await getRequestBody(req);
        const { template_id, participants, id_pattern, generate_ids } = body;

        if (!template_id || !participants || !Array.isArray(participants)) {
          return res.status(400).json({
            success: false,
            error: { message: 'template_id and participants array are required' }
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

        const fields = await TemplateFieldModel.getByTemplateId(template_id);

        // Create background generation record
        const generation = await CertificateGenerationModel.create({
          template_id,
          batch_id: 'batch_' + Date.now(),
          certificate_count: participants.length,
          completed_count: 0,
          status: 'processing'
        });

        // Respond immediately to prevent UI blocking
        res.json({
          success: true,
          data: {
            jobId: generation.id,
            total: participants.length,
            status: 'processing'
          }
        });

        // Spawn async worker loop
        const { generateCustomCertificateId } = require('../server/services/idGenerationService');
        const FileHandler = require('./utils/fileHandler');
        const fs = require('fs');
        const path = require('path');
        const { PDFDocument, rgb } = require('pdf-lib');

        const processBatchAsync = async () => {
          const results = [];
          const outputDir = FileHandler.getStoragePath('certificates') || 'uploads/certificates';
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          for (let i = 0; i < participants.length; i++) {
            const row = participants[i];
            const name = row.Name || row.name || '';
            const email = row.Email || row.email || '';
            
            let certId = row.Certificate_ID || row.certificate_id || row['Certificate ID'];
            if (generate_ids || !certId) {
              certId = generateCustomCertificateId(id_pattern, name, row) || `CERT-${Date.now()}-${i}`;
            }

            try {
              const fileName = `${certId}.pdf`;
              const filePath = path.join(outputDir, fileName);

              // Read template file
              const existingPdfBytes = fs.readFileSync(template.file_path);
              const pdfDoc = await PDFDocument.load(existingPdfBytes);
              const pages = pdfDoc.getPages();
              const firstPage = pages[0];

              // Dynamic background fields drawing
              for (const field of fields) {
                const fieldName = (field.field_name || '').toLowerCase();
                let text = '';
                if (fieldName === 'name') text = name;
                else if (fieldName === 'email') text = email;
                else if (fieldName === 'certificate_id') text = certId;
                else if (row[field.field_name]) text = String(row[field.field_name]);
                else if (row[fieldName]) text = String(row[fieldName]);

                if (text) {
                  // Embed appropriate font
                  let pdfFont;
                  try {
                    const { getCustomFonts } = require('../server/utils/fontLoader');
                    const customFonts = getCustomFonts();
                    const matchedFont = customFonts.find(f => f.name.toLowerCase() === (field.font_family || '').toLowerCase());
                    if (matchedFont) {
                      pdfFont = await pdfDoc.embedFont(fs.readFileSync(matchedFont.path));
                    } else {
                      pdfFont = await pdfDoc.embedFont('Helvetica');
                    }
                  } catch (fontErr) {
                    pdfFont = await pdfDoc.embedFont('Helvetica');
                  }

                  // Convert colors hex -> rgb
                  let r = 0, g = 0, b = 0;
                  if (field.color && field.color.startsWith('#')) {
                    const hex = field.color.substring(1);
                    r = parseInt(hex.substring(0, 2), 16) || 0;
                    g = parseInt(hex.substring(2, 4), 16) || 0;
                    b = parseInt(hex.substring(4, 6), 16) || 0;
                  }

                  firstPage.drawText(text, {
                    x: field.x,
                    y: field.y,
                    size: field.font_size || 24,
                    font: pdfFont,
                    color: rgb(r / 255, g / 255, b / 255)
                  });
                }
              }

              const pdfBytes = await pdfDoc.save();
              fs.writeFileSync(filePath, pdfBytes);

              // Save generated certificate record
              await GeneratedCertificateModel.create({
                generation_id: generation.id,
                participant_id: 'part_' + i,
                template_id: template.id,
                file_path: filePath,
                file_name: fileName,
                status: 'generated',
                recipient_name: name,
                recipient_email: email,
                certificate_id: certId
              });

              results.push({ name, email, certificateId: certId, status: 'success' });
            } catch (err) {
              console.error(`Failed to generate for row ${i}:`, err.message);
              results.push({ name, email, certificateId: certId, status: 'failed', error: err.message });
            }

            // Update progress
            await CertificateGenerationModel.update(generation.id, {
              certificate_count: participants.length,
              completed_count: i + 1,
              status: (i + 1) === participants.length ? 'completed' : 'processing',
              completed_at: (i + 1) === participants.length ? new Date().toISOString() : null
            });

            // Yield execution in chunks of 5
            if (i % 5 === 0) {
              await new Promise(r => setTimeout(r, 10));
            }
          }
        };

        // Trigger worker loop
        processBatchAsync().catch(err => {
          console.error('Async queue processing failed:', err.message);
          CertificateGenerationModel.update(generation.id, { status: 'failed', error_message: err.message });
        });

      } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    }

    // GET /api/certificates/download/zip/:jobId - Download ZIP
    const zipMatch = urlPath.match(/^\/api\/certificates\/download\/zip\/([^/]+)$/);
    if (zipMatch && method === 'GET') {
      try {
        const jobId = zipMatch[1];
        const certificates = await GeneratedCertificateModel.getByGenerationId(jobId);

        if (certificates.length === 0) {
          return res.status(404).json({ success: false, error: { message: 'No certificates found for this job' } });
        }

        const JSZip = require('jszip');
        const zip = new JSZip();
        const fs = require('fs');

        for (const cert of certificates) {
          if (fs.existsSync(cert.file_path)) {
            const fileData = fs.readFileSync(cert.file_path);
            zip.file(`${cert.certificate_id}.pdf`, fileData);
          }
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=certificates_${jobId}.zip`);
        return res.end(zipBuffer);
      } catch (error) {
        return res.status(500).json({ success: false, error: { message: error.message } });
      }
    }

    // GET /api/certificates/export/:jobId - Export enriched dataset
    const exportMatch = urlPath.match(/^\/api\/certificates\/export\/([^/]+)$/);
    if (exportMatch && method === 'GET') {
      try {
        const jobId = exportMatch[1];
        const certificates = await GeneratedCertificateModel.getByGenerationId(jobId);

        if (certificates.length === 0) {
          return res.status(404).json({ success: false, error: { message: 'No certificates found for this job' } });
        }

        const serverUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
        const headers = ['Sr_no', 'Name', 'Email', 'Certificate_ID', 'Certificate_Link'];
        const rows = [headers.join(',')];

        certificates.forEach((c, idx) => {
          const downloadUrl = `${serverUrl}/api/certificates/download/${c.certificate_id}`;
          rows.push([
            idx + 1,
            `"${(c.recipient_name || '').replace(/"/g, '""')}"`,
            `"${(c.recipient_email || '').replace(/"/g, '""')}"`,
            `"${(c.certificate_id || '').replace(/"/g, '""')}"`,
            `"${downloadUrl}"`
          ].join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=enriched_dataset_${jobId}.csv`);
        return res.end(rows.join('\n'));
      } catch (error) {
        return res.status(500).json({ success: false, error: { message: error.message } });
      }
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
        const certId = downloadMatch[1];
        let cert = await GeneratedCertificateModel.getByCertificateId(certId);
        
        // Fallback to get by ID if needed
        if (!cert) {
          const list = await GeneratedCertificateModel.getByGenerationId(certId);
          if (list && list.length > 0) cert = list[0];
        }

        if (!cert) {
          return res.status(404).json({
            success: false,
            error: { message: 'Certificate record not found' }
          });
        }

        const fs = require('fs');
        if (!fs.existsSync(cert.file_path)) {
          return res.status(404).json({
            success: false,
            error: { message: `Physical certificate file not found on disk: ${cert.file_path}` }
          });
        }

        const fileStream = fs.createReadStream(cert.file_path);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${cert.file_name || certId + '.pdf'}"`);
        return fileStream.pipe(res);
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
