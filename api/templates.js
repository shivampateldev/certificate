/**
 * Templates API
 * Handles template upload, field mapping, and management
 */

const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const { TemplateModel, TemplateFieldModel } = require('./models');
const FileHandler = require('./utils/fileHandler');
const Validators = require('./utils/validators');

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
    // GET /api/templates - List all templates
    if (urlPath === '/api/templates' && method === 'GET') {
      const templates = await TemplateModel.getAll();
      
      // Add image data as base64 for preview
      const templatesWithImages = templates.map(template => {
        try {
          if (template.file_path && FileHandler.fileExists(template.file_path)) {
            const fileBuffer = FileHandler.readFile(template.file_path);
            const base64 = fileBuffer.toString('base64');
            const mimeType = template.file_type === 'pdf' ? 'application/pdf' : `image/${template.file_type}`;
            
            return {
              ...template,
              name: template.template_name, // Add 'name' alias for frontend compatibility
              imageBase64: `data:${mimeType};base64,${base64}`
            };
          }
          return {
            ...template,
            name: template.template_name,
            imageBase64: null
          };
        } catch (error) {
          console.error(`Error loading template image for ${template.id}:`, error.message);
          return {
            ...template,
            name: template.template_name,
            imageBase64: null
          };
        }
      });
      
      return res.json({
        success: true,
        data: templatesWithImages,
        count: templatesWithImages.length
      });
    }

    // GET /api/templates/active - List active templates
    if (urlPath === '/api/templates/active' && method === 'GET') {
      const templates = await TemplateModel.getActive();
      
      // Add image data as base64 for preview
      const templatesWithImages = templates.map(template => {
        try {
          if (template.file_path && FileHandler.fileExists(template.file_path)) {
            const fileBuffer = FileHandler.readFile(template.file_path);
            const base64 = fileBuffer.toString('base64');
            const mimeType = template.file_type === 'pdf' ? 'application/pdf' : `image/${template.file_type}`;
            
            return {
              ...template,
              name: template.template_name, // Add 'name' alias for frontend compatibility
              imageBase64: `data:${mimeType};base64,${base64}`
            };
          }
          return {
            ...template,
            name: template.template_name,
            imageBase64: null
          };
        } catch (error) {
          console.error(`Error loading template image for ${template.id}:`, error.message);
          return {
            ...template,
            name: template.template_name,
            imageBase64: null
          };
        }
      });
      
      return res.json({
        success: true,
        data: templatesWithImages,
        count: templatesWithImages.length
      });
    }

    // GET /api/templates/:id - Get single template
    const templateMatch = urlPath.match(/^\/api\/templates\/([^/]+)$/);
    if (templateMatch && method === 'GET') {
      const template = await TemplateModel.getById(templateMatch[1]);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: { message: 'Template not found' }
        });
      }

      // Get fields for this template
      const fields = await TemplateFieldModel.getByTemplateId(template.id);

      // Add image data as base64
      let imageBase64 = null;
      try {
        if (template.file_path && FileHandler.fileExists(template.file_path)) {
          const fileBuffer = FileHandler.readFile(template.file_path);
          const base64 = fileBuffer.toString('base64');
          const mimeType = template.file_type === 'pdf' ? 'application/pdf' : `image/${template.file_type}`;
          imageBase64 = `data:${mimeType};base64,${base64}`;
        }
      } catch (error) {
        console.error(`Error loading template image:`, error.message);
      }

      return res.json({
        success: true,
        data: {
          ...template,
          name: template.template_name,
          imageBase64,
          fields
        }
      });
    }

    // POST /api/templates/upload - Upload template file
    if (urlPath === '/api/templates/upload' && method === 'POST') {
      return new Promise((resolve) => {
        const busboy = Busboy({ headers: req.headers });
        let fileBuffer = null;
        let fileName = '';
        let templateName = '';
        let width = 800;
        let height = 600;
        let hasError = false;
        let fileReceived = false;

        busboy.on('field', (fieldname, val) => {
          if (fieldname === 'templateName') templateName = val;
          if (fieldname === 'width') width = parseInt(val) || 800;
          if (fieldname === 'height') height = parseInt(val) || 600;
        });

        busboy.on('file', (fieldname, file, info) => {
          fileReceived = true;
          fileName = info.filename;
          const chunks = [];
          file.on('data', d => chunks.push(d));
          file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
          });
          file.on('error', (err) => {
            hasError = true;
            res.status(400).json({
              success: false,
              error: { message: 'File upload error: ' + err.message }
            });
            resolve();
          });
        });

        busboy.on('error', (err) => {
          hasError = true;
          res.status(400).json({
            success: false,
            error: { message: 'Form parsing error: ' + err.message }
          });
          resolve();
        });

        busboy.on('finish', async () => {
          if (hasError) return;
          
          try {
            if (!fileBuffer || !fileReceived) {
              return res.status(400).json({
                success: false,
                error: { message: 'No file uploaded' }
              });
            }

            // Validate file type
            const ext = FileHandler.getFileExtension(fileName).toLowerCase();
            if (!['png', 'pdf', 'jpg', 'jpeg'].includes(ext)) {
              return res.status(400).json({
                success: false,
                error: { message: 'Only PNG, PDF, JPG and JPEG files are supported' }
              });
            }

            // Save file
            const saveResult = FileHandler.saveFile(fileBuffer, fileName, 'templates');
            if (!saveResult.success) {
              return res.status(500).json({
                success: false,
                error: { message: 'Failed to save file' }
              });
            }

            // Create template record
            const template = await TemplateModel.create({
              template_name: templateName || fileName,
              file_path: saveResult.path,
              file_type: ext,
              width,
              height
            });

            let autoFields = [];
            if (ext === 'pdf') {
              try {
                const { scanPDFPlaceholders } = require('./utils/pdfParser');
                autoFields = await scanPDFPlaceholders(fileBuffer);
              } catch (scanErr) {
                console.error('Error auto-scanning PDF placeholders:', scanErr.message);
              }
            }

            // Check filename for placeholders as a primary image/name fallback
            if (autoFields.length === 0) {
              const nameMatches = [...fileName.matchAll(/\{\{\s*([a-zA-Z0-9_(),.-]+)\s*\}\}/g)];
              if (nameMatches.length > 0) {
                autoFields = nameMatches.map((m, idx) => ({
                  field_name: m[1].trim(),
                  x: 150 + idx * 120,
                  y: 350,
                  font_size: 24,
                  font_family: 'Arial',
                  alignment: 'center',
                  color: '#000000'
                }));
              }
            }

            // Fallback: scan binary buffer for UTF-8 metadata placeholders
            if (autoFields.length === 0) {
              try {
                const fileStr = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 1024 * 1024));
                const metaMatches = [...fileStr.matchAll(/\{\{\s*([a-zA-Z0-9_(),.-]+)\s*\}\}/g)];
                if (metaMatches.length > 0) {
                  const uniqueMeta = Array.from(new Set(metaMatches.map(m => m[1].trim())));
                  autoFields = uniqueMeta.map((placeholder, idx) => ({
                    field_name: placeholder,
                    x: 200 + idx * 100,
                    y: 380,
                    font_size: 28,
                    font_family: 'Arial',
                    alignment: 'center',
                    color: '#000000'
                  }));
                }
              } catch (err) {
                console.error('Binary metadata scanning failed:', err);
              }
            }

            // Flawless default placeholders if completely blank
            if (autoFields.length === 0) {
              autoFields = [
                { field_name: 'name', x: 400, y: 250, font_size: 32, font_family: 'Arial', alignment: 'center', color: '#000000' },
                { field_name: 'course', x: 400, y: 320, font_size: 24, font_family: 'Arial', alignment: 'center', color: '#000000' },
                { field_name: 'date', x: 400, y: 390, font_size: 20, font_family: 'Arial', alignment: 'center', color: '#000000' },
                { field_name: 'certificate_id', x: 400, y: 460, font_size: 16, font_family: 'Arial', alignment: 'center', color: '#000000' }
              ];
            }

            // Save detected placeholders into database
            for (const field of autoFields) {
              await TemplateFieldModel.create({
                template_id: template.id,
                field_name: field.field_name,
                x: field.x,
                y: field.y,
                font_size: field.font_size,
                font_family: field.font_family,
                alignment: field.alignment || 'center',
                color: field.color || '#000000'
              });
            }

            return res.status(201).json({
              success: true,
              data: template,
              autoFieldsCount: autoFields.length,
              message: `Template uploaded successfully. Automatically detected and registered ${autoFields.length} placeholders!`
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

    // POST /api/templates/mapping - Bulk save mapping fields
    if (urlPath === '/api/templates/mapping' && method === 'POST') {
      try {
        const body = await getRequestBody(req);
        const { template_id, fields } = body;
        if (!template_id) {
          return res.status(400).json({ success: false, error: { message: 'template_id is required' } });
        }

        // Clear existing fields
        await TemplateFieldModel.deleteByTemplateId(template_id);

        const createdFields = [];
        if (fields && Array.isArray(fields)) {
          for (const f of fields) {
            const field = await TemplateFieldModel.create({
              template_id,
              field_name: f.fieldName || f.field_name,
              x: parseInt(f.x) || 0,
              y: parseInt(f.y) || 0,
              font_family: f.fontFamily || f.font_family || 'Arial',
              font_size: parseInt(f.fontSize || f.font_size) || 24,
              font_weight: f.fontWeight || f.font_weight || 'normal',
              color: f.fontColor || f.color || '#000000',
              alignment: f.alignment || 'left'
            });
            createdFields.push(field);
          }
        }

        return res.json({
          success: true,
          message: `Saved ${createdFields.length} mapped fields successfully!`,
          data: createdFields
        });
      } catch (error) {
        return res.status(500).json({ success: false, error: { message: error.message } });
      }
    }

    // POST /api/templates/:id/fields - Add field to template
    const fieldMatch = urlPath.match(/^\/api\/templates\/([^/]+)\/fields$/);
    if (fieldMatch && method === 'POST') {
      try {
        const body = await getRequestBody(req);
        const fieldData = body;
        const templateId = fieldMatch[1];

        // Verify template exists
        const template = await TemplateModel.getById(templateId);
        if (!template) {
          return res.status(404).json({
            success: false,
            error: { message: 'Template not found' }
          });
        }

        // Validate field data
        const validation = Validators.validateTemplateField(fieldData);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: { message: 'Validation failed', details: validation.errors }
          });
        }

        // Create field
        const field = await TemplateFieldModel.create({
          ...fieldData,
          template_id: templateId
        });

        return res.status(201).json({
          success: true,
          data: field
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/templates/:id/fields - Get template fields
    if (fieldMatch && method === 'GET') {
      try {
        const templateId = fieldMatch[1];
        const fields = await TemplateFieldModel.getByTemplateId(templateId);
        return res.json({
          success: true,
          data: fields,
          count: fields.length
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // PUT /api/templates/:id/fields/:fieldId - Update field
    const updateFieldMatch = urlPath.match(/^\/api\/templates\/([^/]+)\/fields\/([^/]+)$/);
    if (updateFieldMatch && method === 'PUT') {
      try {
        const body = await getRequestBody(req);
        const fieldData = body;
        const fieldId = updateFieldMatch[2];

        const field = await TemplateFieldModel.update(fieldId, fieldData);
        return res.json({
          success: true,
          data: field
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // GET /api/fonts - List custom fonts
    if (urlPath === '/api/fonts' && method === 'GET') {
      const { getCustomFonts } = require('./utils/fontLoader');
      const fonts = getCustomFonts();
      return res.json({
        success: true,
        data: fonts.map(f => ({ name: f.name, fileName: f.fileName, format: f.format }))
      });
    }

    // POST /api/fonts/upload - Upload custom font file
    if (urlPath === '/api/fonts/upload' && method === 'POST') {
      return new Promise((resolve) => {
        const busboy = Busboy({ headers: req.headers });
        let fileBuffer = null;
        let fileName = '';
        let hasError = false;

        busboy.on('file', (fieldname, file, info) => {
          fileName = info.filename;
          const ext = path.extname(fileName).toLowerCase();
          if (ext !== '.ttf' && ext !== '.otf') {
            hasError = true;
            res.status(400).json({
              success: false,
              error: { message: 'Only .ttf and .otf font formats are supported' }
            });
            file.resume();
            resolve();
            return;
          }

          const chunks = [];
          file.on('data', d => chunks.push(d));
          file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
          });
        });

        busboy.on('finish', () => {
          if (hasError) return;
          if (!fileBuffer) {
            res.status(400).json({
              success: false,
              error: { message: 'No file received' }
            });
            resolve();
            return;
          }

          try {
            const { getFontsDir } = require('./utils/fontLoader');
            const fontsDir = getFontsDir();
            if (!fs.existsSync(fontsDir)) {
              fs.mkdirSync(fontsDir, { recursive: true });
            }

            fs.writeFileSync(path.join(fontsDir, fileName), fileBuffer);
            res.json({
              success: true,
              message: 'Font uploaded successfully',
              data: {
                name: path.basename(fileName, path.extname(fileName)),
                fileName
              }
            });
            resolve();
          } catch (err) {
            res.status(500).json({
              success: false,
              error: { message: err.message }
            });
            resolve();
          }
        });

        req.pipe(busboy);
      });
    }

    // DELETE /api/templates/:id/fields/:fieldId - Delete field
    if (updateFieldMatch && method === 'DELETE') {
      try {
        const fieldId = updateFieldMatch[2];
        await TemplateFieldModel.delete(fieldId);
        return res.json({
          success: true,
          message: 'Field deleted'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // PUT /api/templates/:id - Update template
    if (templateMatch && method === 'PUT') {
      try {
        const body = await getRequestBody(req);
        const data = body;
        const template = await TemplateModel.update(templateMatch[1], data);
        return res.json({
          success: true,
          data: template
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: { message: error.message }
        });
      }
    }

    // DELETE /api/templates/:id - Delete template
    if (templateMatch && method === 'DELETE') {
      try {
        const templateId = templateMatch[1];
        // Delete all fields first
        await TemplateFieldModel.deleteByTemplateId(templateId);
        // Delete template
        await TemplateModel.delete(templateId);
        return res.json({
          success: true,
          message: 'Template deleted'
        });
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
