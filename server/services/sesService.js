const { ses } = require('../config/aws');

class SESService {
  /**
   * Send email with attachment
   * @param {object} emailData - Email configuration
   * @returns {Promise<object>} Send result
   */
  async sendEmail(emailData) {
    const {
      to,
      from,
      subject,
      htmlBody,
      textBody,
      attachments = []
    } = emailData;

    try {
      let params;

      if (attachments.length > 0) {
        // Use raw email format for attachments
        params = {
          RawMessage: {
            Data: await this.createRawEmail(emailData)
          }
        };
      } else {
        // Use simple email format
        params = {
          Source: from,
          Destination: {
            ToAddresses: Array.isArray(to) ? to : [to]
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8'
            },
            Body: {
              Html: htmlBody ? {
                Data: htmlBody,
                Charset: 'UTF-8'
              } : undefined,
              Text: textBody ? {
                Data: textBody,
                Charset: 'UTF-8'
              } : undefined
            }
          }
        };
      }

      const result = await ses.sendEmail(params).promise();
      
      return {
        success: true,
        messageId: result.MessageId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('SES send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send bulk emails
   * @param {Array} recipients - Array of recipient data
   * @param {object} template - Email template
   * @param {Array} attachments - Email attachments
   * @returns {Promise<Array>} Results for each email
   */
  async sendBulkEmails(recipients, template, attachments = []) {
    const results = [];
    const batchSize = 10; // SES rate limit consideration

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(async (recipient) => {
        try {
          const personalizedTemplate = this.personalizeTemplate(template, recipient);
          
          const emailData = {
            to: recipient.email,
            from: template.from,
            subject: personalizedTemplate.subject,
            htmlBody: personalizedTemplate.htmlBody,
            textBody: personalizedTemplate.textBody,
            attachments: attachments.filter(att => att.recipientId === recipient.id)
          };

          const result = await this.sendEmail(emailData);
          
          return {
            recipientId: recipient.id,
            email: recipient.email,
            status: 'sent',
            messageId: result.messageId,
            timestamp: result.timestamp
          };
        } catch (error) {
          return {
            recipientId: recipient.id,
            email: recipient.email,
            status: 'failed',
            error: error.message,
            timestamp: new Date()
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await this.delay(1000); // 1 second delay
      }
    }

    return results;
  }

  /**
   * Verify email address
   * @param {string} email - Email address to verify
   * @returns {Promise<object>} Verification result
   */
  async verifyEmail(email) {
    try {
      const params = {
        EmailAddress: email
      };

      await ses.verifyEmailIdentity(params).promise();
      
      return {
        success: true,
        message: `Verification email sent to ${email}`
      };
    } catch (error) {
      console.error('SES verify error:', error);
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }

  /**
   * Get sending statistics
   * @returns {Promise<object>} Sending statistics
   */
  async getSendingStatistics() {
    try {
      const result = await ses.getSendStatistics().promise();
      
      return {
        success: true,
        statistics: result.SendDataPoints
      };
    } catch (error) {
      console.error('SES statistics error:', error);
      throw new Error(`Failed to get sending statistics: ${error.message}`);
    }
  }

  /**
   * Get sending quota
   * @returns {Promise<object>} Sending quota information
   */
  async getSendingQuota() {
    try {
      const result = await ses.getSendQuota().promise();
      
      return {
        success: true,
        quota: {
          max24HourSend: result.Max24HourSend,
          maxSendRate: result.MaxSendRate,
          sentLast24Hours: result.SentLast24Hours
        }
      };
    } catch (error) {
      console.error('SES quota error:', error);
      throw new Error(`Failed to get sending quota: ${error.message}`);
    }
  }

  /**
   * Create raw email with attachments
   * @param {object} emailData - Email data
   * @returns {Promise<Buffer>} Raw email data
   */
  async createRawEmail(emailData) {
    const { to, from, subject, htmlBody, textBody, attachments } = emailData;
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36)}`;
    
    let rawEmail = '';
    
    // Headers
    rawEmail += `From: ${from}\r\n`;
    rawEmail += `To: ${Array.isArray(to) ? to.join(', ') : to}\r\n`;
    rawEmail += `Subject: ${subject}\r\n`;
    rawEmail += `MIME-Version: 1.0\r\n`;
    rawEmail += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    
    // Body
    rawEmail += `--${boundary}\r\n`;
    rawEmail += `Content-Type: multipart/alternative; boundary="${boundary}_alt"\r\n\r\n`;
    
    if (textBody) {
      rawEmail += `--${boundary}_alt\r\n`;
      rawEmail += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      rawEmail += `${textBody}\r\n\r\n`;
    }
    
    if (htmlBody) {
      rawEmail += `--${boundary}_alt\r\n`;
      rawEmail += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      rawEmail += `${htmlBody}\r\n\r\n`;
    }
    
    rawEmail += `--${boundary}_alt--\r\n`;
    
    // Attachments
    for (const attachment of attachments) {
      rawEmail += `--${boundary}\r\n`;
      rawEmail += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`;
      rawEmail += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
      rawEmail += `Content-Transfer-Encoding: base64\r\n\r\n`;
      rawEmail += `${attachment.content.toString('base64')}\r\n\r\n`;
    }
    
    rawEmail += `--${boundary}--\r\n`;
    
    return Buffer.from(rawEmail);
  }

  /**
   * Personalize email template with recipient data
   * @param {object} template - Email template
   * @param {object} recipient - Recipient data
   * @returns {object} Personalized template
   */
  personalizeTemplate(template, recipient) {
    const personalizedSubject = template.subject
      .replace(/{{name}}/g, recipient.name)
      .replace(/{{certificateId}}/g, recipient.certificateId);
    
    const personalizedHtmlBody = template.htmlBody
      .replace(/{{name}}/g, recipient.name)
      .replace(/{{certificateId}}/g, recipient.certificateId)
      .replace(/{{email}}/g, recipient.email);
    
    const personalizedTextBody = template.textBody
      .replace(/{{name}}/g, recipient.name)
      .replace(/{{certificateId}}/g, recipient.certificateId)
      .replace(/{{email}}/g, recipient.email);
    
    return {
      subject: personalizedSubject,
      htmlBody: personalizedHtmlBody,
      textBody: personalizedTextBody
    };
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SESService();