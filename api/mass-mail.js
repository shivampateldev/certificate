/**
 * Mass Mail API
 * Handles email campaign creation, preview, and sending
 */

const {
  EmailCampaignModel,
  EmailLogModel,
  ParticipantModel,
  GeneratedCertificateModel,
  CertificateGenerationModel,
  TemplateModel,
  TemplateFieldModel
} = require('./models');
const Validators = require('./utils/validators');

module.exports.config = { api: { bodyParser: false } };

// Initialize nodemailer transporter
let transporter = null;

function initializeTransporter() {
  try {
    const nodemailer = require('nodemailer');
    
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // Only create transporter if SMTP credentials are provided
    if (smtpConfig.auth.user && smtpConfig.auth.pass) {
      transporter = nodemailer.createTransport(smtpConfig);
      console.log('SMTP transporter initialized');
    } else {
      console.warn('SMTP credentials not configured. Email sending will fail.');
    }
  } catch (error) {
    console.error('Failed to initialize transporter:', error.message);
  }
}

// Initialize on module load
initializeTransporter();

// Helper to get appropriate embedded font based on family and style
async function getEmbeddedFont(pdfDoc, fontFamily, bold, italic) {
  try {
    const fontMap = {
      'Arial': 'Helvetica',
      'Helvetica': 'Helvetica',
      'Times New Roman': 'Times-Roman',
      'Georgia': 'Times-Roman',
      'Verdana': 'Helvetica',
      'Trebuchet MS': 'Helvetica',
      'Impact': 'Helvetica-Bold',
      'Comic Sans MS': 'Helvetica'
    };
    
    const baseFontName = fontMap[fontFamily] || 'Helvetica';
    
    if (fontFamily === 'Impact') {
      return await pdfDoc.embedFont('Helvetica-Bold');
    }
    
    let fontName = baseFontName;
    if (baseFontName === 'Times-Roman') {
      if (bold && italic) {
        fontName = 'Times-BoldItalic';
      } else if (bold) {
        fontName = 'Times-Bold';
      } else if (italic) {
        fontName = 'Times-Italic';
      }
    } else {
      if (bold && italic) {
        fontName = 'Helvetica-BoldOblique';
      } else if (bold) {
        fontName = 'Helvetica-Bold';
      } else if (italic) {
        fontName = 'Helvetica-Oblique';
      }
    }
    
    return await pdfDoc.embedFont(fontName);
  } catch (error) {
    console.warn(`Font embedding failed for ${fontFamily}, using Helvetica:`, error.message);
    return await pdfDoc.embedFont('Helvetica');
  }
}

