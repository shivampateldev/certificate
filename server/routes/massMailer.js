const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { google } = require('googleapis');
const AdmZip = require('adm-zip');
const OAuthValidator = require('../utils/oauthValidator');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/mass-mailer/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Gmail OAuth configuration  
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/mass-mail/auth/google/callback'
);

// Root status endpoint (GET /api/mass-mail)
router.get('/', (req, res) => {
  try {
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    let authenticated = false;
    let email = 'demo@example.com';
    
    if (fs.existsSync(tokensPath)) {
      try {
        const tokens = JSON.parse(fs.readFileSync(tokensPath));
        oauth2Client.setCredentials(tokens);
        authenticated = true;
      } catch (error) {
        console.error('Error reading tokens:', error);
      }
    }
    
    // Handle action parameter for OAuth initiation
    const action = req.query.action;
    if (action === 'auth') {
      console.log('🔄 OAuth initiation requested via action parameter');
      return res.redirect('/api/mass-mail/auth/google');
    }
    
    res.json({
      success: true,
      message: 'Mass Mailer API is working!',
      data: {
        authenticated,
        email,
        quotaRemaining: 500,
        lastActivity: new Date().toISOString(),
        authMode: authenticated ? 'production' : 'demo'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Google OAuth routes (accessible via /api/mass-mail/auth/google)
router.get('/auth/google', (req, res) => {
  try {
    console.log('🚀 OAuth authentication initiated');
    
    // Validate configuration before proceeding
    const validator = new OAuthValidator();
    const config = validator.loadConfiguration();
    
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      console.error('❌ OAuth configuration incomplete');
      return res.redirect('http://localhost:3000/mass-mailer?auth=error&reason=config_incomplete');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    console.log('📋 OAuth scopes:', scopes);
    console.log('🔗 Redirect URI:', config.redirectUri);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: 'auth-' + Date.now() // Add state for security
    });

    console.log('✅ OAuth URL generated successfully');
    console.log('🌐 Redirecting to Google OAuth...');
    
    res.redirect(url);
  } catch (error) {
    console.error('❌ OAuth initiation failed:', error);
    res.redirect('http://localhost:3000/mass-mailer?auth=error&reason=oauth_init_failed');
  }
});

router.get('/auth/google/callback', async (req, res) => {
  const correlationId = 'callback-' + Date.now();
  console.log(`🔄 [${correlationId}] OAuth callback received`);
  
  try {
    const { code, error, state } = req.query;
    console.log(`📝 [${correlationId}] Callback parameters:`, { 
      hasCode: !!code, 
      error, 
      state,
      fullQuery: req.query 
    });

    if (error) {
      console.error(`❌ [${correlationId}] OAuth authorization error:`, error);
      const reason = error === 'access_denied' ? 'authorization_denied' : 'oauth_error';
      return res.redirect(`http://localhost:3000/mass-mailer?auth=error&reason=${reason}&details=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error(`❌ [${correlationId}] No authorization code received`);
      return res.redirect('http://localhost:3000/mass-mailer?auth=error&reason=no_code');
    }

    console.log(`🔑 [${correlationId}] Authorization code received, exchanging for tokens...`);
    console.log(`📏 [${correlationId}] Code length: ${code.length}`);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log(`✅ [${correlationId}] Tokens received successfully`);
    console.log(`🔍 [${correlationId}] Token info:`, {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      tokenType: tokens.token_type
    });

    // Set credentials for immediate use
    oauth2Client.setCredentials(tokens);

    // Store tokens securely
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    const tokenData = {
      ...tokens,
      stored_at: new Date().toISOString(),
      correlation_id: correlationId
    };
    
    fs.writeFileSync(tokensPath, JSON.stringify(tokenData, null, 2));
    console.log(`💾 [${correlationId}] Tokens saved successfully to:`, tokensPath);

    // Verify tokens work by testing Gmail API access
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ [${correlationId}] Gmail API test successful, user:`, profile.data.emailAddress);
    } catch (apiError) {
      console.warn(`⚠️ [${correlationId}] Gmail API test failed (tokens may still work):`, apiError.message);
    }

    console.log(`🎉 [${correlationId}] OAuth flow completed successfully`);
    res.redirect('http://localhost:3000/mass-mailer?auth=success');
    
  } catch (error) {
    console.error(`❌ [${correlationId}] OAuth callback error:`, {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack
    });
    
    // Determine specific error reason
    let reason = 'token_exchange_failed';
    if (error.message && error.message.includes('invalid_grant')) {
      reason = 'invalid_grant';
    } else if (error.message && error.message.includes('redirect_uri_mismatch')) {
      reason = 'redirect_uri_mismatch';
    }
    
    res.redirect(`http://localhost:3000/mass-mailer?auth=error&reason=${reason}&details=${encodeURIComponent(error.message)}`);
  }
});

// Parse CSV/Excel file
function parseRecipientFile(filePath, originalName = '') {
  const ext = path.extname(filePath).toLowerCase() || path.extname(originalName).toLowerCase();
  let data = [];

  console.log('Parsing file:', filePath, 'Original name:', originalName, 'Extension:', ext);

  // Try to parse as CSV first (most common case)
  if (ext === '.csv' || !ext) {
    try {
      const csvData = fs.readFileSync(filePath, 'utf8');
      console.log('CSV content preview:', csvData.substring(0, 300));

      // Handle different line endings
      const lines = csvData.split(/\r?\n/).filter(line => line.trim());
      console.log('Total lines:', lines.length);

      if (lines.length === 0) {
        console.log('No lines found in CSV');
        return data;
      }

      // Detect delimiter (comma, semicolon, or tab)
      const firstLine = lines[0];
      let delimiter = ',';
      if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length) {
        delimiter = ';';
      } else if (firstLine.includes('\t')) {
        delimiter = '\t';
      }
      console.log('Using delimiter:', delimiter === '\t' ? 'TAB' : delimiter);

      const headers = firstLine.split(delimiter).map(h => h.trim().replace(/['"]/g, ''));
      console.log('Headers found:', headers);

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          // Handle CSV with quotes and different delimiters
          const values = lines[i].split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);

          // Log first few rows for debugging
          if (i <= 3) {
            console.log(`Row ${i}:`, row);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return data;
    }
  } else if (ext === '.xlsx') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log('Excel data parsed:', data.length, 'records');
  }

  console.log('Parsed data sample:', data.slice(0, 2));
  return data;
}

// Find certificate file in ZIP
function findCertificateFile(certificateId, extractPath) {
  try {
    const files = fs.readdirSync(extractPath, { recursive: true });
    console.log(`Looking for certificate ID: "${certificateId}" in files:`, files);

    // First try exact match (case-insensitive)
    for (const file of files) {
      const fileName = path.basename(file, path.extname(file));
      if (fileName.toLowerCase() === certificateId.toLowerCase()) {
        const fullPath = path.join(extractPath, file);
        console.log(`Exact match found: ${file} -> ${fullPath}`);
        return fullPath;
      }
    }

    // Then try partial match (case-insensitive)
    for (const file of files) {
      if (file.toLowerCase().includes(certificateId.toLowerCase())) {
        const fullPath = path.join(extractPath, file);
        console.log(`Partial match found: ${file} -> ${fullPath}`);
        return fullPath;
      }
    }

    console.log(`No certificate file found for ID: ${certificateId}`);
    return null;
  } catch (error) {
    console.error('Error finding certificate file:', error);
    return null;
  }
}

// Send email via Gmail
async function sendEmailViaGmail(to, subject, body, attachmentPath, senderDisplayName = '') {
  try {
    // Load tokens
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    const tokens = JSON.parse(fs.readFileSync(tokensPath));
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Try to get the authenticated user's email
    let userEmail = '';
    
    try {
      // Try OAuth2 API first
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      userEmail = userInfo.data.email;
      console.log('Got user email from OAuth2:', userEmail);
    } catch (oauth2Error) {
      console.log('OAuth2 failed, trying Gmail profile:', oauth2Error.message);
      try {
        const profile = await gmail.users.getProfile({ userId: 'me' });
        userEmail = profile.data.emailAddress;
        console.log('Got user email from Gmail profile:', userEmail);
      } catch (profileError) {
        console.error('Both OAuth2 and Gmail profile failed:', profileError.message);
        // We'll proceed without the email and let Gmail handle it
        userEmail = null;
      }
    }

    // Build email headers
    let emailHeaders = [
      `To: ${to}`,
      `Subject: ${subject}`
    ];

    // Add From header with custom display name if provided
    if (senderDisplayName && senderDisplayName.trim()) {
      if (userEmail) {
        // Use proper RFC format with quotes
        emailHeaders.push(`From: "${senderDisplayName.trim()}" <${userEmail}>`);
        console.log(`Using custom sender: "${senderDisplayName.trim()}" <${userEmail}>`);
      } else {
        // If we don't have the email, just set the display name and let Gmail fill in the email
        emailHeaders.push(`From: "${senderDisplayName.trim()}"`);
        console.log(`Using custom sender name only: "${senderDisplayName.trim()}"`);
      }
    } else if (userEmail) {
      emailHeaders.push(`From: ${userEmail}`);
      console.log(`Using default sender: ${userEmail}`);
    }
    // If neither custom name nor email, let Gmail use defaults

    // If there's an attachment, create multipart message
    let emailContent;
    if (attachmentPath && fs.existsSync(attachmentPath)) {
      const attachment = fs.readFileSync(attachmentPath);
      const fileName = path.basename(attachmentPath);

      emailContent = [
        ...emailHeaders,
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="boundary123"',
        '',
        '--boundary123',
        'Content-Type: text/html; charset=utf-8',
        '',
        body,
        '',
        '--boundary123',
        `Content-Type: application/pdf; name="${fileName}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${fileName}"`,
        '',
        attachment.toString('base64'),
        '--boundary123--'
      ].join('\n');
    } else {
      // Simple email
      emailContent = [
        ...emailHeaders,
        'Content-Type: text/html; charset=utf-8',
        '',
        body
      ].join('\n');
    }

    console.log('Email headers being sent:', emailHeaders.join('; '));
    
    const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    console.log('Gmail API response:', result.status);
    return { success: true };
  } catch (error) {
    console.error('Gmail send error:', error);
    return { success: false, error: error.message };
  }
}

// Mass mail sending endpoint
router.post('/send', upload.fields([
  { name: 'zipfile', maxCount: 1 },
  { name: 'csvfile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { subject, body, senderDisplayName } = req.body;

    // Check if files exist
    if (!req.files || !req.files.zipfile || !req.files.csvfile) {
      return res.status(400).json({
        success: false,
        message: 'Both ZIP and CSV files are required'
      });
    }

    const zipFile = req.files.zipfile[0];
    const csvFile = req.files.csvfile[0];

    // Validate required fields
    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Subject and body template are required'
      });
    }

    // Check authentication
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    if (!fs.existsSync(tokensPath)) {
      return res.status(401).json({
        success: false,
        message: 'Gmail authentication required. Please sign in first.'
      });
    }

    // Extract ZIP file
    const extractPath = path.join('uploads/mass-mailer/extracted', Date.now().toString());
    fs.mkdirSync(extractPath, { recursive: true });

    const zip = new AdmZip(zipFile.path);
    zip.extractAllTo(extractPath, true);

    // Parse recipient file
    console.log('Parsing CSV file:', csvFile.path, 'Original name:', csvFile.originalname);
    const recipients = parseRecipientFile(csvFile.path, csvFile.originalname);
    console.log('Parsed recipients:', recipients.length, 'records');
    console.log('First recipient sample:', recipients[0]);

    // List extracted files for debugging
    console.log('Extracted files in:', extractPath);
    const extractedFiles = fs.readdirSync(extractPath, { recursive: true });
    console.log('Extracted files:', extractedFiles);

    const results = [];

    // Send emails with progress tracking
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`Raw recipient data:`, recipient);

      const name = recipient.Name || recipient.name || '';
      const email = recipient.Mail || recipient.Email || recipient.email || '';
      const certificateId = recipient['Certificate ID'] || recipient.Certificate_ID || recipient.CertificateID || recipient.certificateId || '';

      console.log(`Processing ${i + 1}/${recipients.length}:`);
      console.log(`  Name: "${name}"`);
      console.log(`  Email: "${email}"`);
      console.log(`  Certificate ID: "${certificateId}"`);

      if (!email || !certificateId) {
        console.log(`Skipping due to missing data - Email: ${!!email}, CertID: ${!!certificateId}`);
        results.push({
          Sr_No: recipient.Sr_No || recipient.sr_no || '',
          Mail: email,
          'Certificate ID': certificateId,
          Status: 'MISSING_DATA',
          Error: 'Missing email or certificate ID'
        });
        totalFailed++;
        continue;
      }

      // Find certificate file
      const certPath = findCertificateFile(certificateId, extractPath);
      if (!certPath) {
        results.push({
          Sr_No: recipient.Sr_No || recipient.sr_no || '',
          Mail: email,
          'Certificate ID': certificateId,
          Status: 'CERT_NOT_FOUND',
          Error: 'Certificate file not found'
        });
        totalFailed++;
        continue;
      }

      // Send email
      const emailBody = body.replace(/{Name}/g, name).replace(/{CertificateID}/g, certificateId);
      const result = await sendEmailViaGmail(email, subject, emailBody, certPath, senderDisplayName);

      results.push({
        Sr_No: recipient.Sr_No || recipient.sr_no || '',
        Mail: email,
        'Certificate ID': certificateId,
        Status: result.success ? 'SENT' : 'FAILED',
        Error: result.error || ''
      });

      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }

      // Add small delay to avoid rate limiting
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Clean up files
    try {
      fs.rmSync(extractPath, { recursive: true, force: true });
      fs.unlinkSync(zipFile.path);
      fs.unlinkSync(csvFile.path);
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError.message);
    }

    console.log(`Email sending completed: ${totalSent} sent, ${totalFailed} failed`);

    // Return results as CSV
    const csvHeader = 'Sr_No,Mail,Certificate ID,Status,Error\n';
    const csvRows = results.map(r =>
      `"${r.Sr_No}","${r.Mail}","${r['Certificate ID']}","${r.Status}","${r.Error}"`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="email_results.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Mass mail error:', error);

    // Clean up files on error
    try {
      if (req.files) {
        if (req.files.zipfile) fs.unlinkSync(req.files.zipfile[0].path);
        if (req.files.csvfile) fs.unlinkSync(req.files.csvfile[0].path);
      }
    } catch (cleanupError) {
      console.warn('Error cleanup failed:', cleanupError.message);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send emails',
      error: error.message
    });
  }
});

