const { PDFDocument } = require('pdf-lib');
const zlib = require('zlib');

/**
 * Custom ASCII85 / Base85 Decoder
 */
function decodeASCII85(str) {
  let cleaned = str.replace(/\s/g, '');
  if (cleaned.startsWith('<~')) cleaned = cleaned.substring(2);
  if (cleaned.endsWith('~>')) cleaned = cleaned.substring(0, cleaned.length - 2);
  
  const bytes = [];
  let i = 0;
  while (i < cleaned.length) {
    const c = cleaned[i];
    if (c === 'z') {
      bytes.push(0, 0, 0, 0);
      i++;
      continue;
    }
    
    let val = 0;
    let count = 0;
    for (let j = 0; j < 5; j++) {
      if (i + j < cleaned.length) {
        const code = cleaned.charCodeAt(i + j) - 33;
        val = val * 85 + code;
        count++;
      } else {
        val = val * 85 + 84;
      }
    }
    
    const b1 = (val >> 24) & 0xff;
    const b2 = (val >> 16) & 0xff;
    const b3 = (val >> 8) & 0xff;
    const b4 = val & 0xff;
    
    if (count === 5) {
      bytes.push(b1, b2, b3, b4);
    } else if (count === 4) {
      bytes.push(b1, b2, b3);
    } else if (count === 3) {
      bytes.push(b1, b2);
    } else if (count === 2) {
      bytes.push(b1);
    }
    i += count;
  }
  return Buffer.from(bytes);
}

/**
 * Scan a PDF template file buffer for placeholders of form {{PLACEHOLDER}}
 * Returns list of fields with coordinates translated to HTML top-left canvas space.
 */
async function scanPDFPlaceholders(pdfBuffer) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return [];
    
    const firstPage = pages[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();
    
    const contents = firstPage.node.Contents();
    if (!contents) return [];
    
    const context = firstPage.node.context;
    const refs = [];
    if (contents.constructor.name === 'PDFArray') {
      for (let i = 0; i < contents.size(); i++) {
        refs.push(contents.get(i));
      }
    } else {
      refs.push(contents);
    }
    
    const foundFields = [];
    
    for (const ref of refs) {
      const stream = context.lookup(ref);
      if (!stream || !stream.contents) continue;
      
      let decompressedBytes;
      const filter = stream.dict ? stream.dict.get(require('pdf-lib').PDFName.of('Filter')) : null;
      let raw = stream.contents;
      
      const filterStr = filter ? filter.toString() : '';
      if (filterStr.includes('ASCII85Decode')) {
        const ascii85Text = Buffer.from(raw).toString('utf-8');
        raw = decodeASCII85(ascii85Text);
      }
      
      if (filterStr.includes('FlateDecode') || filterStr.includes('Flate')) {
        try {
          decompressedBytes = zlib.inflateSync(raw);
        } catch (e) {
          try {
            decompressedBytes = zlib.inflateRawSync(raw);
          } catch (e2) {
            decompressedBytes = zlib.unzipSync(raw);
          }
        }
      } else {
        decompressedBytes = raw;
      }
      
      if (!decompressedBytes) continue;
      
      const streamText = decompressedBytes.toString('utf-8');
      
      let currentX = 0;
      let currentY = 0;
      let textX = 0;
      let textY = 0;
      let currentFont = 'Helvetica';
      let currentFontSize = 12;
      
      const lines = streamText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const tokens = trimmed.split(/\s+/);
        const command = tokens[tokens.length - 1];
        
        // cm command: Graphics transformation matrix
        if (command === 'cm' && tokens.length >= 6) {
          const a = parseFloat(tokens[0]);
          const d = parseFloat(tokens[3]);
          const x = parseFloat(tokens[4]);
          const y = parseFloat(tokens[5]);
          if (a === 1 && d === 1) {
            currentX = x;
            currentY = y;
          }
        }
        
        // Tf command: Select font and size
        if (command === 'Tf' && tokens.length >= 3) {
          currentFont = tokens[0].replace('/', '');
          currentFontSize = parseFloat(tokens[1]);
        }
        
        // Td command: Translate text position
        if (command === 'Td' && tokens.length >= 3) {
          textX += parseFloat(tokens[0]);
          textY += parseFloat(tokens[1]);
        }
        
        // Tm command: Set text matrix
        if (command === 'Tm' && tokens.length >= 6) {
          textX = parseFloat(tokens[4]);
          textY = parseFloat(tokens[5]);
        }
        
        // Tj command: Show text literal or hex representation
        if (command === 'Tj') {
          let match = trimmed.match(/^\((.*)\)\s*Tj$/);
          if (match) {
            processTextItem(match[1]);
          } else {
            match = trimmed.match(/^<([0-9A-Fa-f]*)>\s*Tj$/);
            if (match) {
              const hex = match[1];
              const text = Buffer.from(hex, 'hex').toString('utf-8');
              processTextItem(text);
            }
          }
        }
        
        // TJ command: Show text array containing parents/hex sequences
        if (command === 'TJ') {
          const arrayMatch = trimmed.match(/^\[(.*)\]\s*TJ$/);
          if (arrayMatch) {
            const content = arrayMatch[1];
            const items = content.match(/\(([^)]*)\)|<([0-9A-Fa-f]*)>/g) || [];
            let text = '';
            for (const item of items) {
              if (item.startsWith('(')) {
                text += item.substring(1, item.length - 1);
              } else if (item.startsWith('<')) {
                const hex = item.substring(1, item.length - 1);
                text += Buffer.from(hex, 'hex').toString('utf-8');
              }
            }
            if (text) {
              processTextItem(text);
            }
          }
        }
      }
      
      function processTextItem(text) {
        const regex = /\{\{\s*([a-zA-Z0-9_(),.-]+)\s*\}\}/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const fieldName = match[1].trim();
          const absX = currentX + textX;
          const absY = currentY + textY;
          const canvasY = pageHeight - absY;
          
          let readableFont = 'Arial';
          if (currentFont.toLowerCase().includes('times')) readableFont = 'Times New Roman';
          else if (currentFont.toLowerCase().includes('helvetica')) readableFont = 'Helvetica';
          
          // Deduplicate
          if (!foundFields.some(f => f.field_name === fieldName)) {
            foundFields.push({
              field_name: fieldName,
              x: Math.round(absX),
              y: Math.round(canvasY),
              font_size: currentFontSize,
              font_family: readableFont,
              alignment: 'left',
              color: '#000000'
            });
          }
        }
      }
    }
    
    return foundFields;
  } catch (err) {
    console.error("PDF placeholder scanning failed:", err);
    return [];
  }
}

module.exports = {
  scanPDFPlaceholders
};
