const { scanPDFPlaceholders } = require('./pdfParser');
const { scanPPTXPlaceholders } = require('./pptxParser');
const { scanDOCXPlaceholders } = require('./docxParser');
const { extractPlaceholders } = require('./placeholderEngine');

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_(),.-]+)\s*\}\}/g;

/**
 * Extract placeholders from plain text
 */
function extractPlaceholdersFromText(text) {
  const placeholders = new Set();
  if (!text || typeof text !== 'string') return [];
  let match;
  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    placeholders.add(match[1].trim());
  }
  return Array.from(placeholders);
}

/**
 * Scan text buffer for placeholders
 */
function scanTextBufferForPlaceholders(buffer) {
  try {
    const text = buffer.toString('utf8');
    return extractPlaceholdersFromText(text);
  } catch (err) {
    return [];
  }
}

/**
 * Scan PNG metadata for placeholders
 */
function scanPNGMetadataForPlaceholders(buffer) {
  const placeholders = new Set();
  if (!buffer || buffer.length < 8) return [];
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.slice(0, 8).equals(pngSignature)) return [];

  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > buffer.length) break;
    const chunkData = buffer.slice(dataStart, dataEnd);

    if (['tEXt', 'iTXt', 'zTXt'].includes(type)) {
      let chunkText = '';
      try {
        if (type === 'zTXt') {
          const nullIndex = chunkData.indexOf(0);
          const compressed = chunkData.slice(nullIndex + 2);
          chunkText = require('zlib').inflateSync(compressed).toString('utf8');
        } else {
          chunkText = chunkData.toString('utf8');
        }
      } catch (e) {
        chunkText = chunkData.toString('utf8');
      }
      extractPlaceholdersFromText(chunkText).forEach(p => placeholders.add(p));
    }

    offset = dataEnd + 4;
  }

  return Array.from(placeholders);
}

/**
 * Scan JPEG metadata for placeholders
 */
function scanJPEGMetadataForPlaceholders(buffer) {
  const placeholders = new Set();
  if (!buffer || buffer.length < 2) return [];
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return [];

  let offset = 2;
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xFF) break;
    const marker = buffer[offset + 1];
    offset += 2;

    if (marker === 0xD9 || marker === 0xDA) break;
    if (offset + 2 > buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2) break;

    const segmentStart = offset + 2;
    const segmentEnd = segmentStart + segmentLength - 2;
    if (segmentEnd > buffer.length) break;

    const segment = buffer.slice(segmentStart, segmentEnd);

    if (marker === 0xFE || (marker >= 0xE0 && marker <= 0xEF)) {
      const segmentText = segment.toString('utf8');
      extractPlaceholdersFromText(segmentText).forEach(p => placeholders.add(p));
    }

    offset = segmentEnd;
  }

  return Array.from(placeholders);
}

/**
 * Scan binary buffer for placeholders
 */
function scanBinaryBufferForPlaceholders(buffer) {
  const placeholders = new Set();
  const encodings = ['utf8', 'latin1', 'ascii'];

  for (const encoding of encodings) {
    try {
      const rawText = buffer.toString(encoding);
      const cleaned = rawText.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
      extractPlaceholdersFromText(cleaned).forEach(p => placeholders.add(p));
    } catch (err) {
      continue;
    }
  }

  return Array.from(placeholders);
}

/**
 * Scan fallback placeholders
 */
function scanFallbackPlaceholders(buffer, fileName) {
  const placeholders = new Set();
  extractPlaceholdersFromText(fileName).forEach(p => placeholders.add(p));

  const textPlaceholders = scanTextBufferForPlaceholders(buffer);
  textPlaceholders.forEach(p => placeholders.add(p));

  const binaryPlaceholders = scanBinaryBufferForPlaceholders(buffer);
  binaryPlaceholders.forEach(p => placeholders.add(p));

  return Array.from(placeholders);
}

/**
 * Create a default field with estimated position
 */
function createDefaultField(fieldName, index, options = {}) {
  return {
    field_name: fieldName,
    x: options.x || 350 + index * 120,
    y: options.y || 320 + (index % 4) * 60,
    width: options.width || 300,
    height: options.height || 40,
    font_size: options.font_size || 24,
    font_family: options.font_family || 'Arial',
    font_weight: options.font_weight || 'normal',
    font_style: options.font_style || 'normal',
    color: options.color || '#000000',
    alignment: options.alignment || 'center',
    rotation: options.rotation || 0,
    letter_spacing: options.letter_spacing || 0,
    line_height: options.line_height || 0,
    page: options.page || 1,
    source: 'default'
  };
}

/**
 * Detect file type from buffer
 */
function detectFileType(buffer, fileName) {
  if (!buffer || buffer.length < 8) return null;
  
  // Check PDF signature
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'pdf';
  }
  
  // Check PNG signature
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.slice(0, 8).equals(pngSignature)) {
    return 'png';
  }
  
  // Check JPEG signature
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return 'jpg';
  }
  
  // Check DOCX/PPTX (ZIP-based formats)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    // Could be DOCX, PPTX, XLSX - need to check internal structure
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(buffer);
      
      if (zip.getEntry('ppt/presentation.xml')) {
        return 'pptx';
      }
      if (zip.getEntry('word/document.xml')) {
        return 'docx';
      }
      if (zip.getEntry('xl/workbook.xml')) {
        return 'xlsx';
      }
    } catch (e) {
      // Not a valid ZIP
    }
  }
  
  // Fallback to extension
  if (fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf', 'png', 'jpg', 'jpeg', 'pptx', 'docx', 'xlsx'].includes(ext)) {
      return ext;
    }
  }
  
  return null;
}

