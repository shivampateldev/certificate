import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Version,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Version('1')
  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(
      file,
      req.user.organizationId,
      'template',
    );
  }

  @Version('1')
  @Get('list')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List uploaded files' })
  @ApiResponse({ status: 200, description: 'Files listed successfully' })
  async listFiles(@Request() req) {
    return this.filesService.listFiles(req.user.organizationId, 'template');
  }

  @Version('1')
  @Get(':fileName')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Download file' })
  @ApiResponse({ status: 200, description: 'File downloaded' })
  async downloadFile(
    @Request() req,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const filePath = `${process.env.UPLOAD_DIR || './uploads'}/${req.user.organizationId}/template/${fileName}`;
    const stream = await this.filesService.getFileStream(filePath);
    stream.pipe(res);
  }

  @Version('1')
  @Delete(':fileName')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(
    @Request() req,
    @Param('fileName') fileName: string,
  ) {
    const filePath = `${process.env.UPLOAD_DIR || './uploads'}/${req.user.organizationId}/template/${fileName}`;
    await this.filesService.deleteFile(filePath);
    return { message: 'File deleted successfully' };
  }
}
