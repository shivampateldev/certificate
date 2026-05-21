const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Participant, Batch } = require('../models');
const idGenerationService = require('./idGenerationService');

/**
 * Validate participant data structure
 */
function validateParticipantData(data) {
  const errors = [];
  const validatedData = [];

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No valid data found in file');
  }

  data.forEach((row, index) => {
    const rowErrors = [];
    const participant = {};

    // Validate Sr_no (optional)
    if (row.Sr_no !== undefined && row.Sr_no !== null && row.Sr_no !== '') {
      const srNo = parseInt(row.Sr_no);
      if (isNaN(srNo) || srNo < 0) {
        rowErrors.push({
          field: 'Sr_no',
          value: row.Sr_no,
          constraint: 'Must be a positive number',
          message: 'Invalid Sr_no: must be a positive number'
        });
      } else {
        participant.srNo = srNo;
      }
    }

    // Validate Name (required)
    if (!row.Name || typeof row.Name !== 'string' || row.Name.trim().length === 0) {
      rowErrors.push({
        field: 'Name',
        value: row.Name,
        constraint: 'Required non-empty string',
        message: 'Name is required and must be a non-empty string'
      });
    } else {
      const name = row.Name.trim();
      if (name.length > 255) {
        rowErrors.push({
          field: 'Name',
          value: name,
          constraint: 'Maximum 255 characters',
          message: 'Name must not exceed 255 characters'
        });
      } else {
        participant.name = name;
      }
    }

    // Validate Email (required)
    if (!row.Email || typeof row.Email !== 'string') {
      rowErrors.push({
        field: 'Email',
        value: row.Email,
        constraint: 'Required string',
        message: 'Email is required'
      });
    } else {
      const email = row.Email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        rowErrors.push({
          field: 'Email',
          value: email,
          constraint: 'Valid email format',
          message: 'Invalid email format'
        });
      } else if (email.length > 255) {
        rowErrors.push({
          field: 'Email',
          value: email,
          constraint: 'Maximum 255 characters',
          message: 'Email must not exceed 255 characters'
        });
      } else {
        participant.email = email;
      }
    }

    // Certificate_ID will be generated if not provided
    if (row.Certificate_ID && typeof row.Certificate_ID === 'string') {
      const certificateId = row.Certificate_ID.trim();
      if (certificateId.length > 50) {
        rowErrors.push({
          field: 'Certificate_ID',
          value: certificateId,
          constraint: 'Maximum 50 characters',
          message: 'Certificate ID must not exceed 50 characters'
        });
      } else {
        participant.certificateId = certificateId;
      }
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: index + 1,
        data: row,
        errors: rowErrors
      });
    } else {
      validatedData.push(participant);
    }
  });

  return { validatedData, errors };
}

/**
 * Parse CSV file
 */
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Parse Excel file
 */
function parseExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Process uploaded file and validate participant data
 */
async function processParticipantFile(filePath, fileType) {
  try {
    let rawData;

    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('Uploaded file not found');
    }

    // Parse file based on type
    if (fileType === 'csv') {
      rawData = await parseCSVFile(filePath);
    } else if (fileType === 'excel') {
      rawData = parseExcelFile(filePath);
    } else {
      throw new Error('Unsupported file type. Only CSV and Excel files are supported.');
    }

    // Check if file has data
    if (!rawData || rawData.length === 0) {
      throw new Error('File contains no data or is empty');
    }

    // Validate the parsed data
    const { validatedData, errors } = validateParticipantData(rawData);

    // Generate certificate IDs for participants who don't have them
    const participantsWithIds = await Promise.all(
      validatedData.map(async (participant, index) => {
        if (!participant.certificateId) {
          try {
            participant.certificateId = await idGenerationService.generateUniqueID();
          } catch (idError) {
            console.error('Failed to generate certificate ID:', idError);
            // Use fallback ID generation if service fails
            participant.certificateId = `SOU-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(index + 1).padStart(3, '0')}-${Date.now().toString().slice(-5)}`;
          }
        }
        
        // Add sequential Sr_no if not provided
        if (!participant.srNo) {
          participant.srNo = index + 1;
        }
        
        return participant;
      })
    );

    return {
      participants: participantsWithIds,
      errors,
      totalRows: rawData.length,
      validRows: participantsWithIds.length,
      errorRows: errors.length
    };

  } catch (error) {
    throw new Error(`File processing failed: ${error.message}`);
  } finally {
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }
  }
}

/**
 * Save participants to database
 */
async function saveParticipantsToBatch(participants, batchData) {
  try {
    // Create batch first
    const batch = await Batch.create({
      name: batchData.name || `Batch-${Date.now()}`,
      eventCategories: batchData.eventCategories || ['Technical'],
      templateId: batchData.templateId || null,
      totalParticipants: participants.length,
      status: 'pending'
    });

    // Generate certificate IDs and save participants
    const savedParticipants = await Promise.all(
      participants.map(async (participant) => {
        // Generate unique certificate ID if not provided
        const certificateId = participant.certificateId || await idGenerationService.generateUniqueID();
        
        return Participant.create({
          ...participant,
          certificateId,
          batchId: batch.id
        });
      })
    );

    return {
      batch,
      participants: savedParticipants
    };

  } catch (error) {
    throw new Error(`Failed to save participants: ${error.message}`);
  }
}

/**
 * Get participants by batch ID
 */
async function getParticipantsByBatch(batchId) {
  try {
    const participants = await Participant.findAll({
      where: { batchId },
      order: [['srNo', 'ASC'], ['createdAt', 'ASC']]
    });

    return participants;
  } catch (error) {
    throw new Error(`Failed to retrieve participants: ${error.message}`);
  }
}

/**
 * Update participant data
 */
async function updateParticipant(participantId, updateData) {
  try {
    const participant = await Participant.findByPk(participantId);
    
    if (!participant) {
      throw new Error('Participant not found');
    }

    // Validate update data
    const validatedUpdate = {};
    
    if (updateData.name !== undefined) {
      if (!updateData.name || updateData.name.trim().length === 0) {
        throw new Error('Name cannot be empty');
      }
      validatedUpdate.name = updateData.name.trim();
    }

    if (updateData.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        throw new Error('Invalid email format');
      }
      validatedUpdate.email = updateData.email.trim().toLowerCase();
    }

    if (updateData.srNo !== undefined) {
      const srNo = parseInt(updateData.srNo);
      if (isNaN(srNo) || srNo < 0) {
        throw new Error('Sr_no must be a positive number');
      }
      validatedUpdate.srNo = srNo;
    }

    await participant.update(validatedUpdate);
    return participant.reload();

  } catch (error) {
    throw new Error(`Failed to update participant: ${error.message}`);
  }
}

/**
 * Export participants to CSV
 */
function exportParticipantsToCSV(participants) {
  const headers = ['Sr_no', 'Name', 'Email', 'Certificate_ID'];
  const csvData = [headers];

  participants.forEach(participant => {
    csvData.push([
      participant.srNo || '',
      participant.name || '',
      participant.email || '',
      participant.certificateId || ''
    ]);
  });

  return csvData.map(row => row.join(',')).join('\n');
}

/**
 * Export participants to Excel
 */
function exportParticipantsToExcel(participants) {
  const worksheetData = participants.map(participant => ({
    Sr_no: participant.srNo || '',
    Name: participant.name || '',
    Email: participant.email || '',
    Certificate_ID: participant.certificateId || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  processParticipantFile,
  saveParticipantsToBatch,
  getParticipantsByBatch,
  updateParticipant,
  exportParticipantsToCSV,
  exportParticipantsToExcel,
  validateParticipantData
};