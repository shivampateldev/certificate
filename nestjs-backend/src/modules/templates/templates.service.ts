import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    createTemplateDto: CreateTemplateDto,
    imageBuffer?: Buffer,
    imageMimeType?: string,
  ) {
    const { name, description, categories, tags, width, height, dpi } =
      createTemplateDto;

    if (!imageBuffer) {
      throw new BadRequestException('Template image is required');
    }

    // Convert image to base64
    const imageBase64 = imageBuffer.toString('base64');
    const imageUrl = `data:${imageMimeType};base64,${imageBase64}`;

    const template = await this.prisma.template.create({
      data: {
        organizationId,
        userId,
        name,
        description,
        imageUrl,
        imageBase64,
        imageMimeType,
        imageSize: imageBuffer.length,
        width: width || 800,
        height: height || 600,
        dpi: dpi || 300,
        categories: categories || [],
        tags: tags || [],
        status: 'DRAFT',
        fields: [],
      },
    });

    this.logger.log(`Template created: ${name}`);
    return template;
  }

  async findAll(organizationId: string, skip = 0, take = 10) {
    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.template.count({ where: { organizationId } }),
    ]);

    return {
      data: templates,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string, organizationId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async update(
    id: string,
    organizationId: string,
    updateTemplateDto: UpdateTemplateDto,
  ) {
    const template = await this.findOne(id, organizationId);

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        name: updateTemplateDto.name ?? template.name,
        description: updateTemplateDto.description ?? template.description,
        categories: updateTemplateDto.categories ?? template.categories,
        tags: updateTemplateDto.tags ?? template.tags,
        fields: updateTemplateDto.fields ?? template.fields,
        status: (updateTemplateDto.status ?? template.status) as any,
      },
    });

    this.logger.log(`Template updated: ${id}`);
    return updated;
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.template.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    this.logger.log(`Template deleted: ${id}`);
    return { message: 'Template deleted successfully' };
  }

  async publish(id: string, organizationId: string) {
    const template = await this.findOne(id, organizationId);

    if (!template.fields || (template.fields as any[]).length === 0) {
      throw new BadRequestException('Template must have at least one field');
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    this.logger.log(`Template published: ${id}`);
    return updated;
  }

  async updateFields(
    id: string,
    organizationId: string,
    fields: Record<string, any>[],
  ) {
    const template = await this.findOne(id, organizationId);

    const updated = await this.prisma.template.update({
      where: { id },
      data: { fields },
    });

    this.logger.log(`Template fields updated: ${id}`);
    return updated;
  }

  async incrementUsage(id: string) {
    return this.prisma.template.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
