// Accessibility utility functions

/**
 * Calculate color contrast ratio between two colors
 * @param {string} color1 - First color (hex, rgb, or named)
 * @param {string} color2 - Second color (hex, rgb, or named)
 * @returns {number} Contrast ratio (1-21)
 */
export const getContrastRatio = (color1, color2) => {
  const getLuminance = (color) => {
    // Convert color to RGB values
    let r, g, b;
    
    if (color.startsWith('#')) {
      // Hex color
      const hex = color.slice(1);
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
      // RGB color
      const matches = color.match(/\d+/g);
      r = parseInt(matches[0]);
      g = parseInt(matches[1]);
      b = parseInt(matches[2]);
    } else {
      // Named color - return default safe values
      return color === 'white' ? 1 : 0;
    }
    
    // Convert to relative luminance
    const toLinear = (c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    
    const rLinear = toLinear(r);
    const gLinear = toLinear(g);
    const bLinear = toLinear(b);
    
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Check if color combination meets WCAG contrast requirements
 * @param {string} foreground - Foreground color
 * @param {string} background - Background color
 * @param {string} level - 'AA' or 'AAA'
 * @param {string} size - 'normal' or 'large'
 * @returns {boolean} Whether the combination meets requirements
 */
export const meetsContrastRequirement = (foreground, background, level = 'AA', size = 'normal') => {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  } else {
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  }
};

/**
 * Generate unique ID for form elements
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export const generateId = (prefix = 'element') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

/**
 * Manage focus for modal dialogs
 * @param {HTMLElement} modalElement - Modal container element
 * @returns {Function} Cleanup function
 */
export const manageFocusTrap = (modalElement) => {
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
    
    if (e.key === 'Escape') {
      // Find close button or trigger close
      const closeButton = modalElement.querySelector('[aria-label*="close"], [aria-label*="Close"]');
      if (closeButton) {
        closeButton.click();
      }
    }
  };
  
  // Set initial focus
  if (firstElement) {
    firstElement.focus();
  }
  
  document.addEventListener('keydown', handleTabKey);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Check if user prefers reduced motion
 * @returns {boolean} Whether user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Check if user prefers high contrast
 * @returns {boolean} Whether user prefers high contrast
 */
export const prefersHighContrast = () => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Get appropriate ARIA label for loading states
 * @param {boolean} isLoading - Whether element is in loading state
 * @param {string} defaultLabel - Default label when not loading
 * @param {string} loadingLabel - Label when loading
 * @returns {string} Appropriate ARIA label
 */
export const getLoadingAriaLabel = (isLoading, defaultLabel, loadingLabel = 'Loading') => {
  return isLoading ? `${defaultLabel} - ${loadingLabel}` : defaultLabel;
};

/**
 * Validate form field and return appropriate ARIA attributes
 * @param {*} value - Field value
 * @param {Array} validators - Array of validation functions
 * @param {string} fieldId - Field ID
 * @returns {Object} ARIA attributes object
 */
export const getFieldAriaAttributes = (value, validators = [], fieldId) => {
  const errors = validators
    .map(validator => validator(value))
    .filter(error => error);
  
  const hasError = errors.length > 0;
  
  return {
    'aria-invalid': hasError ? 'true' : 'false',
    'aria-describedby': hasError ? `${fieldId}-error` : undefined,
  };
};

/**
 * Create accessible table headers with sorting
 * @param {string} column - Column name
 * @param {string} sortDirection - 'asc', 'desc', or null
 * @param {Function} onSort - Sort handler function
 * @returns {Object} Props for table header button
 */
export const getTableHeaderProps = (column, sortDirection, onSort) => {
  return {
    'aria-sort': sortDirection === 'asc' ? 'ascending' : 
                 sortDirection === 'desc' ? 'descending' : 'none',
    onClick: () => onSort(column),
    'aria-label': `Sort by ${column} ${
      sortDirection === 'asc' ? 'descending' : 'ascending'
    }`,
  };
};

/**
 * Format file size for screen readers
 * @param {number} bytes - File size in bytes
 * @returns {string} Human readable file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Create accessible progress announcement
 * @param {number} current - Current progress value
 * @param {number} total - Total progress value
 * @param {string} unit - Unit of measurement
 * @returns {string} Progress announcement
 */
export const createProgressAnnouncement = (current, total, unit = 'items') => {
  const percentage = Math.round((current / total) * 100);
  return `Progress: ${current} of ${total} ${unit} completed. ${percentage} percent done.`;
};

/**
 * Debounce function for search inputs to reduce screen reader announcements
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};