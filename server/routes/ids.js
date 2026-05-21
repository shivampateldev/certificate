const express = require('express');
const idGenerationService = require('../services/idGenerationService');

const router = express.Router();

/**
 * Generate single certificate ID
 */
router.post('/generate', async (req, res) => {
  try {
    const { eventPrefix = 'SOU', batchId } = req.body || {};
    
    const certificateId = await idGenerationService.generateUniqueID(eventPrefix);
    
    // Log the generated ID
    await idGenerationService.logGeneratedID(certificateId, batchId, eventPrefix);
    
    res.json({
      success: true,
      certificateId,
      eventPrefix,
      batchId
    });
  } catch (error) {
    console.error('Error generating ID:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate multiple certificate IDs
 */
router.post('/bulk-generate', async (req, res) => {
  try {
    const { count, eventPrefix = 'SOU', batchId } = req.body || {};
    
    if (!count || count <= 0 || count > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Count must be between 1 and 1000'
      });
    }
    
    const result = await idGenerationService.bulkGenerateIDs(count, eventPrefix, batchId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error bulk generating IDs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Validate certificate ID uniqueness
 */
router.get('/validate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate format
    const isValidFormat = idGenerationService.validateIDFormat(id);
    if (!isValidFormat) {
      return res.json({
        success: true,
        valid: false,
        unique: false,
        reason: 'Invalid ID format'
      });
    }
    
    // Check uniqueness
    const isUnique = await idGenerationService.validateIDUniqueness(id);
    
    res.json({
      success: true,
      valid: isValidFormat,
      unique: isUnique,
      certificateId: id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Parse certificate ID components
 */
router.get('/parse/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const components = idGenerationService.parseID(id);
    
    res.json({
      success: true,
      certificateId: id,
      components
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get ID generation statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;
    
    const stats = await idGenerationService.getIDGenerationStats(dateRange);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;