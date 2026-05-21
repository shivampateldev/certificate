const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { 
  generateCertificate, 
  processBulkCertificates,
  generateBatchCertificates,
  getBatchGenerationProgress,
  regenerateFailedCertificates
} = require('../services/certificateService');
const { 
  processParticipantFile, 
  saveParticipantsToBatch, 
  getParticipantsByBatch,
  updateParticipant,
  exportParticipantsToCSV,
  exportParticipantsToExcel
} = require('../services/participantService');
const s3Service = require('../services/s3Service');
const {
  participantUpload,
  validateParticipantData,
  handleMulterError,
  validateBatchData
} = require('../middleware/validation');

const router = express.Router();

// Configure multer for template uploads
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/templates/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const templateUpload = multer({ 
  storage: templateStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// Configure multer for Excel file uploads
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/excel/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const excelUpload = multer({ 
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /spreadsheet|csv|excel/.test(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only Excel files (XLSX, XLS, CSV) are allowed'));
    }
  }
});

// Participant upload configuration is now handled by validation middleware

// Root endpoint for certificates API
router.get('/', (req, res) => {
  res.json({
    message: 'Certificates API',
    endpoints: {
      templates: '/api/certificates/templates',
      batches: '/api/certificates/batches',
      'single-generate': '/api/certificates/generate (POST)',
      'bulk-generate': '/api/certificates/bulk-generate (POST)',
      'batch-generate': '/api/certificates/batch/:id/generate (POST)',
      'event-categories': '/api/certificates/event-categories',
      'storage-stats': '/api/certificates/storage/stats'
    },
    status: 'active'
  });
});

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const { Template } = require('../models');
    const { category, isActive } = req.query;
    
    const whereClause = {};
    
    // Only filter by isActive if explicitly provided
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true' ? 1 : 0;
    }
    
    // Filter by category if provided (SQLite compatible)
    if (category) {
      whereClause.categories = {
        [require('sequelize').Op.like]: `%"${category}"%`
      };
    }

    const templates = await Template.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATES_RETRIEVAL_ERROR',
        message: 'Failed to retrieve templates',
        details: error.message
      }
    });
  }
});

// Get template by ID
router.get('/templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_ID',
          message: 'Template ID must be a valid number'
        }
      });
    }

    const { Template } = require('../models');
    const template = await Template.findByPk(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_RETRIEVAL_ERROR',
        message: 'Failed to retrieve template',
        details: error.message
      }
    });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  try {
    const { Template } = require('../models');
    const { name, description, categories, templateData, filePath } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Template name is required'
        }
      });
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one category is required'
        }
      });
    }

    // Validate categories
    const validCategories = ['Technical', 'Non-technical', 'Spiritual', 'Administrative', 'Humanitarian', 'STEM'];
    const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
    
    if (invalidCategories.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid categories: ${invalidCategories.join(', ')}`,
          details: `Valid categories are: ${validCategories.join(', ')}`
        }
      });
    }

    const template = await Template.create({
      name: name.trim(),
      description: description?.trim() || null,
      categories,
      templateData: templateData || null,
      filePath: filePath || null,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_CREATION_ERROR',
        message: 'Failed to create template',
        details: error.message
      }
    });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_ID',
          message: 'Template ID must be a valid number'
        }
      });
    }

    const { Template } = require('../models');
    const template = await Template.findByPk(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }

    const updateData = {};
    const { name, description, categories, templateData, filePath, isActive } = req.body;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template name cannot be empty'
          }
        });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (categories !== undefined) {
      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one category is required'
          }
        });
      }

      const validCategories = ['Technical', 'Non-technical', 'Spiritual', 'Administrative', 'Humanitarian', 'STEM'];
      const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
      
      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid categories: ${invalidCategories.join(', ')}`,
            details: `Valid categories are: ${validCategories.join(', ')}`
          }
        });
      }

      updateData.categories = categories;
    }

    if (templateData !== undefined) {
      updateData.templateData = templateData;
    }

    if (filePath !== undefined) {
      updateData.filePath = filePath;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    await template.update(updateData);
    const updatedTemplate = await template.reload();

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_UPDATE_ERROR',
        message: 'Failed to update template',
        details: error.message
      }
    });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_ID',
          message: 'Template ID must be a valid number'
        }
      });
    }

    const { Template, Batch } = require('../models');
    const template = await Template.findByPk(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }

    // Check if template is being used by any batches
    const batchCount = await Batch.count({ where: { templateId } });
    
    if (batchCount > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEMPLATE_IN_USE',
          message: 'Cannot delete template that is being used by existing batches',
          details: `Template is used by ${batchCount} batch(es)`
        }
      });
    }

    await template.destroy();

    res.json({
      success: true,
      message: 'Template deleted successfully',
      data: {
        deletedTemplateId: templateId
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_DELETION_ERROR',
        message: 'Failed to delete template',
        details: error.message
      }
    });
  }
});

