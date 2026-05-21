import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';
  private readonly maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '52428800');
  private readonly allowedMimeTypes = (
    process.env.ALLOWED_TEMPLATE_TYPES || 'image/png,image/jpeg,application/pdf'
  ).split(',');

  constructor() {
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    organizationId: string,
    fileType = 'template',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
      );
    }

    // Validate MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    const fileName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join(this.uploadDir, organizationId, fileType);
    const fullPath = path.join(filePath, fileName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    // Save file
    fs.writeFileSync(fullPath, file.buffer);

    this.logger.log(`File uploaded: ${fileName}`);

    return {
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: fullPath,
      url: `/uploads/${organizationId}/${fileType}/${fileName}`,
    };
  }

  async deleteFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`File deleted: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
    }
  }

  async processImage(
    file: Express.Multer.File,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
    },
  ) {
    try {
      let image = sharp(file.buffer);

      if (options?.width || options?.height) {
        image = image.resize(options.width, options.height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const processedBuffer = await image
        .jpeg({ quality: options?.quality || 80 })
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      throw new BadRequestException('Failed to process image');
    }
  }

  async generatePDF(
    content: string,
    fileName: string,
    organizationId: string,
  ) {
    const filePath = path.join(this.uploadDir, organizationId, 'certificates');

    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    const fullPath = path.join(filePath, fileName);

    // This is a placeholder - actual PDF generation would use pdfkit or similar
    fs.writeFileSync(fullPath, content);

    this.logger.log(`PDF generated: ${fileName}`);

    return {
      fileName,
      path: fullPath,
      url: `/uploads/${organizationId}/certificates/${fileName}`,
    };
  }

  async getFileStream(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    return fs.createReadStream(filePath);
  }

  async getFileBuffer(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    return fs.readFileSync(filePath);
  }

  async listFiles(organizationId: string, fileType = 'template') {
    const filePath = path.join(this.uploadDir, organizationId, fileType);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const files = fs.readdirSync(filePath);
    return files.map((file) => ({
      name: file,
      path: path.join(filePath, file),
      url: `/uploads/${organizationId}/${fileType}/${file}`,
    }));
  }

  async cleanupOldFiles(organizationId: string, daysOld = 30) {
    const filePath = path.join(this.uploadDir, organizationId);

    if (!fs.existsSync(filePath)) {
      return;
    }

    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);

      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (now - stat.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          this.logger.log(`Old file deleted: ${filePath}`);
        }
      });
    };

    walkDir(filePath);
  }
}
