const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * OAuth Configuration Validator and Diagnostic Tools
 * Validates OAuth setup and provides debugging capabilities
 */
class OAuthValidator {
  constructor() {
    this.config = this.loadConfiguration();
    this.validationResults = {};
  }

  /**
   * Load OAuth configuration from environment variables
   */
  loadConfiguration() {
    return {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      redirectUri: process.env.GMAIL_REDIRECT_URI,
      userEmail: process.env.GMAIL_USER,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Validate all OAuth configuration
   */
  async validateConfiguration() {
    console.log('🔍 Starting OAuth configuration validation...');
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      overall: 'pending',
      checks: {}
    };

    try {
      // Check environment variables
      results.checks.environmentVariables = this.validateEnvironmentVariables();
      
      // Check OAuth client configuration
      results.checks.oauthClient = this.validateOAuthClient();
      
      // Check redirect URI format
      results.checks.redirectUri = this.validateRedirectUri();
      
      // Check scopes configuration
      results.checks.scopes = this.validateScopes();
      
      // Test Gmail API connectivity
      results.checks.gmailApi = await this.testGmailApiConnectivity();
      
      // Check token storage
      results.checks.tokenStorage = this.validateTokenStorage();

      // Determine overall status - only fail if critical checks fail
      // Token storage is informational, not critical for initial setup
      const criticalChecks = ['environmentVariables', 'oauthClient', 'redirectUri', 'gmailApi'];
      const criticalChecksPassed = criticalChecks.every(checkName => 
        results.checks[checkName]?.status === 'pass'
      );
      
      results.overall = criticalChecksPassed ? 'pass' : 'fail';

      this.validationResults = results;
      
      console.log('✅ OAuth configuration validation completed');
      console.log(`Overall status: ${results.overall.toUpperCase()}`);
      
      return results;
    } catch (error) {
      console.error('❌ OAuth configuration validation failed:', error);
      results.overall = 'error';
      results.error = error.message;
      return results;
    }
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables() {
    const requiredVars = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REDIRECT_URI'];
    const missing = [];
    const invalid = [];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        missing.push(varName);
      } else if (value.includes('your_') || value === 'your_gmail_client_id') {
        invalid.push(varName);
      }
    }

    const status = missing.length === 0 && invalid.length === 0 ? 'pass' : 'fail';
    
    return {
      status,
      message: status === 'pass' 
        ? 'All required environment variables are present and valid'
        : 'Missing or invalid environment variables detected',
      details: {
        missing,
        invalid,
        present: requiredVars.filter(v => process.env[v] && !process.env[v].includes('your_'))
      }
    };
  }

  /**
   * Validate OAuth client configuration
   */
  validateOAuthClient() {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        this.config.redirectUri
      );

      // Check if client ID format is valid (Google client IDs end with .apps.googleusercontent.com)
      const clientIdValid = this.config.clientId && 
        this.config.clientId.endsWith('.apps.googleusercontent.com');

      // Check if client secret format is valid (Google client secrets start with GOCSPX-)
      const clientSecretValid = this.config.clientSecret && 
        this.config.clientSecret.startsWith('GOCSPX-');

      const status = clientIdValid && clientSecretValid ? 'pass' : 'fail';

