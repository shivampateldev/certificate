const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const XLSX = require('xlsx');
const { uploadToCloud, saveGenerationRecord } = require('./cloudService');
const s3Service = require('./s3Service');
const { Batch, Participant, Template } = require('../models');

// Helper function to calculate optimal font size for text fitting using actual PDF font
function calculateOptimalFontSizeWithFont(text, maxWidth, baseFontSize, font, minFontSize = 12) {
    let fontSize = baseFontSize;
    
    // Test different font sizes to find the optimal one
    for (let size = baseFontSize; size >= minFontSize; size -= 2) {
        const textWidth = font.widthOfTextAtSize(text, size);
        
        if (textWidth <= maxWidth) {
            fontSize = size;
            break;
        }
    }
    
    return fontSize;
}

// Helper function to get the appropriate PDF font based on family and style
async function getEmbeddedFont(pdfDoc, fontFamily, bold, italic) {
    try {
        // Map font families to PDF-lib supported fonts
        const fontMap = {
            'Arial': 'Helvetica',
            'Helvetica': 'Helvetica', 
            'Times New Roman': 'Times-Roman',
            'Georgia': 'Times-Roman', // Fallback to Times
            'Verdana': 'Helvetica', // Fallback to Helvetica
            'Trebuchet MS': 'Helvetica', // Fallback to Helvetica
            'Impact': 'Helvetica-Bold', // Impact is always bold-like
            'Comic Sans MS': 'Helvetica' // Fallback to Helvetica
        };
        
        const baseFontName = fontMap[fontFamily] || 'Helvetica';
        
        // Handle Impact specially (it's inherently bold)
        if (fontFamily === 'Impact') {
            return await pdfDoc.embedFont('Helvetica-Bold');
        }
        
        // Build font name based on style
        let fontName = baseFontName;
        if (baseFontName === 'Times-Roman') {
            if (bold && italic) {
                fontName = 'Times-BoldItalic';
            } else if (bold) {
                fontName = 'Times-Bold';
            } else if (italic) {
                fontName = 'Times-Italic';
            }
        } else { // Helvetica variants
            if (bold && italic) {
                fontName = 'Helvetica-BoldOblique';
            } else if (bold) {
                fontName = 'Helvetica-Bold';
            } else if (italic) {
                fontName = 'Helvetica-Oblique';
            }
        }
        
        return await pdfDoc.embedFont(fontName);
    } catch (error) {
        console.warn(`Font embedding failed for ${fontFamily}, using Helvetica:`, error.message);
        return await pdfDoc.embedFont('Helvetica');
    }
}

