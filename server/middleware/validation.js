const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Validation middleware for participant data uploads
 */

// Configure multer for participant file uploads
const participantStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/participants/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `participants-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter for participant uploads
const participantFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isValidExtension = allowedExtensions.includes(fileExtension);
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
  
  if (isValidExtension || isValidMimeType) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only CSV and Excel files (.csv, .xlsx, .xls) are allowed');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Multer configuration for participant uploads
const participantUpload = multer({
  storage: participantStorage,
  fileFilter: participantFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

/**
 * Middleware to validate participant data structure
 */
const validateParticipantData = (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No participant file uploaded',
          details: 'Please select a CSV or Excel file containing participant data'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate file size
    if (req.file.size === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_FILE',
          message: 'Uploaded file is empty',
          details: 'Please ensure the file contains participant data'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate file extension
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_EXTENSION',
          message: 'Invalid file extension',
          details: `File must have one of the following extensions: ${allowedExtensions.join(', ')}`
        },
        timestamp: new Date().toISOString()
      });
    }

    // Add file type to request for processing
    if (fileExtension === '.csv') {
      req.fileType = 'csv';
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      req.fileType = 'excel';
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'File validation failed',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Error handling middleware for multer errors
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds limit',
            details: 'Maximum file size allowed is 10MB'
          },
          timestamp: new Date().toISOString()
        });
      
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Too many files uploaded',
            details: 'Only one file can be uploaded at a time'
          },
          timestamp: new Date().toISOString()
        });
      
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNEXPECTED_FILE',
            message: 'Unexpected file field',
            details: 'File must be uploaded using the "participantFile" field'
          },
          timestamp: new Date().toISOString()
        });
      
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File upload failed',
            details: error.message
          },
          timestamp: new Date().toISOString()
        });
    }
  }

  // Handle custom file filter errors
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message,
        details: 'Supported formats: CSV (.csv), Excel (.xlsx, .xls)'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Pass other errors to the next error handler
  next(error);
};

/**
 * Middleware to validate request body for batch creation
 */
const validateBatchData = (req, res, next) => {
  try {
    const { participants, batchData } = req.body;

    // Validate participants array
    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARTICIPANTS_DATA',
          message: 'Participants data is required and must be an array',
          details: 'Please provide a valid array of participant objects'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_PARTICIPANTS_ARRAY',
          message: 'Participants array cannot be empty',
          details: 'At least one participant is required to create a batch'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate each participant object
    const participantErrors = [];
    participants.forEach((participant, index) => {
      const errors = [];

      if (!participant.name || typeof participant.name !== 'string' || participant.name.trim().length === 0) {
        errors.push('Name is required and must be a non-empty string');
      }

      if (!participant.email || typeof participant.email !== 'string') {
        errors.push('Email is required');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(participant.email.trim())) {
          errors.push('Invalid email format');
        }
      }

      if (participant.srNo !== undefined && (isNaN(parseInt(participant.srNo)) || parseInt(participant.srNo) < 0)) {
        errors.push('Sr_no must be a positive number');
      }

      if (errors.length > 0) {
        participantErrors.push({
          index: index + 1,
          participant: participant,
          errors: errors
        });
      }
    });

    if (participantErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PARTICIPANT_VALIDATION_ERROR',
          message: 'Some participants have validation errors',
          details: 'Please fix the validation errors and try again'
        },
        validationErrors: participantErrors,
        timestamp: new Date().toISOString()
      });
    }

    // Validate batch data (optional)
    if (batchData) {
      if (batchData.eventCategories && !Array.isArray(batchData.eventCategories)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EVENT_CATEGORIES',
            message: 'Event categories must be an array',
            details: 'Please provide event categories as an array of strings'
          },
          timestamp: new Date().toISOString()
        });
      }

      const validCategories = ['Technical', 'Non-technical', 'Spiritual', 'Administrative', 'Humanitarian', 'STEM'];
      if (batchData.eventCategories) {
        const invalidCategories = batchData.eventCategories.filter(cat => !validCategories.includes(cat));
        if (invalidCategories.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_EVENT_CATEGORY',
              message: 'Invalid event categories provided',
              details: `Valid categories are: ${validCategories.join(', ')}`
            },
            invalidCategories: invalidCategories,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_VALIDATION_ERROR',
        message: 'Batch data validation failed',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  participantUpload,
  validateParticipantData,
  handleMulterError,
  validateBatchData
};