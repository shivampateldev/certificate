const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const PLACEHOLDER_REGEX = /\{\{\s*([^}]+)\s*\}\}/g;

/**
 * Normalize font name to extract family, weight, and style
 */
function normalizeFontName(fontName) {
  if (!fontName || typeof fontName !== 'string') {
    return {
      fontFamily: 'Helvetica',
      fontWeight: 'normal',
      fontStyle: 'normal'
    };
  }

  // Remove common prefixes and separators
  let family = fontName.replace(/\+|\-|_|,/g, ' ').trim();
  
  // Remove weight/style suffixes for base family
  family = family.replace(/(Bold|Oblique|Italic|Regular|Black|Medium|Light|SemiBold|Semi|Condensed|Thin|ExtraLight|ExtraBold)/gi, '');
  family = family.replace(/\s+/g, ' ').trim();
  if (!family) family = 'Helvetica';

  // Detect weight
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
 * Extract color from PDF graphics state
 * PDFs can have colors in different formats:
 * - DeviceGray (single value 0-1)
 * - DeviceRGB (three values 0-1)
 * - DeviceCMYK (four values 0-1)
 */
function extractColorFromGraphicsState(graphicsState) {
  if (!graphicsState) return '#000000';
  
  try {
    // Check for RGB color (sc or SCN operators)
    if (graphicsState.SC !== undefined) {
      const rgb = graphicsState.SC;
      if (Array.isArray(rgb) && rgb.length === 3) {
        const r = Math.round(rgb[0] * 255);
        const g = Math.round(rgb[1] * 255);
        const b = Math.round(rgb[2] * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
    // Check for Gray color (g operator)
    if (graphicsState.g !== undefined) {
      const gray = Math.round(graphicsState.g * 255);
      return `#${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}`;
    }
    
    // Check for CMYK color (k operator)
    if (graphicsState.k !== undefined) {
      const cmyk = graphicsState.k;
      if (Array.isArray(cmyk) && cmyk.length === 4) {
        // Convert CMYK to RGB (simplified)
        const c = cmyk[0], m = cmyk[1], y = cmyk[2], k = cmyk[3];
        const r = Math.round((1 - c) * (1 - k) * 255);
        const g = Math.round((1 - m) * (1 - k) * 255);
        const b = Math.round((1 - y) * (1 - k) * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
  } catch (e) {
    // Fallback to black if color extraction fails
  }
  
  return '#000000';
}

/**
 * Estimate letter spacing from character positions
 * By analyzing the width of text vs expected width
 */
function estimateLetterSpacing(item, text) {
  if (!text || text.length <= 1) return 0;
  
  try {
    const actualWidth = item.width || 0;
    const fontSize = item.height || 24;
    
    // Estimate expected width based on average character width
    // For most fonts, average character width is roughly 0.5-0.6 of font size
    const avgCharWidth = fontSize * 0.55;
    const expectedWidth = text.length * avgCharWidth;
    
    // If actual width is significantly larger than expected, there's letter spacing
    if (actualWidth > expectedWidth * 1.1) {
      const extraSpace = actualWidth - expectedWidth;
      const letterSpacing = extraSpace / (text.length - 1);
      return Math.round(letterSpacing * 100) / 100;
    }
  } catch (e) {
    // Return 0 if calculation fails
  }
  
  return 0;
}

/**
 * Determine text alignment based on context
 * For single text items, we default to left but can be overridden
 */
function determineAlignment(item, pageWidth) {
  const x = item.transform ? item.transform[4] : 0;
  const width = item.width || 0;
  const centerX = x + width / 2;
  
  // If text is roughly centered on page, mark as center
  if (Math.abs(centerX - pageWidth / 2) < pageWidth * 0.1) {
    return 'center';
  }
  
  // If text is on right side, mark as right
  if (x > pageWidth * 0.7) {
    return 'right';
  }
  
  return 'left';
}

/**
 * Main function to scan PDF for placeholders with full typography extraction
 */
async function scanPDFPlaceholders(pdfBuffer) {
  try {
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const fields = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const pageWidth = viewport.width;
      const textContent = await page.getTextContent();

      for (const item of textContent.items) {
        const rawText = item.str || '';
        const placeholders = parsePlaceholderText(rawText);
        if (placeholders.length === 0) continue;

        // Extract position
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = Math.round(transform[4] || 0);
        const pdfY = transform[5] || 0;
        const y = Math.round(viewport.height - pdfY);

        // Extract font information
        const fontSize = Math.round(item.height || Math.abs(transform[3]) || 24);
        const parsedFont = normalizeFontName(item.fontName || 'Helvetica');
        
        // Calculate rotation
        const rotation = Math.round(Math.atan2(transform[1], transform[0]) * (180 / Math.PI)) || 0;

        // Extract dimensions
        const width = Math.round(item.width || 0);
        const height = Math.round(item.height || fontSize);

        // Estimate letter spacing
        const letterSpacing = estimateLetterSpacing(item, rawText);

        // Determine alignment
        const alignment = determineAlignment(item, pageWidth);

        // Note: Color extraction from pdfjs is limited
        // We default to black but provide the infrastructure
        const color = '#000000'; // pdfjs doesn't expose color in text items directly

        placeholders.forEach((placeholder) => {
          fields.push({
            field_name: placeholder,
            x: x,
            y: y,
            width: width,
            height: height,
            font_size: fontSize,
            font_family: parsedFont.fontFamily,
            font_weight: parsedFont.fontWeight,
            font_style: parsedFont.fontStyle,
            color: color,
            alignment: alignment,
            rotation: rotation,
            letter_spacing: letterSpacing,
            line_height: 0,
            page: pageNum
          });
        });
      }
    }

    return fields;
  } catch (err) {
    console.error('PDF placeholder scanning failed:', err);
    return [];
  }
}

/**
 * Scan PDF and return detailed information including raw text positions
 * Useful for debugging and advanced use cases
 */
async function scanPDFDetailed(pdfBuffer) {
  try {
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const detailedInfo = {
      pages: [],
      placeholders: [],
      metadata: {}
    };

    // Extract document metadata
    try {
      const metadata = await pdfDoc.getMetadata();
      detailedInfo.metadata = metadata.info || {};
    } catch (e) {
      // Metadata extraction failed
    }

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      
      const pageInfo = {
        number: pageNum,
        width: viewport.width,
        height: viewport.height,
        items: []
      };

      for (const item of textContent.items) {
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const pageInfo_item = {
          text: item.str,
          x: Math.round(transform[4] || 0),
          y: Math.round(viewport.height - (transform[5] || 0)),
          width: Math.round(item.width || 0),
          height: Math.round(item.height || 24),
          fontName: item.fontName,
          hasPlaceholder: PLACEHOLDER_REGEX.test(item.str)
        };
        
        pageInfo.items.push(pageInfo_item);

        // Check for placeholders
        const placeholders = parsePlaceholderText(item.str);
        for (const placeholder of placeholders) {
          detailedInfo.placeholders.push({
            name: placeholder,
            page: pageNum,
            x: Math.round(transform[4] || 0),
            y: Math.round(viewport.height - (transform[5] || 0)),
            fontSize: Math.round(item.height || 24),
            fontFamily: normalizeFontName(item.fontName).fontFamily,
            fontWeight: normalizeFontName(item.fontName).fontWeight,
            fontStyle: normalizeFontName(item.fontName).fontStyle,
            rotation: Math.round(Math.atan2(transform[1], transform[0]) * (180 / Math.PI))
          });
        }
      }

      detailedInfo.pages.push(pageInfo);
    }

    return detailedInfo;
  } catch (err) {
    console.error('Detailed PDF scanning failed:', err);
    return { pages: [], placeholders: [], metadata: {} };
  }
}

module.exports = {
  scanPDFPlaceholders,
  scanPDFDetailed,
  normalizeFontName,
  parsePlaceholderText
};