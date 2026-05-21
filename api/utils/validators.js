/**
 * Validation utilities for data integrity
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Validators = {
  /**
   * Validate email format
   */
  isValidEmail(email) {
    return EMAIL_REGEX.test(email);
  },

  /**
   * Validate participant data
   */
  validateParticipant(participant) {
    const errors = [];

    if (!participant.name || typeof participant.name !== 'string' || participant.name.trim() === '') {
      errors.push('Name is required and must be a non-empty string');
    }

    if (!participant.email || typeof participant.email !== 'string' || participant.email.trim() === '') {
      errors.push('Email is required and must be a non-empty string');
    } else if (!this.isValidEmail(participant.email)) {
      errors.push(`Invalid email format: ${participant.email}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate batch data
   */
  validateBatch(batch) {
    const errors = [];

    if (!batch.batch_name || typeof batch.batch_name !== 'string' || batch.batch_name.trim() === '') {
      errors.push('Batch name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate template data
   */
  validateTemplate(template) {
    const errors = [];

    if (!template.template_name || typeof template.template_name !== 'string') {
      errors.push('Template name is required');
    }

    if (!template.file_type || !['png', 'pdf'].includes(template.file_type.toLowerCase())) {
      errors.push('File type must be PNG or PDF');
    }

    if (!template.file_path || typeof template.file_path !== 'string') {
      errors.push('File path is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate template field data
   */
  validateTemplateField(field) {
    const errors = [];

    if (!field.field_name || typeof field.field_name !== 'string') {
      errors.push('Field name is required');
    }

    if (typeof field.x !== 'number' || typeof field.y !== 'number') {
      errors.push('X and Y coordinates must be numbers');
    }

    if (typeof field.width !== 'number' || typeof field.height !== 'number') {
      errors.push('Width and height must be numbers');
    }

    if (typeof field.font_size !== 'number' || field.font_size < 8 || field.font_size > 200) {
      errors.push('Font size must be between 8 and 200');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate email campaign data
   */
  validateEmailCampaign(campaign) {
    const errors = [];

    if (!campaign.subject || typeof campaign.subject !== 'string' || campaign.subject.trim() === '') {
      errors.push('Email subject is required');
    }

    if (!campaign.body || typeof campaign.body !== 'string' || campaign.body.trim() === '') {
      errors.push('Email body is required');
    }

    if (!campaign.sender_email || !this.isValidEmail(campaign.sender_email)) {
      errors.push('Valid sender email is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Sanitize filename to prevent path traversal
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, '')
      .substring(0, 255);
  },

  /**
   * Check for duplicate emails in array
   */
  findDuplicateEmails(participants) {
    const emailMap = {};
    const duplicates = [];

    for (const p of participants) {
      const email = p.email.toLowerCase();
      if (emailMap[email]) {
        duplicates.push(email);
      } else {
        emailMap[email] = true;
      }
    }

    return [...new Set(duplicates)];
  },

  /**
   * Check for duplicate certificate IDs in array
   */
  findDuplicateCertificateIds(participants) {
    const idMap = {};
    const duplicates = [];

    for (const p of participants) {
      if (p.certificate_id) {
        const id = p.certificate_id.toString();
        if (idMap[id]) {
          duplicates.push(id);
        } else {
          idMap[id] = true;
        }
      }
    }

    return [...new Set(duplicates)];
  }
};

module.exports = Validators;
