/**
 * CSV and Excel file parsing utilities
 */

const csv = require('csv-parser');
const { Readable } = require('stream');

const CSVParser = {
  /**
   * Parse CSV content
   */
  async parseCSV(buffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];

      Readable.from(buffer.toString())
        .pipe(csv())
        .on('data', (row) => {
          results.push(row);
        })
        .on('error', (error) => {
          errors.push(error.message);
        })
        .on('end', () => {
          if (errors.length > 0) {
            reject(new Error(`CSV parsing error: ${errors.join(', ')}`));
          } else {
            resolve(results);
          }
        });
    });
  },

  /**
   * Parse Excel file (XLSX/XLS)
   * Note: Requires xlsx package
   */
  async parseExcel(buffer) {
    try {
      let XLSX;
      try {
        // Try to require xlsx from different possible locations
        XLSX = require('xlsx');
      } catch (e) {
        try {
          XLSX = require('../../server/node_modules/xlsx');
        } catch (e2) {
          throw new Error('xlsx package not found. Please install it with: npm install xlsx');
        }
      }
      
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data;
    } catch (error) {
      throw new Error(`Excel parsing error: ${error.message}`);
    }
  },

  /**
   * Normalize participant data from CSV/Excel
   */
  normalizeParticipants(rawData) {
    const normalized = [];
    const errors = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // +2 because of header and 0-indexing

      // Find name field (case-insensitive)
      const nameField = Object.keys(row).find(k => 
        k.toLowerCase().includes('name') && !k.toLowerCase().includes('event')
      );
      const name = nameField ? row[nameField]?.toString().trim() : '';

      // Find email field (case-insensitive)
      const emailField = Object.keys(row).find(k => 
        k.toLowerCase().includes('email') || k.toLowerCase().includes('mail')
      );
      const email = emailField ? row[emailField]?.toString().trim().toLowerCase() : '';

      // Find certificate ID field (case-insensitive)
      const certIdField = Object.keys(row).find(k => 
        k.toLowerCase().includes('certificate') || k.toLowerCase().includes('cert_id') || k.toLowerCase().includes('certid')
      );
      const certificate_id = certIdField ? row[certIdField]?.toString().trim() : `CERT-${Date.now()}-${i}`;

      // Collect custom fields
      const custom_fields = {};
      for (const [key, value] of Object.entries(row)) {
        if (!nameField || key !== nameField) {
          if (!emailField || key !== emailField) {
            if (!certIdField || key !== certIdField) {
              custom_fields[key] = value;
            }
          }
        }
      }

      // Validate
      if (!name) {
        errors.push({
          row: rowNum,
          error: 'Missing name',
          data: row
        });
        continue;
      }

      if (!email) {
        errors.push({
          row: rowNum,
          error: 'Missing email',
          data: row
        });
        continue;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({
          row: rowNum,
          error: `Invalid email format: ${email}`,
          data: row
        });
        continue;
      }

      normalized.push({
        name,
        email,
        certificate_id,
        custom_fields
      });
    }

    return {
      participants: normalized,
      errors,
      totalRows: rawData.length,
      successCount: normalized.length,
      errorCount: errors.length
    };
  },

  /**
   * Check for duplicates in normalized data
   */
  checkDuplicates(participants) {
    const emailMap = {};
    const certIdMap = {};
    const duplicates = {
      emails: [],
      certificateIds: []
    };

    for (const p of participants) {
      if (emailMap[p.email]) {
        duplicates.emails.push(p.email);
      } else {
        emailMap[p.email] = true;
      }

      if (p.certificate_id && certIdMap[p.certificate_id]) {
        duplicates.certificateIds.push(p.certificate_id);
      } else if (p.certificate_id) {
        certIdMap[p.certificate_id] = true;
      }
    }

    return {
      hasDuplicates: duplicates.emails.length > 0 || duplicates.certificateIds.length > 0,
      duplicates: {
        emails: [...new Set(duplicates.emails)],
        certificateIds: [...new Set(duplicates.certificateIds)]
      }
    };
  },

  /**
   * Generate CSV from participants
   */
  generateCSV(participants) {
    if (!participants || participants.length === 0) {
      return '';
    }

    // Get all unique keys
    const allKeys = new Set();
    participants.forEach(p => {
      allKeys.add('name');
      allKeys.add('email');
      allKeys.add('certificate_id');
      if (p.custom_fields) {
        Object.keys(p.custom_fields).forEach(k => allKeys.add(k));
      }
    });

    const headers = Array.from(allKeys);
    const rows = [headers.join(',')];

    for (const p of participants) {
      const values = headers.map(h => {
        let value = '';
        if (h === 'name') value = p.name;
        else if (h === 'email') value = p.email;
        else if (h === 'certificate_id') value = p.certificate_id;
        else if (p.custom_fields && p.custom_fields[h]) value = p.custom_fields[h];

        // Escape quotes and wrap in quotes if contains comma
        value = String(value || '');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });

      rows.push(values.join(','));
    }

    return rows.join('\n');
  }
};

module.exports = CSVParser;
