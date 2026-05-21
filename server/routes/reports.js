const express = require('express');
const reportingService = require('../services/reportingService');
const { getGenerationStats, getGenerationRecords, getCloudStatus } = require('../services/cloudService');

const router = express.Router();

// GET /api/reports/dashboard - Get dashboard summary statistics
router.get('/dashboard', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateRange = {};
        
        if (startDate) dateRange.startDate = startDate;
        if (endDate) dateRange.endDate = endDate;

        const stats = await reportingService.getDashboardStats(dateRange);
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET /api/reports/certificates - Get certificate generation reports
router.get('/certificates', async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            eventCategories: req.query.eventCategories ? req.query.eventCategories.split(',') : undefined,
            page: req.query.page || 1,
            limit: req.query.limit || 50
        };

        const report = await reportingService.getCertificateReports(filters);
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Certificate reports error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET /api/reports/emails - Get email campaign analytics
router.get('/emails', async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            campaignIds: req.query.campaignIds ? req.query.campaignIds.split(',').map(id => parseInt(id)) : undefined,
            page: req.query.page || 1,
            limit: req.query.limit || 50
        };

        const report = await reportingService.getEmailCampaignReports(filters);
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Email campaign reports error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET /api/reports/categories - Get event category statistics
router.get('/categories', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateRange = {};
        
        if (startDate) dateRange.startDate = startDate;
        if (endDate) dateRange.endDate = endDate;

        const stats = await reportingService.getEventCategoryStats(dateRange);
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Category stats error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// POST /api/reports/export - Export report data
router.post('/export', async (req, res) => {
    try {
        const { reportType, format, filters } = req.body;
        
        if (!reportType || !format) {
            return res.status(400).json({
                success: false,
                error: 'Report type and format are required'
            });
        }

        const exportData = await reportingService.exportReportData(reportType, format, filters);
        
        res.setHeader('Content-Type', exportData.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
        res.send(exportData.data);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Legacy endpoints for backward compatibility
// Get generation statistics
router.get('/stats', (req, res) => {
    try {
        const stats = getGenerationStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get detailed generation records
router.get('/records', (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            page: req.query.page,
            limit: req.query.limit
        };

        const result = getGenerationRecords(filters);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cloud configuration status
router.get('/cloud-status', (req, res) => {
    try {
        const status = getCloudStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export records as CSV (legacy)
router.get('/export', (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const result = getGenerationRecords({ ...filters, limit: 10000 }); // Get all records
        
        // Convert to CSV
        const csvHeaders = 'Name,Certificate ID,Category,Generated At,Cloud URL,Local Path\n';
        const csvRows = result.records.map(record => {
            return [
                `"${record.name}"`,
                `"${record.certificateId}"`,
                `"${record.category}"`,
                `"${new Date(record.generatedAt).toISOString()}"`,
                `"${record.cloudUrl || ''}"`,
                `"${record.localPath || ''}"`
            ].join(',');
        }).join('\n');

        const csv = csvHeaders + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="certificate-generation-report.csv"');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;