// Generate single certificate
async function generateCertificate({ templatePath, name, certificateId, textConfig, category = 'Technical' }) {
    try {
        const outputDir = 'uploads/certificates/';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const templateExt = path.extname(templatePath).toLowerCase();
        const outputPath = path.join(outputDir, `${certificateId}.pdf`);

        if (templateExt === '.pdf') {
            // Handle PDF template
            const existingPdfBytes = fs.readFileSync(templatePath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width: pageWidth, height: pageHeight } = firstPage.getSize();

            // Add name with automatic centering and scaling
            if (textConfig.name) {
                // Get the appropriate font based on style
                const nameFont = await getEmbeddedFont(pdfDoc, textConfig.name.fontFamily, textConfig.name.bold, textConfig.name.italic);
                
                // Calculate maximum width (80% of page width for padding)
                const maxTextWidth = pageWidth * 0.8;
                
                // Calculate optimal font size using actual font metrics
                const optimalNameFontSize = calculateOptimalFontSizeWithFont(
                    name, 
                    maxTextWidth, 
                    textConfig.name.fontSize,
                    nameFont
                );
                
                // Calculate text width using the actual font
                const nameWidth = nameFont.widthOfTextAtSize(name, optimalNameFontSize);
                const centeredNameX = (pageWidth - nameWidth) / 2;
                
                firstPage.drawText(name, {
                    x: centeredNameX,
                    y: textConfig.name.y,
                    size: optimalNameFontSize,
                    font: nameFont,
                    color: rgb(
                        textConfig.name.color.r / 255,
                        textConfig.name.color.g / 255,
                        textConfig.name.color.b / 255
                    )
                });
            }

            // Add certificate ID with manual positioning (no auto-centering)
            if (textConfig.certificateId) {
                // Get the appropriate font based on style
                const idFont = await getEmbeddedFont(pdfDoc, textConfig.certificateId.fontFamily, textConfig.certificateId.bold, textConfig.certificateId.italic);
                
                firstPage.drawText(certificateId, {
                    x: textConfig.certificateId.x,
                    y: textConfig.certificateId.y,
                    size: textConfig.certificateId.fontSize,
                    font: idFont,
                    color: rgb(
                        textConfig.certificateId.color.r / 255,
                        textConfig.certificateId.color.g / 255,
                        textConfig.certificateId.color.b / 255
                    )
                });
            }

            const pdfBytes = await pdfDoc.save();
            fs.writeFileSync(outputPath, pdfBytes);
        } else {
            // Handle image template (PNG, JPG) - Convert to PDF first
            const imageBytes = fs.readFileSync(templatePath);
            const pdfDoc = await PDFDocument.create();
            
            let embeddedImage;
            if (templateExt === '.png') {
                embeddedImage = await pdfDoc.embedPng(imageBytes);
            } else {
                embeddedImage = await pdfDoc.embedJpg(imageBytes);
            }
            
            const { width: originalWidth, height: originalHeight } = embeddedImage.scale(1);
            
            // Get canvas dimensions from textConfig (if available) or use original
            const canvasWidth = textConfig.canvasWidth || originalWidth;
            const canvasHeight = textConfig.canvasHeight || originalHeight;
            
            // Calculate scaling factors
            const scaleX = originalWidth / canvasWidth;
            const scaleY = originalHeight / canvasHeight;
            
            const page = pdfDoc.addPage([originalWidth, originalHeight]);
            
            // Draw the image as background
            page.drawImage(embeddedImage, {
                x: 0,
                y: 0,
                width: originalWidth,
                height: originalHeight,
            });

            // Add name text with automatic centering and scaling
            if (textConfig.name) {
                // Get the appropriate font based on style
                const nameFont = await getEmbeddedFont(pdfDoc, textConfig.name.fontFamily, textConfig.name.bold, textConfig.name.italic);
                
                // Calculate maximum width (80% of original width for padding)
                const maxTextWidth = originalWidth * 0.8;
                
                // Calculate optimal font size using actual font metrics
                const scaledBaseFontSize = textConfig.name.fontSize * Math.min(scaleX, scaleY);
                const optimalNameFontSize = calculateOptimalFontSizeWithFont(
                    name, 
                    maxTextWidth, 
                    scaledBaseFontSize,
                    nameFont
                );
                
                // Calculate text width using the actual font and center it
                const nameWidth = nameFont.widthOfTextAtSize(name, optimalNameFontSize);
                const centeredNameX = (originalWidth - nameWidth) / 2;
                
                const scaledY = originalHeight - (textConfig.name.y * scaleY); // Flip Y and scale
                
                page.drawText(name, {
                    x: centeredNameX,
                    y: scaledY,
                    size: optimalNameFontSize,
                    font: nameFont,
                    color: rgb(
                        textConfig.name.color.r / 255,
                        textConfig.name.color.g / 255,
                        textConfig.name.color.b / 255
                    )
                });
            }

            // Add certificate ID text with manual positioning (no auto-centering)
            if (textConfig.certificateId) {
                // Get the appropriate font based on style
                const idFont = await getEmbeddedFont(pdfDoc, textConfig.certificateId.fontFamily, textConfig.certificateId.bold, textConfig.certificateId.italic);
                
                const scaledX = textConfig.certificateId.x * scaleX;
                const scaledY = originalHeight - (textConfig.certificateId.y * scaleY); // Flip Y and scale
                const scaledFontSize = textConfig.certificateId.fontSize * Math.min(scaleX, scaleY);
                
                page.drawText(certificateId, {
                    x: scaledX,
                    y: scaledY,
                    size: scaledFontSize,
                    font: idFont,
                    color: rgb(
                        textConfig.certificateId.color.r / 255,
                        textConfig.certificateId.color.g / 255,
                        textConfig.certificateId.color.b / 255
                    )
                });
            }

            const pdfBytes = await pdfDoc.save();
            fs.writeFileSync(outputPath, pdfBytes);
        }

        // Upload to cloud if configured
        let cloudUrl = null;
        try {
            cloudUrl = await uploadToCloud(outputPath, `certificates/${certificateId}.pdf`);
        } catch (error) {
            console.warn('Cloud upload failed:', error.message);
            // Don't throw error - local generation is still successful
        }

        // Save generation record for reporting
        try {
            await saveGenerationRecord({
                name,
                certificateId,
                category,
                localPath: outputPath,
                cloudUrl,
                generatedAt: new Date()
            });
        } catch (error) {
            console.warn('Failed to save generation record:', error.message);
            // Don't throw error - certificate generation is still successful
        }

        return { localPath: outputPath, cloudUrl };
    } catch (error) {
        throw new Error(`Certificate generation failed: ${error.message}`);
    }
}