// Get event categories
router.get('/event-categories', (req, res) => {
  try {
    const categories = [
      { value: 'Technical', label: 'Technical', description: 'Technical workshops, coding sessions, and tech talks' },
      { value: 'Non-technical', label: 'Non-technical', description: 'Soft skills, leadership, and general workshops' },
      { value: 'Spiritual', label: 'Spiritual', description: 'Religious and spiritual development activities' },
      { value: 'Administrative', label: 'Administrative', description: 'Organizational and administrative tasks' },
      { value: 'Humanitarian', label: 'Humanitarian', description: 'Community service and humanitarian activities' },
      { value: 'STEM', label: 'STEM', description: 'Science, Technology, Engineering, and Mathematics activities' }
    ];

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORIES_RETRIEVAL_ERROR',
        message: 'Failed to retrieve event categories',
        details: error.message
      }
    });
  }
});

// Upload certificate template
router.post('/upload-template', templateUpload.single('template'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No template file uploaded' });
    }
    
    res.json({
      message: 'Template uploaded successfully',
      templatePath: req.file.path,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload and process participant data
router.post('/upload', 
  participantUpload.single('participantFile'),
  handleMulterError,
  validateParticipantData,
  async (req, res) => {
    try {
      // Process the file using the file type determined by validation middleware
      const result = await processParticipantFile(req.file.path, req.fileType);

      // If there are validation errors but some valid data, return partial success
      if (result.errors.length > 0 && result.participants.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'File processed with some validation errors',
          data: {
            participants: result.participants,
            summary: {
              totalRows: result.totalRows,
              validRows: result.validRows,
              errorRows: result.errorRows
            },
            validationErrors: result.errors
          },
          timestamp: new Date().toISOString(),
          requestId: req.id || `req-${Date.now()}`
        });
      }

      // If all data is invalid
      if (result.participants.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_VALID_DATA',
            message: 'No valid participant data found',
            details: 'All rows contain validation errors. Please check your data format and try again.'
          },
          validationErrors: result.errors,
          timestamp: new Date().toISOString(),
          requestId: req.id || `req-${Date.now()}`
        });
      }

      // Success - all data is valid
      res.json({
        success: true,
        message: 'File processed successfully',
        data: {
          participants: result.participants,
          summary: {
            totalRows: result.totalRows,
            validRows: result.validRows,
            errorRows: result.errorRows
          }
        },
        timestamp: new Date().toISOString(),
        requestId: req.id || `req-${Date.now()}`
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Failed to process participant file',
          details: error.message
        },
        timestamp: new Date().toISOString(),
        requestId: req.id || `req-${Date.now()}`
      });
    }
  }
);

