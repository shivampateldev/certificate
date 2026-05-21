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

  constructor() {
    // In-memory set for tracking generated IDs (fallback)
    this.inMemoryIds = new Set();
  }
}

module.exports = new IDGenerationService();