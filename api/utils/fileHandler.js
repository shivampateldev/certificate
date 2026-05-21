/**
 * File handling utilities for uploads and storage
 */

const fs = require('fs');
const path = require('path');
const Validators = require('./validators');

const FileHandler = {
  /**
   * Get storage directory path
   */
  getStoragePath(type = 'uploads') {
    const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
    let basePath;

    if (isVercel) {
      basePath = '/tmp';
    } else {
      basePath = path.join(__dirname, '..', '..', 'storage');
    }

    const fullPath = path.join(basePath, type);

    // Create directory if it doesn't exist
    if (!isVercel && !fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
      } catch (e) {
        console.error(`Failed to create directory ${fullPath}:`, e);
      }
    }

    return fullPath;
  },

  /**
   * Save uploaded file
   */
  saveFile(buffer, filename, type = 'uploads') {
    try {
      const sanitized = Validators.sanitizeFilename(filename);
      const storagePath = this.getStoragePath(type);
      const filePath = path.join(storagePath, sanitized);

      fs.writeFileSync(filePath, buffer);

      return {
        success: true,
        filename: sanitized,
        path: filePath,
        relativePath: `/storage/${type}/${sanitized}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Read file
   */
  readFile(filePath) {
    try {
      return fs.readFileSync(filePath);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  },

  /**
   * Delete file
   */
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if file exists
   */
  fileExists(filePath) {
    return fs.existsSync(filePath);
  },

  /**
   * Get file size
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Get file extension
   */
  getFileExtension(filename) {
    return path.extname(filename).toLowerCase().substring(1);
  },

  /**
   * Validate file type
   */
  isValidFileType(filename, allowedTypes = ['png', 'pdf', 'jpg', 'jpeg', 'csv', 'xlsx', 'xls']) {
    const ext = this.getFileExtension(filename);
    return allowedTypes.includes(ext);
  },

  /**
   * Create directory if not exists
   */
  ensureDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * List files in directory
   */
  listFiles(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }
      return fs.readdirSync(dirPath);
    } catch (error) {
      return [];
    }
  },

  /**
   * Clean up old files (older than specified days)
   */
  cleanupOldFiles(dirPath, daysOld = 30) {
    try {
      if (!fs.existsSync(dirPath)) {
        return { success: true, deleted: 0 };
      }

      const files = fs.readdirSync(dirPath);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deleted = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      }

      return { success: true, deleted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = FileHandler;
