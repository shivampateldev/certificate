const AdmZip = require('adm-zip');
const xml2js = require('xml2js');

const PLACEHOLDER_REGEX = /\{\{\s*([^}]+)\s*\}\}/g;

/**
 * Parse placeholder text from a string
 */
function parsePlaceholderText(text) {
  const placeholders = [];
  let match;
  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    placeholders.push(match[1].trim());
  }
  return placeholders;
}

/**
 * Normalize font name to extract family, weight, and style
 */
function normalizeFontName(fontName) {
  if (!fontName || typeof fontName !== 'string') {
    return {
      fontFamily: 'Calibri',
      fontWeight: 'normal',
      fontStyle: 'normal'
    };
  }

  let family = fontName.replace(/\+|\-|_|,/g, ' ').trim();
  family = family.replace(/(Bold|Oblique|Italic|Regular|Black|Medium|Light|SemiBold|Semi|Condensed|Thin|ExtraLight|ExtraBold)/gi, '');
  family = family.replace(/\s+/g, ' ').trim();
  if (!family) family = 'Calibri';

  const weightMap = {
    thin: '100',
    hairline: '100',
    extralight: '200',
    ultralight: '200',
    light: '300',
    regular: '400',
    normal: '400',
    medium: '500',
    semibold: '600',
    demibold: '600',
    bold: '700',
    extrabold: '800',
    ultrabold: '800',
    black: '900',
    heavy: '900'
  };

  const lowerName = fontName.toLowerCase();
  let fontWeight = 'normal';
  let fontStyle = 'normal';

  for (const [key, value] of Object.entries(weightMap)) {
    if (lowerName.includes(key)) {
      fontWeight = value;
      break;
    }
  }

  if (/italic|oblique/i.test(fontName)) {
    fontStyle = 'italic';
  }

  return {
    fontFamily: family,
    fontWeight: fontWeight,
    fontStyle: fontStyle
  };
}

/**
 * Parse color from DOCX color format (RRGGBB hex)
 */
function parseColor(colorStr) {
  if (!colorStr) return '#000000';
  
  let color = colorStr.toString().toUpperCase();
  
  if (/^[0-9A-F]{6}$/.test(color)) {
    return `#${color}`;
  }
  
  return '#000000';
}

/**
 * Safely get nested XML element values
 */
function getXmlValue(obj, ...keys) {
  if (!obj) return null;
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = current[key];
      if (Array.isArray(current) && current.length > 0) {
        current = current[0];
      } else if (Array.isArray(current)) {
        return null;
      }
    } else {
      return null;
    }
  }
  return current;
}

/**
 * Extract text and formatting from a paragraph run
 */