// Check authentication status
router.get('/auth/status', (req, res) => {
  try {
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    const tokens = JSON.parse(fs.readFileSync(tokensPath));
    oauth2Client.setCredentials(tokens);
    res.json({ authenticated: true });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// Disconnect/logout endpoint
router.post('/auth/disconnect', (req, res) => {
  try {
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    if (fs.existsSync(tokensPath)) {
      fs.unlinkSync(tokensPath);
    }
    oauth2Client.setCredentials({});
    res.json({ success: true, message: 'Successfully disconnected from Gmail' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect' });
  }
});

// Force re-authentication endpoint (clears tokens to get new scopes)
router.post('/auth/refresh', (req, res) => {
  try {
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    if (fs.existsSync(tokensPath)) {
      fs.unlinkSync(tokensPath);
      console.log('Tokens cleared for re-authentication with new scopes');
    }
    oauth2Client.setCredentials({});
    res.json({ success: true, message: 'Please re-authenticate to get updated permissions' });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh authentication' });
  }
});

// OAuth Configuration Diagnostic Endpoints
// Health check endpoint for OAuth configuration
router.get('/auth/health', async (req, res) => {
  try {
    console.log('🏥 OAuth health check requested');
    const validator = new OAuthValidator();
    const results = await validator.validateConfiguration();
    
    const statusCode = results.overall === 'pass' ? 200 : 
                      results.overall === 'error' ? 500 : 400;
    
    res.status(statusCode).json({
      success: results.overall === 'pass',
      message: `OAuth configuration ${results.overall}`,
      data: results,
      troubleshooting: validator.getTroubleshootingSuggestions()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Detailed diagnostic report endpoint
router.get('/auth/diagnostics', async (req, res) => {
  try {
    console.log('🔍 OAuth diagnostics requested');
    const validator = new OAuthValidator();
    const results = await validator.validateConfiguration();
    const report = validator.generateDiagnosticReport();
    
    res.json({
      success: true,
      message: 'Diagnostic report generated',
      data: {
        results,
        report,
        suggestions: validator.getTroubleshootingSuggestions()
      }
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({
      success: false,
      message: 'Diagnostics failed',
      error: error.message
    });
  }
});

// Test OAuth URL generation endpoint
router.get('/auth/test-url', (req, res) => {
  try {
    console.log('🧪 OAuth URL test requested');
    
    // Validate configuration first
    const validator = new OAuthValidator();
    const config = validator.loadConfiguration();
    
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      return res.status(400).json({
        success: false,
        message: 'OAuth configuration incomplete',
        missing: {
          clientId: !config.clientId,
          clientSecret: !config.clientSecret,
          redirectUri: !config.redirectUri
        }
      });
    }

    const testOAuth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const authUrl = testOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: 'test-' + Date.now() // Add test state for identification
    });

    res.json({
      success: true,
      message: 'OAuth URL generated successfully',
      data: {
        authUrl,
        scopes,
        config: {
          clientId: config.clientId ? config.clientId.substring(0, 20) + '...' : null,
          redirectUri: config.redirectUri,
          environment: config.environment
        }
      }
    });
  } catch (error) {
    console.error('OAuth URL test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate OAuth URL',
      error: error.message
    });
  }
});

// Configuration validation endpoint
router.get('/auth/validate-config', async (req, res) => {
  try {
    console.log('⚙️ OAuth configuration validation requested');
    const validator = new OAuthValidator();
    const results = await validator.validateConfiguration();
    
    res.json({
      success: results.overall === 'pass',
      message: `Configuration validation ${results.overall}`,
      data: results
    });
  } catch (error) {
    console.error('Configuration validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Configuration validation failed',
      error: error.message
    });
  }
});

module.exports = router;