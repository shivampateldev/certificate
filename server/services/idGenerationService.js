let CertificateIdLog;
try {
  const models = require('../models');
  CertificateIdLog = models.CertificateIdLog;
} catch (error) {
  console.warn('Models not available, using fallback mode:', error.message);
  CertificateIdLog = null;
}

class IDGenerationService {
  /**
   * Generate unique certificate ID in format SOU-YYYYMMDD-MMM-XXXXX
   * @param {string} eventPrefix - Event prefix (default: 'SOU')
   * @returns {Promise<string>} Generated certificate ID
   */
  async generateUniqueID(eventPrefix = 'SOU') {
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const id = this.generateIDFormat(eventPrefix);
      
      // Check uniqueness in database if available
      if (CertificateIdLog) {
        try {
          const existing = await CertificateIdLog.findOne({
            where: { certificateId: id }
          });
          
          if (!existing) {
            return id;
          }
        } catch (error) {
          console.warn('Database check failed, using in-memory check:', error.message);
          // Fallback to in-memory check
          if (!this.inMemoryIds.has(id)) {
            this.inMemoryIds.add(id);
            return id;
          }
        }
      } else {
        // Fallback to in-memory uniqueness check
        if (!this.inMemoryIds.has(id)) {
          this.inMemoryIds.add(id);
          return id;
        }
      }
      
      attempts++;
    }
    