// Process bulk certificates from Excel
async function processBulkCertificates({ excelPath, templatePath, textConfig }) {
    try {
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const results = [];

        for (const row of data) {
            const { Sr_no, Name, Email, Certificate_ID, Category } = row;

            if (!Name || !Certificate_ID) {
                results.push({
                    srNo: Sr_no,
                    name: Name,
                    email: Email,
                    status: 'failed',
                    error: 'Missing required data (Name and Certificate_ID are required)'
                });
                continue;
            }

            // Default category if not provided
            const category = Category || 'Technical';
            
            // Validate category
            const validCategories = ['Technical', 'Non-Technical', 'Administrative', 'Spiritual'];
            const finalCategory = validCategories.includes(category) ? category : 'Technical';

            try {
                const certificateResult = await generateCertificate({
                    templatePath,
                    name: Name,
                    certificateId: Certificate_ID,
                    textConfig,
                    category: finalCategory
                });

                results.push({
                    srNo: Sr_no,
                    name: Name,
                    email: Email,
                    certificateId: Certificate_ID,
                    category: finalCategory,
                    localPath: certificateResult.localPath,
                    cloudUrl: certificateResult.cloudUrl,
                    status: 'success'
                });
            } catch (error) {
                results.push({
                    srNo: Sr_no,
                    name: Name,
                    email: Email,
                    category: finalCategory,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return results;
    } catch (error) {
        throw new Error(`Bulk processing failed: ${error.message}`);
    }
}

// Generate certificates for a batch with progress tracking
async function generateBatchCertificates(batchId, progressCallback = null) {
    try {
        // Get batch with template and participants
        const batch = await Batch.findByPk(batchId, {
            include: [
                {
                    model: Template,
                    as: 'template',
                    required: true
                },
                {
                    model: Participant,
                    as: 'participants',
                    required: true
                }
            ]
        });

        if (!batch) {
            throw new Error(`Batch with ID ${batchId} not found`);
        }

        if (!batch.template) {
            throw new Error(`No template assigned to batch ${batchId}`);
        }

        if (!batch.participants || batch.participants.length === 0) {
            throw new Error(`No participants found in batch ${batchId}`);
        }

        // Update batch status to processing
        await batch.update({ status: 'processing' });

        const results = {
            batchId,
            totalParticipants: batch.participants.length,
            successful: 0,
            failed: 0,
            certificates: [],
            errors: []
        };

        // Get template configuration
        const templateConfig = batch.template.templateData || {};
        const templatePath = batch.template.filePath;

        if (!templatePath || !fs.existsSync(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }

        // Process each participant
        for (let i = 0; i < batch.participants.length; i++) {
            const participant = batch.participants[i];
            
            try {
                // Generate certificate for participant
                const certificateResult = await generateCertificate({
                    templatePath,
                    name: participant.name,
                    certificateId: participant.certificateId,
                    textConfig: templateConfig,
                    category: batch.eventCategories[0] || 'Technical'
                });

                // Upload to S3 with organized structure
                const s3Result = await s3Service.uploadCertificate(
                    certificateResult.localPath,
                    batchId,
                    participant.certificateId,
                    batch.eventCategories[0] || 'Technical',
                    {
                        participantId: participant.id.toString(),
                        participantName: participant.name,
                        batchName: batch.name
                    }
                );

                // Update participant with certificate paths
                await participant.update({
                    certificatePath: certificateResult.localPath,
                    cloudUrl: s3Result.url
                });

                results.certificates.push({
                    participantId: participant.id,
                    name: participant.name,
                    certificateId: participant.certificateId,
                    localPath: certificateResult.localPath,
                    cloudUrl: s3Result.url,
                    s3Key: s3Result.key,
                    certificatePath: s3Result.certificatePath
                });

                results.successful++;

                // Call progress callback if provided
                if (progressCallback) {
                    progressCallback({
                        batchId,
                        processed: i + 1,
                        total: batch.participants.length,
                        successful: results.successful,
                        failed: results.failed,
                        currentParticipant: participant.name
                    });
                }

            } catch (error) {
                console.error(`Failed to generate certificate for participant ${participant.id}:`, error);
                
                results.errors.push({
                    participantId: participant.id,
                    name: participant.name,
                    certificateId: participant.certificateId,
                    error: error.message
                });

                results.failed++;

                // Call progress callback for failed items too
                if (progressCallback) {
                    progressCallback({
                        batchId,
                        processed: i + 1,
                        total: batch.participants.length,
                        successful: results.successful,
                        failed: results.failed,
                        currentParticipant: participant.name,
                        error: error.message
                    });
                }
            }
        }

        // Update batch with final counts and status
        const finalStatus = results.failed === 0 ? 'completed' : 
                           results.successful === 0 ? 'failed' : 'completed';
        
        await batch.update({
            certificatesGenerated: results.successful,
            status: finalStatus
        });

        return results;

    } catch (error) {
        // Update batch status to failed
        try {
            await Batch.update(
                { status: 'failed' },
                { where: { id: batchId } }
            );
        } catch (updateError) {
            console.error('Failed to update batch status:', updateError);
        }

        throw new Error(`Batch certificate generation failed: ${error.message}`);
    }
}

// Get certificate generation progress for a batch
async function getBatchGenerationProgress(batchId) {
    try {
        const batch = await Batch.findByPk(batchId, {
            include: [
                {
                    model: Participant,
                    as: 'participants',
                    attributes: ['id', 'name', 'certificateId', 'certificatePath', 'cloudUrl']
                }
            ]
        });

        if (!batch) {
            throw new Error(`Batch with ID ${batchId} not found`);
        }

        const totalParticipants = batch.participants.length;
        const generatedCertificates = batch.participants.filter(p => p.certificatePath).length;

        return {
            batchId,
            status: batch.status,
            totalParticipants,
            certificatesGenerated: generatedCertificates,
            progress: totalParticipants > 0 ? (generatedCertificates / totalParticipants) * 100 : 0,
            participants: batch.participants.map(p => ({
                id: p.id,
                name: p.name,
                certificateId: p.certificateId,
                hasLocalCertificate: !!p.certificatePath,
                hasCloudCertificate: !!p.cloudUrl,
                certificatePath: p.certificatePath,
                cloudUrl: p.cloudUrl
            }))
        };

    } catch (error) {
        throw new Error(`Failed to get batch progress: ${error.message}`);
    }
}

// Regenerate failed certificates in a batch
async function regenerateFailedCertificates(batchId, progressCallback = null) {
    try {
        const batch = await Batch.findByPk(batchId, {
            include: [
                {
                    model: Template,
                    as: 'template',
                    required: true
                },
                {
                    model: Participant,
                    as: 'participants',
                    where: {
                        certificatePath: null // Only participants without certificates
                    },
                    required: false
                }
            ]
        });

        if (!batch) {
            throw new Error(`Batch with ID ${batchId} not found`);
        }

        if (!batch.participants || batch.participants.length === 0) {
            return {
                batchId,
                message: 'No failed certificates to regenerate',
                totalParticipants: 0,
                successful: 0,
                failed: 0
            };
        }

        // Update batch status to processing
        await batch.update({ status: 'processing' });

        const results = {
            batchId,
            totalParticipants: batch.participants.length,
            successful: 0,
            failed: 0,
            certificates: [],
            errors: []
        };

        const templateConfig = batch.template.templateData || {};
        const templatePath = batch.template.filePath;

        // Process each failed participant
        for (let i = 0; i < batch.participants.length; i++) {
            const participant = batch.participants[i];
            
            try {
                const certificateResult = await generateCertificate({
                    templatePath,
                    name: participant.name,
                    certificateId: participant.certificateId,
                    textConfig: templateConfig,
                    category: batch.eventCategories[0] || 'Technical'
                });

                const s3Result = await s3Service.uploadCertificate(
                    certificateResult.localPath,
                    batchId,
                    participant.certificateId,
                    batch.eventCategories[0] || 'Technical',
                    {
                        participantId: participant.id.toString(),
                        participantName: participant.name,
                        batchName: batch.name,
                        regenerated: true
                    }
                );

                await participant.update({
                    certificatePath: certificateResult.localPath,
                    cloudUrl: s3Result.url
                });

                results.certificates.push({
                    participantId: participant.id,
                    name: participant.name,
                    certificateId: participant.certificateId,
                    localPath: certificateResult.localPath,
                    cloudUrl: s3Result.url
                });

                results.successful++;

                if (progressCallback) {
                    progressCallback({
                        batchId,
                        processed: i + 1,
                        total: batch.participants.length,
                        successful: results.successful,
                        failed: results.failed,
                        currentParticipant: participant.name
                    });
                }

            } catch (error) {
                console.error(`Failed to regenerate certificate for participant ${participant.id}:`, error);
                
                results.errors.push({
                    participantId: participant.id,
                    name: participant.name,
                    certificateId: participant.certificateId,
                    error: error.message
                });

                results.failed++;
            }
        }

        // Update batch certificate count
        const totalGenerated = await Participant.count({
            where: {
                batchId,
                certificatePath: { [require('sequelize').Op.ne]: null }
            }
        });

        await batch.update({
            certificatesGenerated: totalGenerated,
            status: 'completed'
        });

        return results;

    } catch (error) {
        throw new Error(`Failed to regenerate certificates: ${error.message}`);
    }
}

module.exports = {
    generateCertificate,
    processBulkCertificates,
    generateBatchCertificates,
    getBatchGenerationProgress,
    regenerateFailedCertificates
};