// Generate single certificate
router.post('/generate', async (req, res) => {
  try {
    const { templatePath, name, certificateId, textConfig, category = 'Technical' } = req.body;
    
    const result = await generateCertificate({
      templatePath,
      name,
      certificateId,
      textConfig,
      category
    });
    
    res.json({
      message: 'Certificate generated successfully',
      localPath: result.localPath,
      cloudUrl: result.cloudUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process bulk certificates
router.post('/bulk-generate', excelUpload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }
    
    const { templatePath, textConfig } = req.body;
    
    if (!templatePath) {
      return res.status(400).json({ error: 'Template path is required' });
    }
    
    if (!textConfig) {
      return res.status(400).json({ error: 'Text configuration is required' });
    }
    
    let parsedTextConfig;
    try {
      parsedTextConfig = JSON.parse(textConfig);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid text configuration JSON' });
    }
    
    const results = await processBulkCertificates({
      excelPath: req.file.path,
      templatePath,
      textConfig: parsedTextConfig
    });
    
    res.json({
      message: 'Bulk certificates generated successfully',
      results
    });
  } catch (error) {
    console.error('Bulk generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all batches
router.get('/batches', async (req, res) => {
  try {
    const { Batch, Template } = require('../models');
    const { page = 1, limit = 10, status, eventCategory } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }
    
    // Filter by event category if provided
    if (eventCategory) {
      whereClause.eventCategories = {
        [require('sequelize').Op.contains]: [eventCategory]
      };
    }

    const { count, rows: batches } = await Batch.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Template,
          as: 'template',
          attributes: ['id', 'name', 'description', 'categories']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      success: true,
      data: {
        batches,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCHES_RETRIEVAL_ERROR',
        message: 'Failed to retrieve batches',
        details: error.message
      }
    });
  }
});

// Create batch with participants
router.post('/batch', validateBatchData, async (req, res) => {
  try {
    const { participants, batchData } = req.body;

    const result = await saveParticipantsToBatch(participants, batchData);

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: {
        batch: result.batch,
        participantCount: result.participants.length
      },
      timestamp: new Date().toISOString(),
      requestId: req.id || `req-${Date.now()}`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_CREATION_ERROR',
        message: 'Failed to create batch',
        details: error.message
      },
      timestamp: new Date().toISOString(),
      requestId: req.id || `req-${Date.now()}`
    });
  }
});

// Get batch with participants
router.get('/batch/:id', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    const { Batch, Template } = require('../models');
    
    // Get batch with template information
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Template,
          as: 'template',
          attributes: ['id', 'name', 'description', 'categories']
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found'
        }
      });
    }

    const participants = await getParticipantsByBatch(batchId);

    res.json({
      success: true,
      data: {
        batch,
        participants,
        count: participants.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_RETRIEVAL_ERROR',
        message: 'Failed to retrieve batch',
        details: error.message
      }
    });
  }
});

// Update batch
router.put('/batch/:id', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    const { Batch } = require('../models');
    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found'
        }
      });
    }

    // Validate update data
    const updateData = {};
    const { name, eventCategories, templateId, status } = req.body;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Batch name cannot be empty'
          }
        });
      }
      updateData.name = name.trim();
    }

    if (eventCategories !== undefined) {
      if (!Array.isArray(eventCategories) || eventCategories.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Event categories must be a non-empty array'
          }
        });
      }
      
      const validCategories = ['Technical', 'Non-technical', 'Spiritual', 'Administrative', 'Humanitarian', 'STEM'];
      const invalidCategories = eventCategories.filter(cat => !validCategories.includes(cat));
      
      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid event categories: ${invalidCategories.join(', ')}`,
            details: `Valid categories are: ${validCategories.join(', ')}`
          }
        });
      }
      
      updateData.eventCategories = eventCategories;
    }

    if (templateId !== undefined) {
      if (templateId !== null) {
        const templateIdNum = parseInt(templateId);
        if (isNaN(templateIdNum)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Template ID must be a valid number or null'
            }
          });
        }
        updateData.templateId = templateIdNum;
      } else {
        updateData.templateId = null;
      }
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
          }
        });
      }
      updateData.status = status;
    }

    await batch.update(updateData);
    const updatedBatch = await batch.reload();

    res.json({
      success: true,
      message: 'Batch updated successfully',
      data: updatedBatch
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_UPDATE_ERROR',
        message: 'Failed to update batch',
        details: error.message
      }
    });
  }
});

// Delete batch
router.delete('/batch/:id', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    const { Batch, Participant } = require('../models');
    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found'
        }
      });
    }

    // Check if batch has participants
    const participantCount = await Participant.count({ where: { batchId } });
    
    if (participantCount > 0) {
      // Delete all participants first
      await Participant.destroy({ where: { batchId } });
    }

    // Delete the batch
    await batch.destroy();

    res.json({
      success: true,
      message: 'Batch deleted successfully',
      data: {
        deletedBatchId: batchId,
        deletedParticipants: participantCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_DELETION_ERROR',
        message: 'Failed to delete batch',
        details: error.message
      }
    });
  }
});

// Update participant
router.put('/participant/:id', async (req, res) => {
  try {
    const participantId = parseInt(req.params.id);
    
    if (isNaN(participantId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARTICIPANT_ID',
          message: 'Participant ID must be a valid number'
        }
      });
    }

    const updatedParticipant = await updateParticipant(participantId, req.body);

    res.json({
      success: true,
      message: 'Participant updated successfully',
      data: updatedParticipant
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PARTICIPANT_UPDATE_ERROR',
        message: 'Failed to update participant',
        details: error.message
      }
    });
  }
});

// Export participants as CSV
router.get('/batch/:id/export/csv', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    const participants = await getParticipantsByBatch(batchId);
    const csvData = exportParticipantsToCSV(participants);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="participants-batch-${batchId}.csv"`);
    res.send(csvData);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: 'Failed to export participants as CSV',
        details: error.message
      }
    });
  }
});

