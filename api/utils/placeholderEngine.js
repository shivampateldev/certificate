/**
 * Advanced Placeholder Transform Engine
 * Supports:
 * - Basic: {{name}}
 * - Transforms: {{name.upper}}, {{name.lower}}, {{name.title}}, {{name.trim}}
 * - Substring: {{name(0,3)}}, {{name(0,5)}}, {{name(-3)}}
 * - Random: {{random_number(6)}}, {{random_number(8)}}
 * - UUID: {{uuid}}, {{uuid_short}}
 * - Date: {{year}}, {{month}}, {{day}}, {{date}}, {{date:YYYY-MM-DD}}
 * - Uppercase: {{name:upper}} (alternative syntax)
 */

const crypto = require('crypto');

function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Generate a random number with specified digits
 */
function generateRandomNumber(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a UUID
 */
function generateUUID(short = false) {
  if (short) {
    return crypto.randomBytes(8).toString('hex');
  }
  return crypto.randomUUID();
}

/**
 * Format date according to pattern
 */
function formatDate(date, pattern) {
  const d = date || new Date();
  
  const replacements = {
    'YYYY': d.getFullYear(),
    'YY': String(d.getFullYear()).slice(-2),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0')
  };
  
  let result = pattern;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(key, value);
  }
  
  return result;
}

/**
 * Extract substring from value
 * Supports: (start, end), (start), (-end)
 */
function extractSubstring(value, args) {
  if (!value || !args) return value;
  
  try {
    const parts = args.split(',').map(s => s.trim());
    
    if (parts.length === 1) {
      // Single argument: could be length or negative index
      const idx = parseInt(parts[0]);
      if (idx < 0) {
        // Negative: take last N characters
        return value.slice(idx);
      }
      return value.substring(0, idx);
    }
    
    if (parts.length >= 2) {
      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);
      
      if (!isNaN(start) && !isNaN(end)) {
        return value.substring(start, end);
      }
      if (!isNaN(start)) {
        return value.substring(start);
      }
    }
  } catch (e) {
    // Return original value if parsing fails
  }
  
  return value;
}

/**
 * Parse placeholder expression
 * Returns { baseKey, args, transformer }
 */
function parsePlaceholderExpression(fieldName) {
  let baseKey = fieldName.trim();
  let args = null;
  let transformer = null;
  
  // Check for transform syntax: {{name.upper}} or {{name:upper}}
  const transformMatch = baseKey.match(/^([^{]+?)[.:](upper|lower|title|trim|uppercase|lowercase)$/i);
  if (transformMatch) {
    baseKey = transformMatch[1];
    transformer = transformMatch[2].toLowerCase();
  }
  
  // Check for function syntax: {{name(0,3)}}, {{random_number(6)}}, {{date:YYYY-MM-DD}}
  const funcMatch = baseKey.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)$/);
  if (funcMatch) {
    baseKey = funcMatch[1];
    args = funcMatch[2];
  }
  
  // Check for date format syntax: {{date:YYYY-MM-DD}}
  const dateFormatMatch = baseKey.match(/^date:(.+)$/);
  if (dateFormatMatch) {
    baseKey = 'date';
    args = dateFormatMatch[1];
  }
  
  return { baseKey: baseKey.trim(), args, transformer };
}

function evaluatePlaceholder(fieldName, dataRow) {
  const { baseKey, args, transformer } = parsePlaceholderExpression(fieldName);
  
  let value = '';
  
  // Handle special placeholders
  if (baseKey === 'random_number' || baseKey === 'randomnumber') {
    const digits = args ? parseInt(args) : 6;
    return String(generateRandomNumber(digits || 6));
  }
  
  if (baseKey === 'uuid') {
    return generateUUID(false);
  }
  
  if (baseKey === 'uuid_short' || baseKey === 'uuidshort') {
    return generateUUID(true);
  }
  
  if (baseKey === 'year') {
    return String(new Date().getFullYear());
  }
  
  if (baseKey === 'month') {
    return String(new Date().getMonth() + 1).padStart(2, '0');
  }
  
  if (baseKey === 'day') {
    return String(new Date().getDate()).padStart(2, '0');
  }
  
  if (baseKey === 'date') {
    const pattern = args || 'YYYY-MM-DD';
    return formatDate(new Date(), pattern);
  }
  
  if (baseKey === 'timestamp') {
    return String(Date.now());
  }
  
  if (baseKey === 'now') {
    return new Date().toISOString();
  }
  
  // Search for value in dataRow (case-insensitive)
  const searchKey = baseKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Supported variant spellings of certificate ID (including common typos)
  const isCertIdKey = [
    'certificateid',
    'certificated',
    'certifiacte_id',
    'certificate_id',
    'certifiacteid',
    'certificateid'
  ].includes(searchKey);

  for (const k of Object.keys(dataRow)) {
    const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isRowCertId = [
      'certificateid',
      'certificated',
      'certifiacte_id',
      'certificate_id',
      'certifiacteid',
      'certificateid'
    ].includes(normKey);
    
    if (isCertIdKey && isRowCertId) {
      value = String(dataRow[k]);
      break;
    }
    
    if (normKey === searchKey) {
      value = String(dataRow[k]);
      break;
    }
  }
  
  // Apply substring if args provided
  if (args && !['random_number', 'randomnumber', 'uuid', 'uuid_short', 'uuidshort', 'year', 'month', 'day', 'date', 'timestamp', 'now'].includes(baseKey)) {
    value = extractSubstring(value, args);
  }
  
  // Apply transforms
  if (transformer === 'upper' || transformer === 'uppercase') {
    value = value.toUpperCase();
  } else if (transformer === 'lower' || transformer === 'lowercase') {
    value = value.toLowerCase();
  } else if (transformer === 'title') {
    value = toTitleCase(value);
  } else if (transformer === 'trim') {
    value = value.trim();
  }

  return value;
}

function parseAndReplace(templateText, dataRow) {
  if (!templateText) return '';
  return templateText.replace(/\{\{([^}]+)\}\}/g, (match, fieldName) => {
    return evaluatePlaceholder(fieldName, dataRow);
  });
}

/**
 * Extract all placeholder names from text
 */
function extractPlaceholders(text) {
  if (!text) return [];
  const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.map(m => m.slice(2, -2).trim());
}

/**
 * Get placeholder info with type detection
 */
function getPlaceholderInfo(placeholder) {
  const { baseKey, args, transformer } = parsePlaceholderExpression(placeholder);
  
  let type = 'field';
  if (['random_number', 'randomnumber'].includes(baseKey)) type = 'random';
  else if (baseKey === 'uuid' || baseKey === 'uuid_short') type = 'uuid';
  else if (['year', 'month', 'day', 'date', 'timestamp', 'now'].includes(baseKey)) type = 'date';
  
  return {
    original: placeholder,
    baseKey,
    args,
    transformer,
    type
  };
}

module.exports = {
  evaluatePlaceholder,
  parseAndReplace,
  extractPlaceholders,
  getPlaceholderInfo,
  toTitleCase,
  generateRandomNumber,
  generateUUID,
  formatDate,
  extractSubstring
};