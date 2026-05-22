/**
 * Participants API
 * Handles participant management, CSV uploads, batch creation
 */

const Busboy = require('busboy');
const { ParticipantModel, BatchModel } = require('./models');
const CSVParser = require('./utils/csvParser');
const Validators = require('./utils/validators');
const FileHandler = require('./utils/fileHandler');

module.exports.config = { api: { bodyParser: false } };

// Helper to get request body (compat with Express and Serverless)
async function getRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return req.body;
    }
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlPath = req.url.split('?')[0];
  const { method } = req;

  try {
    // GET /api/participants - List all participants
    if (urlPath === '/api/participants' && method === 'GET') {
      const participants = await ParticipantModel.getAll();
      return res.json({
        success: true,
        data: participants,
        count: participants.length
      });
    }

    // GET /api/participants/:id - Get single participant
    const participantMatch = urlPath.match(/^\/api\/participants\/([^/]+)$/);
    if (participantMatch && method === 'GET') {
      const participant = await ParticipantModel.getById(participantMatch[1]);
      if (!participant) {
        return res.status(404).json({
          success: false,
          error: { message: 'Participant not found' }
        });
      }
      return res.json({ success: true, data: participant });
    }

    // POST /api/participants - Create single participant
    if (urlPath === '/api/participants' && method === 'POST') {
      try {
        const body = await getRequestBody(req);
        const data = body;
        const validation = Validators.validateParticipant(data);
        
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: { message: 'Validation failed', details: validation.errors }
          });
        }

        // Check for duplicate email
        const existing = await ParticipantModel.getByEmail(data.email);
        if (existing) {
          return res.status(400).json({
            success: false,
            error: { message: 'Email already exists' }
          });
        }

        const participant = await ParticipantModel.create(data);
        return res.status(201).json({
          success: true,
          data: participant
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // POST /api/participants/upload - Upload CSV/Excel file
    if (urlPath === '/api/participants/upload' && method === 'POST') {
      return new Promise((resolve) => {
        const busboy = Busboy({ headers: req.headers });
        let fileBuffer = null;
        let fileName = '';
        let batchName = '';

        busboy.on('field', (fieldname, val) => {
          if (fieldname === 'batchName') batchName = val;
        });

        busboy.on('file', (fieldname, file, info) => {
          fileName = info.filename;
          const chunks = [];
          file.on('data', d => chunks.push(d));
          file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
          });
        });

        busboy.on('finish', async () => {
          try {
            if (!fileBuffer) {
              return res.status(400).json({
                success: false,
                error: { message: 'No file uploaded' }
              });
            }

            // Validate file type
            const ext = FileHandler.getFileExtension(fileName).toLowerCase();
            if (!['csv', 'xlsx', 'xls'].includes(ext)) {
              return res.status(400).json({
                success: false,
                error: { message: 'Only CSV, XLSX, and XLS files are supported' }
              });
            }

            // Parse file
            let rawData;
            if (ext === 'csv') {
              rawData = await CSVParser.parseCSV(fileBuffer);
            } else {
              rawData = await CSVParser.parseExcel(fileBuffer);
            }

            if (!rawData || rawData.length === 0) {
              return res.status(400).json({
                success: false,
                error: { message: 'File is empty or invalid' }
              });
            }

            // Normalize data
            const normalized = CSVParser.normalizeParticipants(rawData);

            // Check for duplicates within file
            const duplicateCheck = CSVParser.checkDuplicates(normalized.participants);

            // Check for duplicates in database
            const dbDuplicates = [];
            for (const p of normalized.participants) {
              const existing = await ParticipantModel.getByEmail(p.email);
              if (existing) {
                dbDuplicates.push(p.email);
              }
            }

            return res.json({
              success: true,
              data: {
                preview: normalized.participants.slice(0, 10),
                totalRows: normalized.totalRows,
                successCount: normalized.successCount,
                errorCount: normalized.errorCount,
                errors: normalized.errors,
                duplicates: {
                  inFile: duplicateCheck.duplicates,
                  inDatabase: [...new Set(dbDuplicates)]
                },
                hasDuplicates: duplicateCheck.hasDuplicates || dbDuplicates.length > 0,
                fileName,
                fileData: normalized.participants // Full data for confirmation
              }
            });
          } catch (error) {
            return res.status(500).json({
              success: false,
              error: { message: error.message }
            });
          }
        });

        req.pipe(busboy);
      });
    }

    // POST /api/participants/batch - Create batch and import participants
    if (urlPath === '/api/participants/batch' && method === 'POST') {
      try {
        const body = await getRequestBody(req);
        const { batch_name, event_name, event_date, participants } = body;

        if (!batch_name) {
          return res.status(400).json({
            success: false,
            error: { message: 'Batch name is required' }
          });
        }

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
          return res.status(400).json({
            success: false,
            error: { message: 'Participants array is required and must not be empty' }
          });
        }

        // Create batch
        const batch = await BatchModel.create({
          batch_name,
          event_name,
          event_date,
          participant_count: participants.length
        });

        // Create participants
        const created = await ParticipantModel.bulkCreate(participants, batch.id);

        // Update batch with final count
        await BatchModel.update(batch.id, {
          participant_count: created.length
        });

        return res.status(201).json({
          success: true,
          data: {
            batch,
            participants: created,
            count: created.length
          }
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/participants/batch/:batchId - Get participants in batch
    const batchMatch = urlPath.match(/^\/api\/participants\/batch\/([^/]+)$/);
    if (batchMatch && method === 'GET') {
      const participants = await ParticipantModel.getByBatchId(batchMatch[1]);
      return res.json({
        success: true,
        data: participants,
        count: participants.length
      });
    }

    // PUT /api/participants/:id - Update participant
    const updateMatch = urlPath.match(/^\/api\/participants\/([^/]+)$/);
    if (updateMatch && method === 'PUT') {
      try {
        const body = await getRequestBody(req);
        const data = body;
        const participant = await ParticipantModel.update(updateMatch[1], data);
        return res.json({
          success: true,
          data: participant
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // DELETE /api/participants/:id - Delete participant
    if (updateMatch && method === 'DELETE') {
      try {
        await ParticipantModel.delete(updateMatch[1]);
        return res.json({
          success: true,
          message: 'Participant deleted'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // POST /api/participants/export - Export participants as CSV
    if (urlPath === '/api/participants/export' && method === 'POST') {
      try {
        const body = await getRequestBody(req);
        const { batch_id } = body;
        let participants;

        if (batch_id) {
          participants = await ParticipantModel.getByBatchId(batch_id);
        } else {
          participants = await ParticipantModel.getAll();
        }

        const csv = CSVParser.generateCSV(participants);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="participants.csv"');
        return res.send(csv);
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: { message: 'Endpoint not found' }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
}

module.exports = handler;