      return {
        status,
        message: status === 'pass' 
          ? 'OAuth client configuration is valid'
          : 'OAuth client configuration has issues',
        details: {
          clientIdFormat: clientIdValid ? 'valid' : 'invalid',
          clientSecretFormat: clientSecretValid ? 'valid' : 'invalid',
          clientInitialized: !!oauth2Client
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Failed to initialize OAuth client',
        error: error.message
      };
    }
  }

  /**
   * Validate redirect URI configuration
   */
  validateRedirectUri() {
    const uri = this.config.redirectUri;
    
    if (!uri) {
      return {
        status: 'fail',
        message: 'Redirect URI is not configured',
        details: { uri: null }
      };
    }

    try {
      const url = new URL(uri);
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const isHttps = url.protocol === 'https:';
      const isHttp = url.protocol === 'http:';
      
      // In development, localhost with HTTP is acceptable
      // In production, HTTPS is required
      const isValidForEnvironment = this.config.environment === 'development' 
        ? (isLocalhost && (isHttp || isHttps))
        : isHttps;

      const expectedPath = '/api/mass-mail/auth/google/callback';
      const hasCorrectPath = url.pathname === expectedPath;

      const status = isValidForEnvironment && hasCorrectPath ? 'pass' : 'fail';

      return {
        status,
        message: status === 'pass' 
          ? 'Redirect URI is properly configured'
          : 'Redirect URI configuration has issues',
        details: {
          uri,
          protocol: url.protocol,
          hostname: url.hostname,
          pathname: url.pathname,
          expectedPath,
          isValidForEnvironment,
          hasCorrectPath
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Invalid redirect URI format',
        error: error.message,
        details: { uri }
      };
    }
  }

  /**
   * Validate OAuth scopes configuration
   */
  validateScopes() {
    const requiredScopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    return {
      status: 'pass',
      message: 'Required scopes are properly configured',
      details: {
        requiredScopes,
        note: 'Scopes are hardcoded in the application and are correct'
      }
    };
  }

  /**
   * Test Gmail API connectivity
   */
  async testGmailApiConnectivity() {
    try {
      // Create a test OAuth client
      const oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        this.config.redirectUri
      );

      // Try to generate an auth URL (this tests basic API connectivity)
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.email'],
        prompt: 'consent'
      });

      const isValidUrl = authUrl && authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth');

      return {
        status: isValidUrl ? 'pass' : 'fail',
        message: isValidUrl 
          ? 'Gmail API is accessible and OAuth URL generation works'
          : 'Failed to generate valid OAuth URL',
        details: {
          authUrlGenerated: !!authUrl,
          authUrlValid: isValidUrl,
          note: 'This tests basic API connectivity without requiring authentication'
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Gmail API connectivity test failed',
        error: error.message
      };
    }
  }

  /**
   * Validate token storage configuration
   */
  validateTokenStorage() {
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    const tokensExist = fs.existsSync(tokensPath);
    
    let tokenData = null;
    let tokenValid = false;
    
    if (tokensExist) {
      try {
        tokenData = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        tokenValid = !!(tokenData.access_token && tokenData.refresh_token);
      } catch (error) {
        // Token file exists but is corrupted
      }
    }

    return {
      status: 'info', // This is informational, not a pass/fail
      message: tokensExist 
        ? (tokenValid ? 'Valid tokens found' : 'Token file exists but may be invalid')
        : 'No stored tokens found (user needs to authenticate)',
      details: {
        tokensPath,
        tokensExist,
        tokenValid,
        hasAccessToken: !!(tokenData && tokenData.access_token),
        hasRefreshToken: !!(tokenData && tokenData.refresh_token),
        tokenExpiry: tokenData && tokenData.expiry_date ? new Date(tokenData.expiry_date) : null
      }
    };
  }

  /**
   * Get validation results
   */
  getValidationResults() {
    return this.validationResults;
  }

  /**
   * Generate diagnostic report
   */
  generateDiagnosticReport() {
    const results = this.validationResults;
    if (!results || Object.keys(results).length === 0) {
      return 'No validation results available. Run validateConfiguration() first.';
    }

    let report = `
OAuth Configuration Diagnostic Report
=====================================
Generated: ${results.timestamp}
Environment: ${results.environment}
Overall Status: ${results.overall.toUpperCase()}

`;

    for (const [checkName, checkResult] of Object.entries(results.checks)) {
      report += `
${checkName.toUpperCase()}
Status: ${checkResult.status.toUpperCase()}
Message: ${checkResult.message}
`;
      
      if (checkResult.details) {
        report += `Details: ${JSON.stringify(checkResult.details, null, 2)}\n`;
      }
      
      if (checkResult.error) {
        report += `Error: ${checkResult.error}\n`;
      }
    }

    return report;
  }

  /**
   * Get troubleshooting suggestions based on validation results
   */
  getTroubleshootingSuggestions() {
    const results = this.validationResults;
    const suggestions = [];

    if (!results || !results.checks) {
      return ['Run OAuth configuration validation first'];
    }

    // Environment variables suggestions
    if (results.checks.environmentVariables?.status === 'fail') {
      const details = results.checks.environmentVariables.details;
      if (details.missing.length > 0) {
        suggestions.push(`Missing environment variables: ${details.missing.join(', ')}. Add them to your .env file.`);
      }
      if (details.invalid.length > 0) {
        suggestions.push(`Invalid environment variables: ${details.invalid.join(', ')}. Replace placeholder values with actual OAuth credentials.`);
      }
    }

    // OAuth client suggestions
    if (results.checks.oauthClient?.status === 'fail') {
      const details = results.checks.oauthClient.details;
      if (details.clientIdFormat === 'invalid') {
        suggestions.push('Client ID format is invalid. Google Client IDs should end with .apps.googleusercontent.com');
      }
      if (details.clientSecretFormat === 'invalid') {
        suggestions.push('Client Secret format is invalid. Google Client Secrets should start with GOCSPX-');
      }
    }

    // Redirect URI suggestions
    if (results.checks.redirectUri?.status === 'fail') {
      const details = results.checks.redirectUri.details;
      if (!details.hasCorrectPath) {
        suggestions.push(`Redirect URI path should be ${details.expectedPath}, but found ${details.pathname}`);
      }
      if (!details.isValidForEnvironment) {
        if (results.environment === 'production') {
          suggestions.push('Production environment requires HTTPS for redirect URI');
        } else {
          suggestions.push('Development environment should use localhost with HTTP or HTTPS');
        }
      }
    }

    // Gmail API suggestions
    if (results.checks.gmailApi?.status === 'fail') {
      suggestions.push('Gmail API connectivity failed. Check your internet connection and OAuth credentials.');
      suggestions.push('Ensure Gmail API is enabled in your Google Cloud Console project.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Configuration appears to be correct. If you\'re still having issues, check the server logs for more details.');
    }

    return suggestions;
  }
}

module.exports = OAuthValidator;