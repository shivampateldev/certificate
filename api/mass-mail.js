/**
 * Mass Mail API
 * Handles email campaign creation, preview, and sending
 */

const {
  EmailCampaignModel,
  EmailLogModel,
  ParticipantModel,
  GeneratedCertificateModel,
  CertificateGenerationModel
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
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { participant_id, subject, body: emailBody } = JSON.parse(body);

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
      });
      return;
    }

    // POST /api/mass-mail/campaign - Create email campaign
    if (urlPath === '/api/mass-mail/campaign' && method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { batch_id, generation_id, subject, body: emailBody, sender_email } = JSON.parse(body);

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
      });
      return;
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

        busboy.on('field', (fieldname, val) => {
          if (fieldname === 'subject') emailSubject = val;
          if (fieldname === 'body') emailBody = val;
          if (fieldname === 'senderDisplayName') senderDisplayName = val;
          if (fieldname === 'accessToken') accessToken = val;
          if (fieldname === 'senderEmail') senderEmail = val;
        });

        let activeStreams = 0;
        let busboyFinished = false;

        function checkAndProcess() {
          if (activeStreams === 0 && busboyFinished) {
            processUploads();
          }
        }

        busboy.on('file', (fieldname, file, info) => {
          activeStreams++;
          const chunks = [];
          file.on('data', d => chunks.push(d));
          file.on('end', () => {
            if (fieldname === 'zipfile') zipBuffer = Buffer.concat(chunks);
            if (fieldname === 'csvfile') {
              csvBuffer = Buffer.concat(chunks);
              csvFileName = info.filename || 'recipients.csv';
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
              }
            } else {
              // Real Gmail send via Gmail REST API (more reliable than nodemailer OAuth2 transport)
              for (const recipient of recipients) {
                try {
                  const personalBody = emailBody
                    .replace(/\{Name\}/gi, recipient.name || '')
                    .replace(/\{CertificateID\}/gi, recipient.certificateId || recipient.certificate_id || '');

                  const htmlBody = personalBody.replace(/\n/g, '<br>');
                  const fromStr = senderDisplayName
                    ? `"${senderDisplayName}" <${senderEmail}>`
                    : senderEmail;

                  // Find matching certificate in ZIP
                  let attachmentData = null;
                  let attachmentName = null;
                  if (zipEntries.length > 0) {
                    const certId = recipient.certificate_id || recipient.certificateId || '';
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
                      console.warn(`No matching certificate in ZIP for ID: ${recipient.certificate_id || 'unknown'}`);
                    }
                  }

                  // Build RFC 2822 raw email
                  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  let rawEmail;

                  if (attachmentData) {
                    rawEmail = [
                      `From: ${fromStr}`,
                      `To: ${recipient.email}`,
                      `Subject: ${emailSubject}`,
                      'MIME-Version: 1.0',
                      `Content-Type: multipart/mixed; boundary="${boundary}"`,
                      '',
                      `--${boundary}`,
                      'Content-Type: text/html; charset=UTF-8',
                      'Content-Transfer-Encoding: quoted-printable',
                      '',
                      htmlBody,
                      '',
                      `--${boundary}`,
                      `Content-Type: application/pdf; name="${attachmentName}"`,
                      'Content-Transfer-Encoding: base64',
                      `Content-Disposition: attachment; filename="${attachmentName}"`,
                      '',
                      attachmentData.toString('base64'),
                      '',
                      `--${boundary}--`
                    ].join('\r\n');
                  } else {
                    rawEmail = [
                      `From: ${fromStr}`,
                      `To: ${recipient.email}`,
                      `Subject: ${emailSubject}`,
                      'MIME-Version: 1.0',
                      'Content-Type: text/html; charset=UTF-8',
                      '',
                      htmlBody
                    ].join('\r\n');
                  }

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

                  sentCount++;
                  results.push({ email: recipient.email, name: recipient.name, status: 'sent', messageId: gmailResult.id });
                  console.log(`✓ Sent email to ${recipient.email} (Gmail message ID: ${gmailResult.id})`);
                } catch (sendErr) {
                  console.error(`✗ Failed to send to ${recipient.email}:`, sendErr.message);
                  failedCount++;
                  results.push({ email: recipient.email, name: recipient.name, status: 'failed', error: sendErr.message });
                }
              }
            }

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
