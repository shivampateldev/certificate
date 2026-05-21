import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@ApiTags('Templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Version('1')
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(
    @Request() req,
    @Body() createTemplateDto: CreateTemplateDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templatesService.create(
      req.user.organizationId,
      req.user.userId,
      createTemplateDto,
      file?.buffer,
      file?.mimetype,
    );
  }

  @Version('1')
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all templates' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.templatesService.findAll(
      req.user.organizationId,
      skip || 0,
      take || 10,
    );
  }

  @Version('1')
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.templatesService.findOne(id, req.user.organizationId);
  }

  @Version('1')
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(
      id,
      req.user.organizationId,
      updateTemplateDto,
    );
  }

  @Version('1')
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.templatesService.remove(id, req.user.organizationId);
  }

  @Version('1')
  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Publish template' })
  @ApiResponse({ status: 200, description: 'Template published successfully' })
  async publish(@Request() req, @Param('id') id: string) {
    return this.templatesService.publish(id, req.user.organizationId);
  }

  @Version('1')
  @Patch(':id/fields')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update template fields' })
  @ApiResponse({ status: 200, description: 'Template fields updated' })
  async updateFields(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { fields: Record<string, any>[] },
  ) {
    return this.templatesService.updateFields(
      id,
      req.user.organizationId,
      body.fields,
    );
  }
}