// Export participants as Excel
router.get('/batch/:id/export/excel', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    const participants = await getParticipantsByBatch(batchId);
    const excelBuffer = exportParticipantsToExcel(participants);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="participants-batch-${batchId}.xlsx"`);
    res.send(excelBuffer);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: 'Failed to export participants as Excel',
        details: error.message
      }
    });
  }
});

// Generate certificates for a batch
router.post('/batch/:id/generate', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);

    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    // Start certificate generation (this will run asynchronously)
    const results = await generateBatchCertificates(batchId, (progress) => {
      // In a real application, you might want to emit progress via WebSocket
      console.log(`Batch ${batchId} progress:`, progress);
    });

    res.json({
      success: true,
      message: 'Certificate generation completed',
      data: {
        batchId: batchId,
        totalParticipants: results.totalParticipants,
        successful: results.successful,
        failed: results.failed,
        certificates: results.certificates,
        errors: results.errors
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATE_GENERATION_ERROR',
        message: 'Failed to generate certificates',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Get certificate generation progress for a batch
router.get('/batch/:id/progress', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    const progress = await getBatchGenerationProgress(batchId);

    res.json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Progress retrieval error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'PROGRESS_RETRIEVAL_ERROR',
        message: 'Failed to retrieve certificate generation progress',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Regenerate failed certificates in a batch
router.post('/batch/:id/regenerate', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    const results = await regenerateFailedCertificates(batchId, (progress) => {
      console.log(`Batch ${batchId} regeneration progress:`, progress);
    });

    res.json({
      success: true,
      message: 'Certificate regeneration completed',
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Certificate regeneration error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATE_REGENERATION_ERROR',
        message: 'Failed to regenerate certificates',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Get certificates stored in S3 for a batch
router.get('/batch/:id/s3-certificates', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    // Get batch to determine category
    const { Batch } = require('../models');
    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found'
        }
      });
    }

    const category = batch.eventCategories[0] || 'Technical';
    const certificates = await s3Service.getBatchCertificates(batchId, category);

    res.json({
      success: true,
      data: certificates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('S3 certificates retrieval error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'S3_RETRIEVAL_ERROR',
        message: 'Failed to retrieve certificates from S3',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Generate download URLs for batch certificates
router.post('/batch/:id/download-urls', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    const { certificateIds, expiresIn = 3600 } = req.body;
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    // Get batch to determine category
    const { Batch } = require('../models');
    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found'
        }
      });
    }

    const category = batch.eventCategories[0] || 'Technical';
    const certificatePath = s3Service.getCertificatePath(batchId, category);

    // Generate S3 keys for requested certificates
    let certificateKeys;
    if (certificateIds && Array.isArray(certificateIds)) {
      certificateKeys = certificateIds.map(id => `${certificatePath}${id}.pdf`);
    } else {
      // Get all certificates for the batch
      const batchCertificates = await s3Service.getBatchCertificates(batchId, category);
      certificateKeys = batchCertificates.certificates.map(cert => cert.key);
    }

    const downloadUrls = await s3Service.generateBatchDownloadUrls(certificateKeys, expiresIn);

    res.json({
      success: true,
      data: {
        batchId,
        category,
        downloadUrls,
        expiresIn,
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Download URLs generation error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_URL_ERROR',
        message: 'Failed to generate download URLs',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Delete certificates from S3 for a batch
router.delete('/batch/:id/s3-certificates', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_ID',
          message: 'Batch ID must be a valid number'
        }
      });
    }

    // Get batch to determine category
    const { Batch } = require('../models');
    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found'
        }
      });
    }

    const category = batch.eventCategories[0] || 'Technical';
    const deleteResult = await s3Service.deleteBatchCertificates(batchId, category);

    // Update participants to remove cloud URLs
    if (deleteResult.success) {
      const { Participant } = require('../models');
      await Participant.update(
        { cloudUrl: null },
        { where: { batchId } }
      );
    }

    res.json({
      success: true,
      data: deleteResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('S3 certificates deletion error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'S3_DELETION_ERROR',
        message: 'Failed to delete certificates from S3',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Get S3 storage statistics
router.get('/storage/stats', async (req, res) => {
  try {
    const stats = await s3Service.getCertificateStorageStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Storage stats error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'STORAGE_STATS_ERROR',
        message: 'Failed to retrieve storage statistics',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Setup S3 lifecycle policy
router.post('/storage/setup-lifecycle', async (req, res) => {
  try {
    const result = await s3Service.setupCertificateLifecycle();

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lifecycle setup error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'LIFECYCLE_SETUP_ERROR',
        message: 'Failed to setup S3 lifecycle policy',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Download individual certificate by Certificate ID
router.get('/download/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    if (!certificateId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Certificate ID is required'
        }
      });
    }

    // Find participant by certificate ID
    const { Participant } = require('../models');
    const participant = await Participant.findOne({
      where: { certificateId }
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_NOT_FOUND',
          message: 'Certificate not found'
        }
      });
    }

    // Check if certificate file exists locally
    if (participant.certificatePath && fs.existsSync(participant.certificatePath)) {
      // Download from local storage
      res.download(participant.certificatePath, `${certificateId}.pdf`, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: {
                code: 'DOWNLOAD_ERROR',
                message: 'Failed to download certificate'
              }
            });
          }
        }
      });
    } else if (participant.cloudUrl) {
      // Redirect to cloud URL or generate signed URL
      try {
        const { Batch } = require('../models');
        const batch = await Batch.findByPk(participant.batchId);
        const category = batch ? batch.eventCategories[0] || 'Technical' : 'Technical';
        
        // Generate signed URL for download
        const signedUrl = await s3Service.generateDownloadUrl(
          s3Service.getCertificatePath(participant.batchId, category) + `${certificateId}.pdf`,
          3600 // 1 hour expiry
        );
        
        res.redirect(signedUrl);
      } catch (error) {
        console.error('S3 download error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'S3_DOWNLOAD_ERROR',
            message: 'Failed to generate download URL from cloud storage'
          }
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_FILE_NOT_FOUND',
          message: 'Certificate file not found in local or cloud storage'
        }
      });
    }

  } catch (error) {
    console.error('Certificate download error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: 'Failed to download certificate',
        details: error.message
      }
    });
  }
});

// Download certificates as ZIP
router.post('/download-zip', async (req, res) => {
  try {
    const { certificates } = req.body;
    
    if (!certificates || !Array.isArray(certificates)) {
      return res.status(400).json({ error: 'Certificates array is required' });
    }

    // Create ZIP file
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment('certificates.zip');
    archive.pipe(res);

    // Add each certificate to the ZIP using Certificate ID as filename
    certificates.forEach((cert, index) => {
      const certPath = cert.localPath || cert.certificatePath;
      if (certPath && fs.existsSync(certPath)) {
        // Use Certificate ID as filename, fallback to participant name or index
        const certificateId = cert.certificateId || cert.Certificate_ID;
        const fileName = certificateId ? `${certificateId}.pdf` : 
                        cert.name ? `${cert.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf` : 
                        `certificate-${index + 1}.pdf`;
        archive.file(certPath, { name: fileName });
      }
    });

    await archive.finalize();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;