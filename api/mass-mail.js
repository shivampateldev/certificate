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

/**
 * HTML escape helper to prevent template literal syntax from appearing in output
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Typo-tolerant and case-insensitive placeholder replacement helper.
 */
function replacePlaceholders(text, rName, rCertId) {
  if (!text) return '';
  return text
    .replace(/\{\{?\s*name\s*\}?\}/gi, rName || '')
    .replace(/\{\{?\s*(certificateid|certificated|certifiacte_id|certificate_id|certificate\s*id)\s*\}?\}/gi, rCertId || '');
}

// Helper to wrap email body in a stunning modern template matching a color preset & header style
function wrapEmailInTemplate(bodyHtml, options, headerImageName) {
  if (!bodyHtml) bodyHtml = '';
  
  const {
    headerType = 'none',
    colorTheme = 'purple',
    backgroundType = 'light',
    headerTitle = '',
    headerSubtitle = '',
    headerBadge = ''
  } = options;

  // Resolve color palettes
  const palettes = {
    purple: { primary: '#4f46e5', secondary: '#4338ca', accent: '#7c3aed' },
    emerald: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
    blue: { primary: '#0284c7', secondary: '#0369a1', accent: '#38bdf8' },
    red: { primary: '#ef4444', secondary: '#dc2626', accent: '#f87171' },
    amber: { primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' }
  };

  // Check for custom hex color or default to purple
  let themeColors = palettes[colorTheme];
  if (!themeColors) {
    if (colorTheme && colorTheme.startsWith('#')) {
      themeColors = { primary: colorTheme, secondary: colorTheme, accent: colorTheme };
    } else {
      themeColors = palettes.purple;
    }
  }

  const primaryColor = themeColors.primary;
  const secondaryColor = themeColors.secondary;

  // Background and text settings
  const isDark = backgroundType === 'dark';
  const outerBg = isDark ? '#0f172a' : '#f1f5f9';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  const mutedTextColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const footerBg = isDark ? '#0f172a' : '#f8fafc';

  // Build header HTML
  let headerHtml = '';

  if (headerType === 'promptwars') {
    const title = headerTitle || 'In-person PromptWars';
    const subtitle = headerSubtitle || 'Build, pitch & win in one day';
    const badge = headerBadge || 'Google for Developers | H2S';

    headerHtml = `
      <div style="background-color: #0b0f19; background-image: radial-gradient(circle at top, rgba(16, 185, 129, 0.2) 0%, transparent 60%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #10b981; border-top-left-radius: 16px; border-top-right-radius: 16px;">
        <div style="width: 80px; height: 4px; background: #10b981; margin: -40px auto 25px; border-radius: 0 0 4px 4px; box-shadow: 0 0 20px 4px #10b981;"></div>
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 15px; width: 100%;">
          <tr>
            <td align="left" style="color: #ffffff; font-size: 12px; font-weight: bold; opacity: 0.85; font-family: 'Inter', sans-serif;">
              ${badge}
            </td>
            <td align="right" style="color: #10b981; font-size: 12px; font-weight: bold; letter-spacing: 1px; font-family: 'Inter', sans-serif;">
              [ BUILD WITH AI ]
            </td>
          </tr>
        </table>
        <div style="color: #10b981; font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 2px; font-family: 'Inter', sans-serif;">In-person</div>
        <h1 style="color: #ffffff; font-size: 32px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.5px; font-family: 'Inter', sans-serif;">
          ${title}
        </h1>
        <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #f59e0b 100%); color: #000000; font-size: 13px; font-weight: bold; padding: 8px 24px; border-radius: 30px; margin-bottom: 16px; font-family: 'Inter', sans-serif;">
          ✨ ${subtitle}
        </div>
        <div style="color: #94a3b8; font-size: 13px; font-family: monospace;">Compiling India.dev...</div>
      </div>
    `;
  } else if (headerType === 'logos') {
    headerHtml = `
      <div style="background-color: #ffffff; padding: 25px 30px; text-align: center; border-bottom: 2px solid ${primaryColor}; border-top-left-radius: 16px; border-top-right-radius: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; font-family: 'Inter', sans-serif;">Event Invitation</div>
        <div style="font-size: 20px; font-weight: 800; color: #0f172a; font-family: 'Inter', sans-serif;">Silver Oak University & IEEE SB</div>
      </div>
    `;
  } else if (headerType === 'custom' && headerImageName) {
    headerHtml = `
      <div style="text-align: center;">
        <img src="cid:headerImage" style="width: 100%; max-width: 600px; display: block; border-top-left-radius: 16px; border-top-right-radius: 16px;" alt="Header Image" />
      </div>
    `;
  }

  // Build header row HTML
  const headerRow = headerHtml 
    ? `<tr><td style="padding: 0;">${headerHtml}</td></tr>`
    : `<tr><td style="padding: 0; height: 6px; background-color: ${primaryColor};"></td></tr>`;

  // Construct complete premium HTML
  const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email Notification</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
body {
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
}
</style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: ${outerBg}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
<div style="background-color: ${outerBg}; padding: 30px 15px; min-height: 100%;">
<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${cardBg}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid ${borderColor}; border-collapse: collapse;">
${headerRow}
<tr>
<td style="padding: 40px 30px; color: ${textColor}; font-size: 16px; line-height: 1.6; font-family: sans-serif;">
${bodyHtml}
</td>
</tr>
<tr>
<td style="padding: 24px 30px; background-color: ${footerBg}; border-top: 1px solid ${borderColor}; text-align: center; color: ${mutedTextColor}; font-size: 12px; font-family: sans-serif; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
<div style="font-weight: bold; color: ${primaryColor}; margin-bottom: 8px;">Sent via Certificate Management Platform</div>
<div>Silver Oak University • IEEE Student Branch</div>
<div style="margin-top: 8px; opacity: 0.8;">If you did not expect this email, you can safely ignore it.</div>
</td>
</tr>
</table>
</div>
</body>
</html>`;

  return htmlTemplate;
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
      text = replacePlaceholders(field.field_name, recipient.name || '', recipient.certificate_id || recipient.certificateId || '');
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

        // Design Customization fields
        let campaignType = 'certificate';
        let headerType = 'none';
        let colorTheme = 'purple';
        let backgroundType = 'light';
        let headerTitle = '';
        let headerSubtitle = '';
        let headerBadge = '';
        
        let headerImageBuffer = null;
        let headerImageName = '';

        busboy.on('field', (fieldname, val) => {
          const cleanVal = typeof val === 'string' ? val.trim() : val;
          if (fieldname === 'subject') emailSubject = cleanVal;
          if (fieldname === 'body') emailBody = val; // Keep original formatting for email body template
          if (fieldname === 'senderDisplayName') senderDisplayName = cleanVal;
          if (fieldname === 'accessToken') accessToken = cleanVal;
          if (fieldname === 'senderEmail') senderEmail = cleanVal;
          if (fieldname === 'templateId') templateId = cleanVal;
          if (fieldname === 'campaignType') campaignType = cleanVal;
          if (fieldname === 'headerType') headerType = cleanVal;
          if (fieldname === 'colorTheme') colorTheme = cleanVal;
          if (fieldname === 'backgroundType') backgroundType = cleanVal;
          if (fieldname === 'headerTitle') headerTitle = cleanVal;
          if (fieldname === 'headerSubtitle') headerSubtitle = cleanVal;
          if (fieldname === 'headerBadge') headerBadge = cleanVal;
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
            } else if (fieldname === 'headerImage') {
              headerImageBuffer = Buffer.concat(chunks);
              headerImageName = info.filename || 'header.jpg';
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
            if (zipBuffer && campaignType === 'certificate') {
              try {
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(zipBuffer);
                zipEntries = zip.getEntries();
                console.log(`Successfully parsed ZIP file: found ${zipEntries.length} entries`);
              } catch (zipErr) {
                console.error('Error parsing ZIP file:', zipErr);
              }
            }

            // Load template and fields if templateId is provided (only for certificate campaign)
            let template = null;
            let fields = [];
            if (templateId && campaignType === 'certificate') {
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

                // If template mode and certificate campaign, generate simulated certificate
                if (campaignType === 'certificate' && template && fields.length > 0) {
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


                  const recipientCertId = recipient.certificate_id || recipient.certificateId || '';
                  const personalSubject = replacePlaceholders(emailSubject, recipient.name, recipientCertId);
                  const personalBody = replacePlaceholders(emailBody, recipient.name, recipientCertId);

                  const htmlBody = personalBody.replace(/\n/g, '<br>');
                  
                  // Premium Certificate Info Badge Card
                  let finalHtmlBody = htmlBody;
                  if (campaignType === 'certificate' && recipientCertId) {
                    const themeHex = colorTheme && colorTheme.startsWith('#') ? colorTheme : (colorTheme === 'emerald' ? '#10b981' : (colorTheme === 'blue' ? '#0284c7' : (colorTheme === 'red' ? '#ef4444' : (colorTheme === 'amber' ? '#f59e0b' : '#4f46e5'))));
                    const isDark = backgroundType === 'dark';
                    finalHtmlBody += `
                      <div style="margin-top: 30px; padding: 24px; background-color: ${isDark ? '#1e293b' : '#f8fafc'}; border: 1px dashed ${themeHex}; border-radius: 12px; text-align: center;">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 100%;">
                          <tr>
                            <td align="center" style="padding-bottom: 12px;">
                              <span style="font-size: 36px;">🎓</span>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: ${isDark ? '#94a3b8' : '#64748b'}; margin-bottom: 6px; font-family: sans-serif;">Official Verification ID</div>
                              <div style="display: inline-block; background-color: ${themeHex}; color: #ffffff; font-family: monospace; font-size: 16px; font-weight: bold; padding: 8px 18px; border-radius: 8px; letter-spacing: 0.5px;">
                                ${recipientCertId}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding-top: 14px; color: ${isDark ? '#94a3b8' : '#64748b'}; font-size: 13px; line-height: 1.4; font-family: sans-serif;">
                              Your verified certificate has been securely generated and attached to this email as a PDF.
                            </td>
                          </tr>
                        </table>
                      </div>
                    `;
                  }
                  
                  // Wrap email in selected theme and header style
                  const formattedHtmlBody = wrapEmailInTemplate(finalHtmlBody, {
                    headerType,
                    colorTheme,
                    backgroundType,
                    headerTitle,
                    headerSubtitle,
                    headerBadge
                  }, headerImageName);

                  // Debug logging to verify HTML is properly formatted
                  console.log(`[Email Debug] Preparing email for ${recipient.email}`);
                  console.log(`[Email Debug] Header Type: ${headerType}, Theme: ${colorTheme}, Background: ${backgroundType}`);
                  console.log(`[Email Debug] HTML Body starts with: ${formattedHtmlBody.substring(0, 100)}...`);
                  if (formattedHtmlBody.includes('${')) {
                    console.error(`[Email Error] HTML body contains template literal syntax - formatting failed!`);
                  }

                  const fromStr = senderDisplayName
                    ? `"${senderDisplayName}" <${senderEmail}>`
                    : senderEmail;

                  // Find matching certificate in ZIP or generate dynamically on the fly (Only if not a reminder campaign)
                  let attachmentData = null;
                  let attachmentName = null;
                  const certId = recipient.certificate_id || recipient.certificateId || `CERT-${Date.now()}`;

                  if (campaignType === 'certificate') {
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
                    }
                  }

                  // Build RFC 2822 raw email with proper MIME structure
                  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  const relatedBoundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}_rel`;
                  const htmlBodyLines = formattedHtmlBody.split('\n').map(line => line.replace(/\r+$/, ''));
                  const emailParts = [
                    `From: ${fromStr}`,
                    `To: ${recipient.email}`,
                    `Subject: ${personalSubject}`,
                    'MIME-Version: 1.0',
                    `Content-Type: multipart/mixed; boundary="${boundary}"`,
                    '',
                    `--${boundary}`,
                    `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
                    '',
                    `--${relatedBoundary}`,
                    'Content-Type: text/html; charset=UTF-8',
                    'Content-Transfer-Encoding: 8bit',
                    '',
                    ...htmlBodyLines,
                    ''
                  ];

                  // Add custom header image inline if header type is custom and custom image is uploaded
                  if (headerType === 'custom' && headerImageBuffer) {
                    let imageMime = 'image/jpeg';
                    if (headerImageName.toLowerCase().endsWith('.png')) {
                      imageMime = 'image/png';
                    } else if (headerImageName.toLowerCase().endsWith('.gif')) {
                      imageMime = 'image/gif';
                    } else if (headerImageName.toLowerCase().endsWith('.webp')) {
                      imageMime = 'image/webp';
                    }

                    emailParts.push(
                      `--${relatedBoundary}`,
                      `Content-Type: ${imageMime}; name="${headerImageName || 'header.jpg'}"`,
                      'Content-Transfer-Encoding: base64',
                      'Content-ID: <headerImage>',
                      `Content-Disposition: inline; filename="${headerImageName || 'header.jpg'}"`,
                      '',
                      headerImageBuffer.toString('base64'),
                      ''
                    );
                  }

                  // Close the related multipart section
                  emailParts.push(`--${relatedBoundary}--`, '');

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
              let subject = campaign.subject;
              let emailBody = campaign.body;

              const replacePlaceholders = (text, rName, rCertId, rEmail) => {
                if (!text) return '';
                let res = text
                  .replace(/\{\{?\s*name\s*\}?\}/gi, rName || '')
                  .replace(/\{\{?\s*email\s*\}?\}/gi, rEmail || '')
                  .replace(/\{\{?\s*(certificateid|certificated|certifiacte_id|certificate_id|certificate\s*id)\s*\}?\}/gi, rCertId || '');
                
                // Also support custom fields
                if (participant.custom_fields) {
                  for (const [key, val] of Object.entries(participant.custom_fields)) {
                    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    res = res.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi'), val || '');
                    res = res.replace(new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, 'gi'), val || '');
                  }
                }
                return res;
              };

              subject = replacePlaceholders(subject, participant.name, participant.certificate_id, participant.email);
              emailBody = replacePlaceholders(emailBody, participant.name, participant.certificate_id, participant.email);

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