/**
 * Main function to detect template fields from uploaded file
 */
async function detectTemplateFields(fileBuffer, fileName, ext) {
  ext = ext.toLowerCase();
  let detectedFields = [];

  try {
    // PDF - Full extraction with position and typography
    if (ext === 'pdf') {
      try {
        detectedFields = await scanPDFPlaceholders(fileBuffer);
        detectedFields = detectedFields.map(field => ({ ...field, source: 'pdf' }));
      } catch (err) {
        console.error('PDF scan failed:', err.message);
      }
    }
    
    // PPTX - Extract from slides
    if (ext === 'pptx' && detectedFields.length === 0) {
      try {
        detectedFields = await scanPPTXPlaceholders(fileBuffer);
        detectedFields = detectedFields.map(field => ({ ...field, source: 'pptx' }));
      } catch (err) {
        console.error('PPTX scan failed:', err.message);
      }
    }
    
    // DOCX - Extract from document
    if (ext === 'docx' && detectedFields.length === 0) {
      try {
        detectedFields = await scanDOCXPlaceholders(fileBuffer);
        detectedFields = detectedFields.map(field => ({ ...field, source: 'docx' }));
      } catch (err) {
        console.error('DOCX scan failed:', err.message);
      }
    }
    
    // Images - Try metadata first, then fallback
    if ((ext === 'png' || ['jpg', 'jpeg'].includes(ext)) && detectedFields.length === 0) {
      let placeholders = [];
      if (ext === 'png') {
        placeholders = scanPNGMetadataForPlaceholders(fileBuffer);
      } else {
        placeholders = scanJPEGMetadataForPlaceholders(fileBuffer);
      }
      
      detectedFields = placeholders.map((fieldName, index) => ({
        field_name: fieldName,
        x: 350 + index * 120,
        y: 320 + (index % 4) * 60,
        width: 300,
        height: 40,
        font_size: 24,
        font_family: 'Arial',
        font_weight: 'normal',
        font_style: 'normal',
        color: '#000000',
        alignment: 'center',
        rotation: 0,
        letter_spacing: 0,
        line_height: 0,
        page: 1,
        source: 'image',
        warning: 'Font information unavailable for images. Please select matching font or upload font file.'
      }));
    }
    
    // Fallback: Try binary scan for any format
    if (detectedFields.length === 0) {
      const placeholders = scanFallbackPlaceholders(fileBuffer, fileName);
      detectedFields = placeholders.map((fieldName, index) => ({
        field_name: fieldName,
        x: 350 + index * 120,
        y: 320 + (index % 4) * 60,
        width: 300,
        height: 40,
        font_size: 24,
        font_family: 'Arial',
        font_weight: 'normal',
        font_style: 'normal',
        color: '#000000',
        alignment: 'center',
        rotation: 0,
        letter_spacing: 0,
        line_height: 0,
        page: 1,
        source: 'fallback'
      }));
    }
    
    // Last resort: Use default expected fields
    if (detectedFields.length === 0) {
      const expected = ['name', 'certificate_id', 'course', 'date'];
      detectedFields = expected.map((fieldName, index) => createDefaultField(fieldName, index));
    }
    
  } catch (err) {
    console.error('Template field detection failed:', err.message);
    // Return default fields on error
    const expected = ['name', 'certificate_id', 'course', 'date'];
    detectedFields = expected.map((fieldName, index) => createDefaultField(fieldName, index));
  }

  return detectedFields;
}

/**
 * Get detection info for a template
 */
async function getDetectionInfo(fileBuffer, fileName) {
  const ext = detectFileType(fileBuffer, fileName);
  
  const info = {
    detectedType: ext,
    supportedFormats: {
      pdf: { tier: 1, description: 'Perfect support - Full typography extraction' },
      pptx: { tier: 2, description: 'Good support - Position and font extraction' },
      docx: { tier: 3, description: 'Good support - Font and style extraction' },
      png: { tier: 4, description: 'Partial support - Position only (OCR needed for text)' },
      jpg: { tier: 4, description: 'Partial support - Position only (OCR needed for text)' },
      jpeg: { tier: 4, description: 'Partial support - Position only (OCR needed for text)' }
    }
  };
  
  if (ext) {
    info.formatSupported = ['pdf', 'pptx', 'docx', 'png', 'jpg', 'jpeg'].includes(ext);
    info.requiresOCR = ['png', 'jpg', 'jpeg'].includes(ext);
  } else {
    info.formatSupported = false;
    info.requiresOCR = false;
  }
  
  return info;
}

module.exports = {
  detectTemplateFields,
  detectFileType,
  getDetectionInfo,
  extractPlaceholdersFromText,
  scanPNGMetadataForPlaceholders,
  scanJPEGMetadataForPlaceholders,
  scanTextBufferForPlaceholders,
  scanBinaryBufferForPlaceholders,
  scanFallbackPlaceholders,
  createDefaultField
};