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
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal'
    };
  }

  let family = fontName.replace(/\+|\-|_|,/g, ' ').trim();
  family = family.replace(/(Bold|Oblique|Italic|Regular|Black|Medium|Light|SemiBold|Semi|Condensed|Thin|ExtraLight|ExtraBold)/gi, '');
  family = family.replace(/\s+/g, ' ').trim();
  if (!family) family = 'Arial';

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
 * Parse color from PowerPoint color format (RRGGBB hex)
 */
function parseColor(colorStr) {
  if (!colorStr) return '#000000';
  
  let color = colorStr.toString().toUpperCase();
  if (color.startsWith('FF')) {
    color = color.substring(2);
  }
  
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
 * Extract text and formatting from a paragraph XML element
 */
async function extractParagraphInfo(pNode, slideIndex) {
  const fields = [];
  
  try {
    // Get all text runs (a:r elements)
    const runs = pNode['a:r'] || [];
    
    for (const run of runs) {
      // Get text content
      const textElements = run['a:t'];
      if (!textElements || !Array.isArray(textElements)) continue;
      
      const text = textElements.join('');
      const placeholders = parsePlaceholderText(text);
      if (placeholders.length === 0) continue;
      
      // Get character properties
      const charProps = run['a:rPr'] || getXmlValue(pNode, 'a:pPr', 'a:defRPr');
      
      let fontSize = 18;
      let fontFamily = 'Arial';
      let fontWeight = 'normal';
      let fontStyle = 'normal';
      let color = '#000000';
      let letterSpacing = 0;
      
      if (charProps && charProps.$) {
        const attrs = charProps.$;
        
        // Font size (in hundredths of a point)
        if (attrs.sz) {
          fontSize = parseInt(attrs.sz) / 100;
        }
        
        // Font family from latin element
        const latin = getXmlValue(charProps, 'a:latin');
        if (latin && latin.$ && latin.$.typeface) {
          fontFamily = latin.$.typeface;
        }
        
        // Font weight and style
        const normalized = normalizeFontName(attrs.typeface || fontFamily);
        fontWeight = normalized.fontWeight;
        fontStyle = normalized.fontStyle;
        
        // Check for bold/italic attributes
        if (attrs.b === '1' || attrs.b === 'true') {
          fontWeight = '700';
        }
        if (attrs.i === '1' || attrs.i === 'true') {
          fontStyle = 'italic';
        }
        
        // Color
        const srgbClr = getXmlValue(charProps, 'a:solidFill', 'a:srgbClr');
        if (srgbClr && srgbClr.$ && srgbClr.$.val) {
          color = parseColor(srgbClr.$.val);
        }
        
        // Letter spacing
        if (attrs.spc) {
          letterSpacing = parseInt(attrs.spc) / 100;
        }
      }
      
      for (const placeholder of placeholders) {
        fields.push({
          field_name: placeholder,
          x: 0,
          y: 0,
          width: 200,
          height: fontSize,
          font_size: fontSize,
          font_family: fontFamily,
          font_weight: fontWeight,
          font_style: fontStyle,
          color: color,
          alignment: 'left',
          rotation: 0,
          letter_spacing: letterSpacing,
          line_height: 0,
          page: slideIndex
        });
      }
    }
  } catch (e) {
    // Skip malformed paragraphs
  }
  
  return fields;
}

/**
 * Extract fields from a slide XML
 */
async function extractSlideFields(slideXml, slideIndex) {
  const fields = [];
  
  try {
    const parser = new xml2js.Parser({ explicitArray: true, mergeAttrs: false });
    const result = await parser.parseStringPromise(slideXml);
    
    // Navigate to shapes
    const ns = result['p:sld'];
    if (!ns) return fields;
    
    const cSld = ns['p:cSld'];
    if (!cSld) return fields;
    
    const spTree = cSld[0]['p:spTree'];
    if (!spTree) return fields;
    
    // Process shapes
    const shapes = spTree[0]['p:sp'] || [];
    for (const shape of shapes) {
      // Get shape position and size
      let x = 0, y = 0, width = 200, height = 50, rotation = 0;
      
      const spPr = shape['p:spPr'];
      if (spPr && spPr[0]) {
        const xfrm = spPr[0]['a:xfrm'];
        if (xfrm && xfrm[0]) {
          const off = xfrm[0]['a:off'];
          const ext = xfrm[0]['a:ext'];
          
          if (off && off[0] && off[0].$) {
            x = parseInt(off[0].$.x) / 9144;
            y = parseInt(off[0].$.y) / 9144;
          }
          if (ext && ext[0] && ext[0].$) {
            width = parseInt(ext[0].$.cx) / 9144;
            height = parseInt(ext[0].$.cy) / 9144;
          }
          if (xfrm[0].$.rot) {
            rotation = Math.round(parseInt(xfrm[0].$.rot) / 60000);
          }
        }
      }
      
      // Get text frame
      const txBody = shape['p:txBody'];
      if (!txBody) continue;
      
      const paragraphs = txBody[0]['a:p'] || [];
      for (const para of paragraphs) {
        const paraFields = await extractParagraphInfo(para, slideIndex);
        for (const field of paraFields) {
          field.x = Math.round(x);
          field.y = Math.round(y);
          field.width = Math.round(width);
          field.height = Math.round(height);
          field.rotation = rotation;
          fields.push(field);
        }
      }
    }
  } catch (e) {
    console.error('Error parsing slide XML:', e.message);
  }
  
  return fields;
}

/**
 * Main function to scan PPTX for placeholders
 */
async function scanPPTXPlaceholders(pptxBuffer) {
  try {
    const fields = [];
    
    // Create zip from buffer
    const zip = new AdmZip(pptxBuffer);
    const entries = zip.getEntries();
    
    // Find all slide XML files
    const slideEntries = entries.filter(entry => 
      entry.entryName.match(/ppt\/slides\/slide\d+\.xml/)
    );
    
    // Sort slides by number
    slideEntries.sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.entryName.match(/slide(\d+)/)[1]);
      return numA - numB;
    });
    
    // Process each slide
    for (const slideEntry of slideEntries) {
      const slideNumber = parseInt(slideEntry.entryName.match(/slide(\d+)/)[1]);
      const slideXml = slideEntry.getData().toString('utf8');
      const slideFields = await extractSlideFields(slideXml, slideNumber);
      fields.push(...slideFields);
    }
    
    return fields;
  } catch (err) {
    console.error('PPTX placeholder scanning failed:', err);
    return [];
  }
}

/**
 * Get slide dimensions from presentation.xml
 */
async function getSlideDimensions(pptxBuffer) {
  try {
    const zip = new AdmZip(pptxBuffer);
    const presEntry = zip.getEntry('ppt/presentation.xml');
    if (!presEntry) return { width: 960, height: 540 };
    
    const parser = new xml2js.Parser({ explicitArray: true, mergeAttrs: false });
    const result = await parser.parseStringPromise(presEntry.getData().toString('utf8'));
    
    const ns = result['p:presentation'];
    if (!ns || !ns['p:sldSz']) return { width: 960, height: 540 };
    
    const sldSz = ns['p:sldSz'][0].$;
    return {
      width: parseInt(sldSz.cx) / 9144,
      height: parseInt(sldSz.cy) / 9144
    };
  } catch (e) {
    return { width: 960, height: 540 };
  }
}

module.exports = {
  scanPPTXPlaceholders,
  getSlideDimensions,
  normalizeFontName,
  parsePlaceholderText
};