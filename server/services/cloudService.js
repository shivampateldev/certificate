const fs = require('fs');
const path = require('path');
const s3Service = require('./s3Service');
const { Batch, Participant, CertificateIdLog } = require('../models');

// In-memory storage for generation records (backward compatibility)
let generationRecords = [];

// Load existing records from file if it exists
const RECORDS_FILE = path.join(__dirname, '../data/generation-records.json');

function loadRecords() {
    try {
        if (fs.existsSync(RECORDS_FILE)) {
            const data = fs.readFileSync(RECORDS_FILE, 'utf8');
            generationRecords = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading generation records:', error);
        generationRecords = [];
    }
}

function saveRecords() {
    try {
        const dataDir = path.dirname(RECORDS_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(RECORDS_FILE, JSON.stringify(generationRecords, null, 2));
    } catch (error) {
        console.error('Error saving generation records:', error);
    }
}

// Load records on startup
loadRecords();

/**
 * Upload file to cloud storage (S3)
 * @param {string} filePath - Local file path
 * @param {string} cloudPath - Cloud storage path
 * @returns {Promise<string>} Cloud URL
 */
async function uploadToCloud(filePath, cloudPath) {
    try {
        // Check if AWS credentials are configured
        if (!process.env.AWS_ACCESS_KEY_ID || 
            process.env.AWS_ACCESS_KEY_ID === 'your_aws_access_key' ||
            !process.env.AWS_SECRET_ACCESS_KEY || 
            process.env.AWS_SECRET_ACCESS_KEY === 'your_aws_secret_key') {
            console.log('AWS credentials not configured, skipping cloud upload');
            return null;
        }

        const result = await s3Service.uploadFile(filePath, cloudPath);
        return result.url;
    } catch (error) {
        console.error('Cloud upload failed:', error.message);
        // Return null if upload fails, but don't throw error for backward compatibility
        return null;
    }
}

/**
 * Save certificate generation record
 * @param {object} recordData - Certificate generation data
 * @returns {Promise<object>} Saved record
 */
async function saveGenerationRecord(recordData) {
    try {
        const recordWithId = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            ...recordData,
            generatedAt: recordData.generatedAt || new Date()
        };
        
        // Save to in-memory array and JSON file for backward compatibility
        generationRecords.push(recordWithId);
        saveRecords();
        
        // If we have database models available, save to database as well
        if (Participant && recordData.batchId) {
            // This will be used when we have a proper batch system
            console.log('Would save to database:', recordWithId);
        }
        
        return recordWithId;
    } catch (error) {
        console.error('Failed to save generation record:', error);
        // Return a basic record instead of throwing error
        return {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            ...recordData,
            generatedAt: recordData.generatedAt || new Date()
        };
    }
}

/**
 * Get generation statistics
 * @returns {object} Generation statistics
 */
function getGenerationStats() {
    const stats = {
        total: generationRecords.length,
        categories: {
            Technical: 0,
            'Non-Technical': 0,
            Administrative: 0,
            Spiritual: 0,
            Humanitarian: 0,
            STEM: 0
        },
        recent: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0
        },
        cloudUploaded: 0
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    generationRecords.forEach(record => {
        // Category stats
        if (stats.categories.hasOwnProperty(record.category)) {
            stats.categories[record.category]++;
        }

        // Cloud upload stats
        if (record.cloudUrl) {
            stats.cloudUploaded++;
        }

        // Time-based stats
        const recordDate = new Date(record.generatedAt);
        if (recordDate >= today) {
            stats.recent.today++;
        }
        if (recordDate >= weekAgo) {
            stats.recent.thisWeek++;
        }
        if (recordDate >= monthAgo) {
            stats.recent.thisMonth++;
        }
    });

    return stats;
}

/**
 * Get detailed generation records with filtering
 * @param {object} filters - Filter options
 * @returns {object} Filtered records with pagination
 */
function getGenerationRecords(filters = {}) {
    let filteredRecords = [...generationRecords];

    // Filter by category
    if (filters.category && filters.category !== 'all') {
        filteredRecords = filteredRecords.filter(record => record.category === filters.category);
    }

    // Filter by date range
    if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        filteredRecords = filteredRecords.filter(record => new Date(record.generatedAt) >= startDate);
    }

    if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        filteredRecords = filteredRecords.filter(record => new Date(record.generatedAt) <= endDate);
    }

    // Sort by date (newest first)
    filteredRecords.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
        records: filteredRecords.slice(startIndex, endIndex),
        total: filteredRecords.length,
        page,
        totalPages: Math.ceil(filteredRecords.length / limit)
    };
}

/**
 * Get cloud storage configuration status
 * @returns {Promise<object>} Configuration status
 */
async function getCloudStatus() {
    try {
        const s3Access = await s3Service.checkBucketAccess();
        
        return {
            configured: !!process.env.AWS_ACCESS_KEY_ID,
            s3: {
                configured: !!process.env.AWS_ACCESS_KEY_ID,
                accessible: s3Access,
                bucket: process.env.AWS_S3_BUCKET,
                region: process.env.AWS_REGION || 'us-east-1'
            },
            ses: {
                configured: !!process.env.AWS_ACCESS_KEY_ID,
                region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1'
            }
        };
    } catch (error) {
        console.error('Error checking cloud status:', error);
        return {
            configured: false,
            s3: { configured: false, accessible: false },
            ses: { configured: false }
        };
    }
}

module.exports = {
    uploadToCloud,
    saveGenerationRecord,
    getGenerationStats,
    getGenerationRecords,
    getCloudStatus,
    s3Service
};