    throw new Error(`Failed to generate unique ID after ${maxAttempts} attempts`);
  }

  /**
   * Generate certificate ID format: SOU-YYYYMMDD-MMM-XXXXX
   * @param {string} eventPrefix - Event prefix
   * @returns {string} Formatted certificate ID
   */
  generateIDFormat(eventPrefix) {
    const now = new Date();
    
    // Date part: YYYYMMDD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;
    
    // Month abbreviation: MMM
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthAbbr = monthNames[now.getMonth()];
    
    // Random part: XXXXX (5 digits)
    const randomPart = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    
    return `${eventPrefix}-${datePart}-${monthAbbr}-${randomPart}`;
  }

  /**
   * Validate certificate ID format
   * @param {string} certificateId - Certificate ID to validate
   * @returns {boolean} Validation result
   */
  validateIDFormat(certificateId) {
    // Pattern: PREFIX-YYYYMMDD-MMM-XXXXX
    const pattern = /^[A-Z]{2,10}-\d{8}-[A-Z]{3}-\d{5}$/;
    return pattern.test(certificateId);
  }

  /**
   * Check if certificate ID is unique
   * @param {string} certificateId - Certificate ID to check
   * @returns {Promise<boolean>} Uniqueness status
   */
  async validateIDUniqueness(certificateId) {
    try {
      if (CertificateIdLog) {
        const existing = await CertificateIdLog.findOne({
          where: { certificateId }
        });
        return !existing;
      } else {
        // Fallback to in-memory check
        return !this.inMemoryIds.has(certificateId);
      }
    } catch (error) {
      console.error('Error checking ID uniqueness:', error);
      return false;
    }
  }

  /**
   * Generate multiple unique certificate IDs
   * @param {number} count - Number of IDs to generate
   * @param {string} eventPrefix - Event prefix
   * @param {number} batchId - Optional batch ID for logging
   * @returns {Promise<Array>} Array of generated IDs
   */
  async bulkGenerateIDs(count, eventPrefix = 'SOU', batchId = null) {
    const ids = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        const id = await this.generateUniqueID(eventPrefix);
        ids.push(id);
        
        // Log the generated ID
        await this.logGeneratedID(id, batchId, eventPrefix);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    return {
      success: ids.length,
      failed: errors.length,
      ids,
      errors
    };
  }

  /**
   * Log generated certificate ID
   * @param {string} certificateId - Generated certificate ID
   * @param {number} batchId - Optional batch ID
   * @param {string} eventPrefix - Event prefix
   * @returns {Promise<object>} Log entry
   */
  async logGeneratedID(certificateId, batchId = null, eventPrefix = 'SOU') {
    try {
      if (CertificateIdLog) {
        const logEntry = await CertificateIdLog.create({
          certificateId,
          batchId,
          eventPrefix,
          generatedAt: new Date()
        });
        return logEntry;
      } else {
        // Fallback to in-memory storage
        this.inMemoryIds.add(certificateId);
        console.log(`Logged ID: ${certificateId} (batch: ${batchId})`);
        return { certificateId, batchId, eventPrefix };
      }
    } catch (error) {
      console.error('Error logging generated ID:', error);
      // Don't throw error in fallback mode, just log it
      this.inMemoryIds.add(certificateId);
      return { certificateId, batchId, eventPrefix, error: error.message };
    }
  }

  /**
   * Get ID generation statistics
   * @param {object} dateRange - Optional date range filter
   * @returns {Promise<object>} Generation statistics
   */
  async getIDGenerationStats(dateRange = {}) {
    try {
      if (CertificateIdLog) {
        const whereClause = {};
        
        if (dateRange.startDate) {
          whereClause.generatedAt = {
            ...whereClause.generatedAt,
            [require('sequelize').Op.gte]: new Date(dateRange.startDate)
          };
        }
        
        if (dateRange.endDate) {
          whereClause.generatedAt = {
            ...whereClause.generatedAt,
            [require('sequelize').Op.lte]: new Date(dateRange.endDate)
          };
        }

        const totalCount = await CertificateIdLog.count({ where: whereClause });
        
        // Get counts by event prefix
        const prefixCounts = await CertificateIdLog.findAll({
          where: whereClause,
          attributes: [
            'eventPrefix',
            [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
          ],
          group: ['eventPrefix']
        });

        return {
          total: totalCount,
          byPrefix: prefixCounts.reduce((acc, item) => {
            acc[item.eventPrefix] = parseInt(item.dataValues.count);
            return acc;
          }, {}),
          inMemoryCount: this.inMemoryIds.size
        };
      } else {
        return {
          total: this.inMemoryIds.size,
          byPrefix: { 'SOU': this.inMemoryIds.size },
          inMemoryCount: this.inMemoryIds.size
        };
      }
    } catch (error) {
      console.error('Error getting ID generation stats:', error);
      return {
        total: 0,
        byPrefix: {},
        inMemoryCount: this.inMemoryIds.size,
        error: error.message
      };
    }
  }

  /**
   * Parse certificate ID components
   * @param {string} certificateId - Certificate ID to parse
   * @returns {object} Parsed components
   */
  parseID(certificateId) {
    if (!this.validateIDFormat(certificateId)) {
      throw new Error('Invalid certificate ID format');
    }

    const parts = certificateId.split('-');
    const [prefix, datePart, monthAbbr, randomPart] = parts;

    const year = parseInt(datePart.substring(0, 4));
    const month = parseInt(datePart.substring(4, 6));
    const day = parseInt(datePart.substring(6, 8));

    return {
      prefix,
      date: {
        year,
        month,
        day,
        formatted: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      },
      monthAbbr,
      randomPart,
      generatedDate: new Date(year, month - 1, day)
    };
  }

  /**
   * Evaluate a custom ID pattern string for a specific recipient
   */
  generateCustomCertificateId(pattern, nameVal = '', row = {}) {
    if (!pattern) return '';
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    let result = pattern;

    // Helper for pure JS UUID
    const uuidv4 = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // 1. Replace {{uuid}}
    result = result.replace(/\{\{\s*uuid\s*\}\}/gi, () => uuidv4());

    // 2. Replace {{year}}
    result = result.replace(/\{\{\s*year\s*\}\}/gi, () => year);

    // 3. Replace {{month}}
    result = result.replace(/\{\{\s*month\s*\}\}/gi, () => month);

    // 4. Replace {{day}}
    result = result.replace(/\{\{\s*day\s*\}\}/gi, () => day);

    // 5. Replace {{column_name(start, end)}}
    result = result.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*\}\}/gi, (match, colName, start, end) => {
      const s = parseInt(start);
      const e = parseInt(end);
      const matchKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9_]/g, '') === colName.toLowerCase().replace(/[^a-z0-9_]/g, ''));
      let val = matchKey ? row[matchKey] : '';
      if (!val && colName.toLowerCase() === 'name') {
        val = nameVal;
      }
      if (!val) return '';
      const slice = String(val).substring(s, e);
      return slice.charAt(0).toUpperCase() + slice.slice(1);
    });

    // 6. Replace {{random_number(digits)}}
    result = result.replace(/\{\{\s*random_number\s*\(\s*(\d+)\s*\)\s*\}\}/gi, (match, digits) => {
      const len = parseInt(digits) || 6;
      let numStr = '';
      for (let i = 0; i < len; i++) {
        numStr += Math.floor(Math.random() * 10).toString();
      }
      return numStr;
    });

    // 7. Replace {{column_name}} (Full column value)
    result = result.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gi, (match, colName) => {
      const lower = colName.toLowerCase();
      if (['uuid', 'year', 'month', 'day'].includes(lower)) return match;
      
      const matchKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9_]/g, '') === lower.replace(/[^a-z0-9_]/g, ''));
      let val = matchKey ? row[matchKey] : '';
      if (!val && lower === 'name') {
        val = nameVal;
      }
      return val ? String(val) : '';
    });

    return result;
  }

  /**
   * Validate standard custom patterns and flag syntax typos
   */
  validateIdPattern(pattern) {
    if (!pattern) return true;
    const doubleBracesRegex = /\{\{([^}]+)\}\}/g;
    let match;
    const allowedPatterns = [
      /^uuid$/i,
      /^year$/i,
      /^month$/i,
      /^day$/i,
      /^[a-zA-Z0-9_]+\(\s*\d+\s*,\s*\d+\s*\)$/i,
      /^random_number\(\s*\d+\s*\)$/i,
      /^[a-zA-Z0-9_]+$/i
    ];

    while ((match = doubleBracesRegex.exec(pattern)) !== null) {
      const token = match[1].trim();
      let isAllowed = false;
      for (const regex of allowedPatterns) {
        if (regex.test(token)) {
          isAllowed = true;
          break;
        }
      }
      if (!isAllowed) {
        throw new Error(`Invalid or unsupported token: "${token}"`);
      }
    }
    return true;
  }

  constructor() {
    this.inMemoryIds = new Set();
  }
}

module.exports = new IDGenerationService();