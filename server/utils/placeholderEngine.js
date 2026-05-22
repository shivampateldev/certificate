/**
 * Advanced Placeholder Transform Engine
 * Parses double-braced fields and applies transform functions (.upper, .lower, .title, .trim)
 */

function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function evaluatePlaceholder(fieldName, dataRow) {
  const parts = fieldName.split('.');
  const baseKey = parts[0].trim();
  const transformer = parts[1] ? parts[1].trim().toLowerCase() : null;

  let value = '';
  const searchKey = baseKey.toLowerCase();
  for (const k of Object.keys(dataRow)) {
    if (k.toLowerCase() === searchKey) {
      value = String(dataRow[k]);
      break;
    }
  }

  if (transformer === 'upper') {
    value = value.toUpperCase();
  } else if (transformer === 'lower') {
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

module.exports = {
  evaluatePlaceholder,
  parseAndReplace,
  toTitleCase
};