function extractRunInfo(runElement, pageIndex) {
  const fields = [];
  
  try {
    // Get text content (w:t elements)
    const textElements = runElement['w:t'];
    if (!textElements || !Array.isArray(textElements)) return fields;
    
    const text = textElements.join('');
    const placeholders = parsePlaceholderText(text);
    if (placeholders.length === 0) return fields;
    
    // Get run properties (w:rPr)
    const rPr = runElement['w:rPr'];
    
    let fontSize = 22; // Default 11pt in half-points
    let fontFamily = 'Calibri';
    let fontWeight = 'normal';
    let fontStyle = 'normal';
    let color = '#000000';
    
    if (rPr && rPr[0]) {
      const attrs = rPr[0];
      
      // Font size (in half-points)
      if (attrs['w:sz'] && attrs['w:sz'][0] && attrs['w:sz'][0].$) {
        fontSize = parseInt(attrs['w:sz'][0].$['w:val']) / 2;
      }
      
      // Font family
      const fonts = attrs['w:rFonts'];
      if (fonts && fonts[0] && fonts[0].$) {
        const fontAttrs = fonts[0].$;
        fontFamily = fontAttrs['w:ascii'] || fontAttrs['w:hAnsi'] || 'Calibri';
      }
      
      // Bold
      if (attrs['w:b'] && attrs['w:b'][0] && (attrs['w:b'][0].$['w:val'] === 'true' || !attrs['w:b'][0].$['w:val'])) {
        fontWeight = '700';
      }
      
      // Italic
      if (attrs['w:i'] && attrs['w:i'][0] && (attrs['w:i'][0].$['w:val'] === 'true' || !attrs['w:i'][0].$['w:val'])) {
        fontStyle = 'italic';
      }
      
      // Color
      const colorElem = attrs['w:color'];
      if (colorElem && colorElem[0] && colorElem[0].$ && colorElem[0].$.val) {
        color = parseColor(colorElem[0].$.val);
      }
      
      // Also check the normalized font name
      const normalized = normalizeFontName(fontFamily);
      fontFamily = normalized.fontFamily;
      if (normalized.fontWeight !== 'normal') fontWeight = normalized.fontWeight;
      if (normalized.fontStyle !== 'normal') fontStyle = normalized.fontStyle;
    }
    
    for (const placeholder of placeholders) {
      fields.push({
        field_name: placeholder,
        x: 0, // DOCX doesn't have absolute positioning like PDF
        y: 0,
        width: 0,
        height: fontSize,
        font_size: fontSize,
        font_family: fontFamily,
        font_weight: fontWeight,
        font_style: fontStyle,
        color: color,
        alignment: 'left',
        rotation: 0,
        letter_spacing: 0,
        line_height: 1.15,
        page: pageIndex
      });
    }
  } catch (e) {
    // Skip malformed runs
  }
  
  return fields;
}

/**
 * Extract fields from document body
 */
async function extractDocumentFields(documentXml, pageIndex) {
  const fields = [];
  
  try {
    const parser = new xml2js.Parser({ explicitArray: true, mergeAttrs: false });
    const result = await parser.parseStringPromise(documentXml);
    
    const document = result['w:document'];
    if (!document) return fields;
    
    const body = document['w:body'];
    if (!body) return fields;
    
    // Process paragraphs
    const paragraphs = body[0]['w:p'] || [];
    for (const para of paragraphs) {
      // Get runs within paragraph
      const runs = para['w:r'] || [];
      for (const run of runs) {
        const runFields = extractRunInfo(run, pageIndex);
        fields.push(...runFields);
      }
    }
  } catch (e) {
    console.error('Error parsing document XML:', e.message);
  }
  
  return fields;
}

/**
 * Main function to scan DOCX for placeholders
 */
async function scanDOCXPlaceholders(docxBuffer) {
  try {
    const fields = [];
    
    // Create zip from buffer
    const zip = new AdmZip(docxBuffer);
    
    // Get document.xml
    const documentEntry = zip.getEntry('word/document.xml');
    if (!documentEntry) {
      console.error('document.xml not found in DOCX');
      return fields;
    }
    
    const documentXml = documentEntry.getData().toString('utf8');
    const docFields = await extractDocumentFields(documentXml, 1);
    fields.push(...docFields);
    
    return fields;
  } catch (err) {
    console.error('DOCX placeholder scanning failed:', err);
    return [];
  }
}

/**
 * Get document info (page count estimate)
 */
async function getDocumentInfo(docxBuffer) {
  try {
    const zip = new AdmZip(docxBuffer);
    
    // Try to get document statistics from core properties
    const coreEntry = zip.getEntry('docProps/core.xml');
    if (coreEntry) {
      const parser = new xml2js.Parser({ explicitArray: true, mergeAttrs: false });
      const result = await parser.parseStringPromise(coreEntry.getData().toString('utf8'));
      return {
        pages: 1, // DOCX doesn't have fixed pages
        words: result['cp:coreProperties']?.['dc:description']?.[0] || 0
      };
    }
    
    return { pages: 1, words: 0 };
  } catch (e) {
    return { pages: 1, words: 0 };
  }
}

module.exports = {
  scanDOCXPlaceholders,
  getDocumentInfo,
  normalizeFontName,
  parsePlaceholderText
};