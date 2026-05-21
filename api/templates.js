/**
 * Templates API
 * Handles template upload, field mapping, and management
 */

const Busboy = require('busboy');
const { TemplateModel, TemplateFieldModel } = require('./models');
const FileHandler = require('./utils/fileHandler');
const Validators = require('./utils/validators');

module.exports.config = { api: { bodyParser: false } };

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

            return res.status(201).json({
              success: true,
              data: template,
              message: 'Template uploaded successfully. Now add fields to your template.'
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

    // POST /api/templates/:id/fields - Add field to template
    const fieldMatch = urlPath.match(/^\/api\/templates\/([^/]+)\/fields$/);
    if (fieldMatch && method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const fieldData = JSON.parse(body);
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
      });
      return;
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
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const fieldData = JSON.parse(body);
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
      });
      return;
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
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
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
      });
      return;
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