// Helper to convert hex to rgb
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Generate certificate PDF dynamically using a template and recipient data
async function generateCertificateFromTemplate(template, fields, recipient) {
  const { PDFDocument, rgb } = require('pdf-lib');
  const FileHandler = require('./utils/fileHandler');
  const fs = require('fs');

  if (!template.file_path || !FileHandler.fileExists(template.file_path)) {
    throw new Error(`Template background file not found at: ${template.file_path}`);
  }

  const existingPdfBytes = fs.readFileSync(template.file_path);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width: pageWidth, height: pageHeight } = firstPage.getSize();

  const canvasWidth = template.width || 800;
  const canvasHeight = template.height || 600;
  const scaleX = pageWidth / canvasWidth;
  const scaleY = pageHeight / canvasHeight;

  for (const field of fields) {
    const fieldName = field.field_name.toLowerCase();
    let text = '';

    if (fieldName === 'name') {
      text = recipient.name || '';
    } else if (fieldName === 'email') {
      text = recipient.email || '';
    } else if (fieldName === 'certificate_id' || fieldName === 'certificateid') {
      text = recipient.certificate_id || recipient.certificateId || '';
    } else if (recipient[field.field_name]) {
      text = recipient[field.field_name];
    } else {
      text = field.field_name
        .replace(/\{\{name\}\}/gi, recipient.name || '')
        .replace(/\{\{email\}\}/gi, recipient.email || '')
        .replace(/\{\{certificate_id\}\}/gi, recipient.certificate_id || recipient.certificateId || '')
        .replace(/\{\{certificateid\}\}/gi, recipient.certificate_id || recipient.certificateId || '');
    }

    if (!text) continue;

    const bold = field.font_weight === 'bold';
    const italic = field.font_style === 'italic' || field.font_weight === 'italic';
    
    const font = await getEmbeddedFont(pdfDoc, field.font_family || 'Arial', bold, italic);
    const fontSize = (field.font_size || 24) * Math.min(scaleX, scaleY);
    const colorRgb = hexToRgb(field.color || '#000000');
    
    let drawX = field.x * scaleX;
    
    if (field.alignment === 'center') {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const fieldWidth = (field.width || 200) * scaleX;
      drawX = (field.x * scaleX) + (fieldWidth - textWidth) / 2;
    } else if (field.alignment === 'right') {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const fieldWidth = (field.width || 200) * scaleX;
      drawX = (field.x * scaleX) + fieldWidth - textWidth;
    }

    const drawY = pageHeight - (field.y * scaleY);

    firstPage.drawText(text, {
      x: drawX,
      y: drawY,
      size: fontSize,
      font: font,
      color: rgb(colorRgb.r / 255, colorRgb.g / 255, colorRgb.b / 255)
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Send a raw RFC 2822 email via Gmail REST API using an OAuth2 access token.
 * More reliable than nodemailer OAuth2 transport with short-lived Firebase tokens.
 * @param {string} accessToken - Google OAuth2 access token with gmail.send scope
 * @param {string} encodedEmail - Base64url-encoded raw email
 * @returns {Promise<object>} Gmail API response (contains .id on success, .error on failure)
 */
function callGmailAPI(accessToken, encodedEmail) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ raw: encodedEmail });
    const options = {
      hostname: 'gmail.googleapis.com',
      port: 443,
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const https = require('https');
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: { message: 'Invalid Gmail API response: ' + data } });
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error('Gmail API request failed: ' + err.message));
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Gmail API request timed out after 30s'));
    });

    req.write(body);
    req.end();
  });
}

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
  const queryParams = new URLSearchParams(req.url.split('?')[1] || '');
  const action = queryParams.get('action');
  const { method } = req;

  try {
    // POST /api/mass-mail/preview - Preview email for participant
    if (urlPath === '/api/mass-mail/preview' && method === 'POST') {
      try {
        const body = await getRequestBody(req);
        const { participant_id, subject, body: emailBody } = body;

        if (!participant_id) {
          return res.status(400).json({
            success: false,
            error: { message: 'participant_id is required' }
          });
        }

        // Get participant
        const participant = await ParticipantModel.getById(participant_id);
        if (!participant) {
          return res.status(404).json({
            success: false,
            error: { message: 'Participant not found' }
          });
        }

        // Replace template variables
        const replacements = {
          '{{name}}': participant.name,
          '{{email}}': participant.email,
          '{{certificate_id}}': participant.certificate_id,
          ...Object.entries(participant.custom_fields || {}).reduce((acc, [key, val]) => {
            acc[`{{${key}}}`] = val;
            return acc;
          }, {})
        };

        let renderedSubject = subject;
        let renderedBody = emailBody;

        for (const [placeholder, value] of Object.entries(replacements)) {
          renderedSubject = renderedSubject.replace(new RegExp(placeholder, 'g'), value || '');
          renderedBody = renderedBody.replace(new RegExp(placeholder, 'g'), value || '');
        }

        return res.json({
          success: true,
          data: {
            participant,
            preview: {
              subject: renderedSubject,
              body: renderedBody,
              to: participant.email
            }
          }
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // POST /api/mass-mail/campaign - Create email campaign
    if (urlPath === '/api/mass-mail/campaign' && method === 'POST') {
      try {
        const body = await getRequestBody(req);
        const { batch_id, generation_id, subject, body: emailBody, sender_email } = body;

        if (!batch_id || !subject || !emailBody || !sender_email) {
          return res.status(400).json({
            success: false,
            error: { message: 'batch_id, subject, body, and sender_email are required' }
          });
        }

        // Validate email
        if (!Validators.isValidEmail(sender_email)) {
          return res.status(400).json({
            success: false,
            error: { message: 'Invalid sender email' }
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

        // Create campaign
        const campaign = await EmailCampaignModel.create({
          batch_id,
          generation_id,
          subject,
          body: emailBody,
          sender_email,
          recipient_count: participants.length
        });

        // Create email logs for each participant
        for (const participant of participants) {
          await EmailLogModel.create({
            campaign_id: campaign.id,
            participant_id: participant.id,
            recipient_email: participant.email,
            status: 'pending'
          });
        }

        return res.status(201).json({
          success: true,
          data: {
            campaign,
            recipient_count: participants.length
          }
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/mass-mail/campaign/:campaignId - Get campaign details
    const campaignMatch = urlPath.match(/^\/api\/mass-mail\/campaign\/([^/]+)$/);
    if (campaignMatch && method === 'GET') {
      try {
        const campaign = await EmailCampaignModel.getById(campaignMatch[1]);
        if (!campaign) {
          return res.status(404).json({
            success: false,
            error: { message: 'Campaign not found' }
          });
        }

        const logs = await EmailLogModel.getByCampaignId(campaign.id);

        return res.json({
          success: true,
          data: {
            campaign,
            logs,
            summary: {
              total: logs.length,
              pending: logs.filter(l => l.status === 'pending').length,
              sent: logs.filter(l => l.status === 'sent').length,
              delivered: logs.filter(l => l.status === 'delivered').length,
              failed: logs.filter(l => l.status === 'failed').length
            }
          }
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // POST /api/mass-mail?action=send - MassMailer UI: multipart ZIP + CSV direct send
    if (urlPath === '/api/mass-mail' && action === 'send' && method === 'POST') {
      return new Promise((resolve) => {
        const Busboy = require('busboy');
        const busboy = Busboy({ headers: req.headers });

        let zipBuffer = null;
        let csvBuffer = null;
        let csvFileName = 'recipients.csv';
        let emailSubject = '';
        let emailBody = '';
        let senderDisplayName = '';
        let accessToken = '';
        let senderEmail = '';
        let templateId = '';

        busboy.on('field', (fieldname, val) => {
          if (fieldname === 'subject') emailSubject = val;
          if (fieldname === 'body') emailBody = val;
          if (fieldname === 'senderDisplayName') senderDisplayName = val;
          if (fieldname === 'accessToken') accessToken = val;
          if (fieldname === 'senderEmail') senderEmail = val;
          if (fieldname === 'templateId') templateId = val;
        });

        let activeStreams = 0;
        let busboyFinished = false;

        function checkAndProcess() {
          if (activeStreams === 0 && busboyFinished) {
            processUploads();
          }
        }

        const customAttachments = [];
        busboy.on('file', (fieldname, file, info) => {
          activeStreams++;
          const chunks = [];
          file.on('data', d => chunks.push(d));
          file.on('end', () => {
            if (fieldname === 'zipfile') zipBuffer = Buffer.concat(chunks);
            else if (fieldname === 'csvfile') {
              csvBuffer = Buffer.concat(chunks);
              csvFileName = info.filename || 'recipients.csv';
            } else if (fieldname === 'custom_attachments' || fieldname === 'custom_attachment' || fieldname.startsWith('custom_attachment_')) {
              customAttachments.push({
                filename: info.filename,
                content: Buffer.concat(chunks)
              });
            }
            activeStreams--;
            checkAndProcess();
          });
        });

        busboy.on('finish', () => {
          busboyFinished = true;
          checkAndProcess();
        });

        async function processUploads() {
          try {
            if (!csvBuffer) {
              console.error('Error in mass-mail ?action=send: CSV recipient file is missing');
              res.status(400).json({ success: false, error: { message: 'CSV/Excel recipient file is required' } });
              resolve();
              return;
            }

            // Parse CSV / Excel recipient list
            const CSVParser = require('./utils/csvParser');
            const ext = (csvFileName.split('.').pop() || 'csv').toLowerCase();
            let rawData;
            try {
              rawData = ext === 'csv'
                ? await CSVParser.parseCSV(csvBuffer)
                : await CSVParser.parseExcel(csvBuffer);
            } catch (parseErr) {
              console.error('Error parsing recipient file:', parseErr);
              res.status(400).json({ success: false, error: { message: 'Failed to parse recipient file: ' + parseErr.message } });
              resolve();
              return;
            }

            const normalized = CSVParser.normalizeParticipants(rawData);
            const recipients = normalized.participants || [];

            if (recipients.length === 0) {
              console.error('Error: No valid recipients found in uploaded file');
              res.status(400).json({ success: false, error: { message: 'No valid recipients found in uploaded file' } });
              resolve();
              return;
            }

            // Optional ZIP file parsing for attachments
            let zipEntries = [];
            if (zipBuffer) {
              try {
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(zipBuffer);
                zipEntries = zip.getEntries();
                console.log(`Successfully parsed ZIP file: found ${zipEntries.length} entries`);
              } catch (zipErr) {
                console.error('Error parsing ZIP file:', zipErr);
              }
            }

            // Load template and fields if templateId is provided
            let template = null;
            let fields = [];
            if (templateId) {
              try {
                template = await TemplateModel.getById(templateId);
                if (template) {
                  fields = await TemplateFieldModel.getByTemplateId(templateId);
                  console.log(`Successfully loaded template "${template.template_name}" with ${fields.length} fields for mass mailing`);
                } else {
                  console.warn(`Template with ID "${templateId}" was not found.`);
                }
              } catch (err) {
                console.error(`Failed to load template "${templateId}":`, err.message);
              }
            }

            // Create overall EmailCampaign record in Firestore
            const campaign = await EmailCampaignModel.create({
              batch_id: 'upload_' + Date.now(),
              generation_id: null,
              subject: emailSubject,
              body: emailBody,
              sender_email: senderEmail || 'demo@ificatemanagement.com',
              recipient_count: recipients.length
            });

            await EmailCampaignModel.update(campaign.id, {
              status: 'sending'
            });

            const isDemoMode = !accessToken || accessToken === 'demo_token';
            let sentCount = 0;
            let failedCount = 0;
            const results = [];

            if (isDemoMode) {
              // Simulate sending — no real emails dispatched
              for (const recipient of recipients) {
                sentCount++;
                results.push({
                  email: recipient.email || '(unknown)',
                  name: recipient.name || '',
                  status: 'simulated',
                  message: 'Demo mode: email not actually sent'
                });

                // Create or fetch Participant record
                let participantObj = await ParticipantModel.getByEmail(recipient.email);
                const certId = recipient.certificate_id || recipient.certificateId || `CERT-${Date.now()}`;
                if (!participantObj) {
                  participantObj = await ParticipantModel.create({
                    name: recipient.name,
                    email: recipient.email,
                    certificate_id: certId
                  });
                }

                // If template mode, generate simulated certificate
                if (template && fields.length > 0) {
                  try {
                    const dynamicCertBuffer = await generateCertificateFromTemplate(template, fields, recipient);
                    const FileHandler = require('./utils/fileHandler');
                    const genFileName = `${certId}_${Date.now()}.pdf`;
                    const genFilePath = FileHandler.getStoragePath('certificates') + '/' + genFileName;
                    const fs = require('fs');
                    fs.writeFileSync(genFilePath, dynamicCertBuffer);

                    await GeneratedCertificateModel.create({
                      generation_id: 'mass_gen_' + campaign.id,
                      participant_id: participantObj.id,
                      template_id: template.id,
                      file_path: genFilePath,
                      file_name: genFileName
                    });
                    console.log(`Generated simulated certificate for ${recipient.email}`);
                  } catch (genErr) {
                    console.error('Failed to generate simulated certificate:', genErr);
                  }
                }

                // Log simulated send to database
                await EmailLogModel.create({
                  campaign_id: campaign.id,
                  participant_id: participantObj.id,
                  recipient_email: recipient.email || 'unknown@example.com',
                  status: 'sent',
                  provider_response: 'Simulated send in Demo mode',
                  sent_at: new Date().toISOString()
                });
              }
            } else {
              // Real Gmail send via Gmail REST API
              for (const recipient of recipients) {
                let participantObj = null;
                try {
                  const personalBody = emailBody
                    .replace(/\{Name\}/gi, recipient.name || '')
                    .replace(/\{CertificateID\}/gi, recipient.certificateId || recipient.certificate_id || '');

                  const htmlBody = personalBody.replace(/\n/g, '<br>');
                  const fromStr = senderDisplayName
                    ? `"${senderDisplayName}" <${senderEmail}>`
                    : senderEmail;

                  // Find matching certificate in ZIP or generate dynamically on the fly
                  let attachmentData = null;
                  let attachmentName = null;
                  const certId = recipient.certificate_id || recipient.certificateId || `CERT-${Date.now()}`;

                  if (template && fields.length > 0) {
                    try {
                      attachmentData = await generateCertificateFromTemplate(template, fields, recipient);
                      attachmentName = `${certId}.pdf`;
                      console.log(`Dynamically generated certificate for ${recipient.email}: ${attachmentName}`);

                      // Register the participant if not exists
                      participantObj = await ParticipantModel.getByEmail(recipient.email);
                      if (!participantObj) {
                        participantObj = await ParticipantModel.create({
                          name: recipient.name,
                          email: recipient.email,
                          certificate_id: certId
                        });
                      }

                      // Save the generated certificate file
                      const FileHandler = require('./utils/fileHandler');
                      const genFileName = `${certId}_${Date.now()}.pdf`;
                      const genFilePath = FileHandler.getStoragePath('certificates') + '/' + genFileName;
                      const fs = require('fs');
                      fs.writeFileSync(genFilePath, attachmentData);

                      await GeneratedCertificateModel.create({
                        generation_id: 'mass_gen_' + campaign.id,
                        participant_id: participantObj.id,
                        template_id: template.id,
                        file_path: genFilePath,
                        file_name: genFileName
                      });
                    } catch (genErr) {
                      console.error(`Failed to generate dynamic certificate for ${recipient.email}:`, genErr);
                    }
                  } else if (zipEntries.length > 0) {
                    const matchingEntry = zipEntries.find(entry => {
                      const filename = entry.entryName.split('/').pop();
                      if (!filename) return false;
                      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
                      return nameWithoutExt.toLowerCase() === certId.toString().toLowerCase();
                    });
                    if (matchingEntry) {
                      attachmentData = matchingEntry.getData();
                      attachmentName = matchingEntry.entryName.split('/').pop() || `${certId}.pdf`;
                      console.log(`Found certificate attachment: ${attachmentName} for ${recipient.email}`);
                    } else {
                      console.warn(`No matching certificate in ZIP for ID: ${certId}`);
                      // Fallback: If there is exactly one file in the ZIP, use it as fallback!
                      const pdfEntries = zipEntries.filter(entry => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.pdf'));
                      const fallbackEntry = pdfEntries.length === 1 ? pdfEntries[0] : (zipEntries.filter(entry => !entry.isDirectory).length === 1 ? zipEntries.filter(entry => !entry.isDirectory)[0] : null);
                      if (fallbackEntry) {
                        attachmentData = fallbackEntry.getData();
                        attachmentName = fallbackEntry.entryName.split('/').pop() || 'certificate.pdf';
                        console.log(`Fallback used single ZIP entry: ${attachmentName} for ${recipient.email}`);
                      }
                    }
                  }                  // Build RFC 2822 raw email
                  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  const emailParts = [
                    `From: ${fromStr}`,
                    `To: ${recipient.email}`,
                    `Subject: ${emailSubject}`,
                    'MIME-Version: 1.0',
                    `Content-Type: multipart/mixed; boundary="${boundary}"`,
                    '',
                    `--${boundary}`,
                    'Content-Type: text/html; charset=UTF-8',
                    'Content-Transfer-Encoding: 8bit',
                    '',
                    htmlBody,
                    ''
                  ];

                  // Add certificate attachment if available
                  if (attachmentData && attachmentName) {
                    emailParts.push(
                      `--${boundary}`,
                      `Content-Type: application/pdf; name="${attachmentName}"`,
                      'Content-Transfer-Encoding: base64',
                      `Content-Disposition: attachment; filename="${attachmentName}"`,
                      '',
                      attachmentData.toString('base64'),
                      ''
                    );
                  }

                  // Add custom attachments if uploaded
                  if (customAttachments && customAttachments.length > 0) {
                    for (const att of customAttachments) {
                      const contentType = att.filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
                      emailParts.push(
                        `--${boundary}`,
                        `Content-Type: ${contentType}; name="${att.filename}"`,
                        'Content-Transfer-Encoding: base64',
                        `Content-Disposition: attachment; filename="${att.filename}"`,
                        '',
                        att.content.toString('base64'),
                        ''
                      );
                    }
                  }

                  emailParts.push(`--${boundary}--`);
                  const rawEmail = emailParts.join('\r\n');

                  // Base64url encode (Gmail API requirement)
                  const encodedEmail = Buffer.from(rawEmail)
                    .toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');

                  // Call Gmail REST API
                  const gmailResult = await callGmailAPI(accessToken, encodedEmail);

                  if (gmailResult.error) {
                    throw new Error(gmailResult.error.message || JSON.stringify(gmailResult.error));
                  }

                  // Get or create Participant
                  participantObj = await ParticipantModel.getByEmail(recipient.email);
                  if (!participantObj) {
                    participantObj = await ParticipantModel.create({
                      name: recipient.name,
                      email: recipient.email,
                      certificate_id: recipient.certificate_id || recipient.certificateId || `CERT-${Date.now()}`
                    });
                  }

                  // Create EmailLog as delivered
                  await EmailLogModel.create({
                    campaign_id: campaign.id,
                    participant_id: participantObj.id,
                    recipient_email: recipient.email,
                    status: 'delivered',
                    provider_response: `Gmail Msg ID: ${gmailResult.id}`,
                    sent_at: new Date().toISOString(),
                    delivered_at: new Date().toISOString()
                  });

                  sentCount++;
                  results.push({ email: recipient.email, name: recipient.name, status: 'sent', messageId: gmailResult.id });
                  console.log(`✓ Sent email to ${recipient.email} (Gmail message ID: ${gmailResult.id})`);
                } catch (sendErr) {
                  console.error(`✗ Failed to send to ${recipient.email}:`, sendErr.message);
                  failedCount++;
                  results.push({ email: recipient.email, name: recipient.name, status: 'failed', error: sendErr.message });

                  // Get or create Participant for logging failure
                  try {
                    if (!participantObj) {
                      participantObj = await ParticipantModel.getByEmail(recipient.email);
                    }
                    if (!participantObj) {
                      participantObj = await ParticipantModel.create({
                        name: recipient.name || 'Unknown',
                        email: recipient.email,
                        certificate_id: recipient.certificate_id || recipient.certificateId || `CERT-${Date.now()}`
                      });
                    }
                    await EmailLogModel.create({
                      campaign_id: campaign.id,
                      participant_id: participantObj.id,
                      recipient_email: recipient.email,
                      status: 'failed',
                      error_message: sendErr.message
                    });
                  } catch (logErr) {
                    console.error('Failed to log email send failure in database:', logErr.message);
                  }
                }
              }
            }

            // Update EmailCampaign final status
            await EmailCampaignModel.update(campaign.id, {
              status: 'completed',
              sent_count: sentCount,
              failed_count: failedCount,
              sent_at: new Date().toISOString()
            });

            res.json({
              success: true,
              data: {
                total: recipients.length,
                sent: sentCount,
                failed: failedCount,
                mode: isDemoMode ? 'demo' : 'live',
                results
              }
            });
            resolve();
          } catch (error) {
            console.error('Unhandled exception inside processUploads:', error);
            res.status(500).json({ success: false, error: { message: error.message } });
            resolve();
          }
        }

        busboy.on('error', (err) => {
          console.error('Busboy multipart parsing error:', err);
          res.status(400).json({ success: false, error: { message: 'Multipart parsing error: ' + err.message } });
          resolve();
        });

        req.pipe(busboy);
      });
    }

    // POST /api/mass-mail/send - Campaign-based email send (JSON body with campaign_id)
    if (urlPath === '/api/mass-mail/send' && method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { campaign_id } = JSON.parse(body);

          if (!campaign_id) {
            return res.status(400).json({
              success: false,
              error: { message: 'campaign_id is required' }
            });
          }

          // Check if SMTP is configured
          if (!transporter) {
            // Return success response even without SMTP (for testing)
            return res.json({
              success: true,
              message: 'Email campaign queued for sending (SMTP not configured - test mode)',
              data: {
                campaign_id,
                status: 'queued',
                note: 'Configure SMTP to actually send emails'
              }
            });
          }

          // Get campaign
          const campaign = await EmailCampaignModel.getById(campaign_id);
          if (!campaign) {
            return res.status(404).json({
              success: false,
              error: { message: 'Campaign not found' }
            });
          }

          // Get email logs
          const logs = await EmailLogModel.getByCampaignId(campaign_id);

          // Update campaign status
          await EmailCampaignModel.update(campaign_id, {
            status: 'sending'
          });

          // Send emails using real SMTP
          const results = [];
          let sentCount = 0;
          let failedCount = 0;

          for (const log of logs) {
            try {
              // Get participant for template variable replacement
              const participant = await ParticipantModel.getById(log.participant_id);

              // Replace template variables
              const replacements = {
                '{{name}}': participant.name,
                '{{email}}': participant.email,
                '{{certificate_id}}': participant.certificate_id,
                ...Object.entries(participant.custom_fields || {}).reduce((acc, [key, val]) => {
                  acc[`{{${key}}}`] = val;
                  return acc;
                }, {})
              };

              let subject = campaign.subject;
              let emailBody = campaign.body;

              for (const [placeholder, value] of Object.entries(replacements)) {
                subject = subject.replace(new RegExp(placeholder, 'g'), value || '');
                emailBody = emailBody.replace(new RegExp(placeholder, 'g'), value || '');
              }

              // Send email via SMTP
              try {
                const info = await transporter.sendMail({
                  from: campaign.sender_email,
                  to: log.recipient_email,
                  subject: subject,
                  html: emailBody
                });

                // Only mark as sent if SMTP provider confirms
                await EmailLogModel.update(log.id, {
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                  provider_response: info.response || 'Email sent successfully'
                });
                sentCount++;

                results.push({
                  log_id: log.id,
                  recipient: log.recipient_email,
                  status: 'sent',
                  message: 'Email sent successfully'
                });
              } catch (smtpError) {
                // Mark as failed if SMTP fails
                await EmailLogModel.update(log.id, {
                  status: 'failed',
                  error_message: `SMTP Error: ${smtpError.message}`
                });
                failedCount++;

                results.push({
                  log_id: log.id,
                  recipient: log.recipient_email,
                  status: 'failed',
                  error: `SMTP Error: ${smtpError.message}`
                });
              }
            } catch (error) {
              await EmailLogModel.update(log.id, {
                status: 'failed',
                error_message: error.message
              });
              failedCount++;
              results.push({
                log_id: log.id,
                recipient: log.recipient_email,
                status: 'failed',
                error: error.message
              });
            }
          }

          // Update campaign final status
          await EmailCampaignModel.update(campaign_id, {
            status: 'completed',
            sent_count: sentCount,
            failed_count: failedCount,
            sent_at: new Date().toISOString()
          });

          return res.json({
            success: true,
            data: {
              campaign_id,
              results,
              summary: {
                total: logs.length,
                sent: sentCount,
                failed: failedCount
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

    // GET /api/mass-mail/batch/:batchId - Get campaigns for batch
    const batchMatch = urlPath.match(/^\/api\/mass-mail\/batch\/([^/]+)$/);
    if (batchMatch && method === 'GET') {
      try {
        const campaigns = await EmailCampaignModel.getByBatchId(batchMatch[1]);
        return res.json({
          success: true,
          data: campaigns,
          count: campaigns.length
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
