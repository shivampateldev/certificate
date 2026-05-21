import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    createCampaignDto: CreateCampaignDto,
  ) {
    const { name, description, templateId } = createCampaignDto;

    // Verify template exists
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        userId,
        templateId,
        name,
        description,
        status: 'DRAFT',
      },
      include: {
        template: true,
      },
    });

    this.logger.log(`Campaign created: ${name}`);
    return campaign;
  }

  async findAll(organizationId: string, skip = 0, take = 10) {
    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { organizationId },
        skip,
        take,
        include: {
          template: true,
          certificates: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where: { organizationId } }),
    ]);

    return {
      data: campaigns,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        template: true,
        certificates: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(
    id: string,
    organizationId: string,
    updateCampaignDto: UpdateCampaignDto,
  ) {
    const campaign = await this.findOne(id, organizationId);

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: updateCampaignDto.name ?? campaign.name,
        description: updateCampaignDto.description ?? campaign.description,
        status: (updateCampaignDto.status ?? campaign.status) as any,
      },
      include: {
        template: true,
      },
    });

    this.logger.log(`Campaign updated: ${id}`);
    return updated;
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED', deletedAt: new Date() },
    });

    this.logger.log(`Campaign deleted: ${id}`);
    return { message: 'Campaign deleted successfully' };
  }

  async updateStatus(id: string, organizationId: string, status: string) {
    const validStatuses = [
      'DRAFT',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid campaign status');
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: { status: status as any },
    });

    this.logger.log(`Campaign status updated: ${id} -> ${status}`);
    return campaign;
  }

  async getStats(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);

    const stats = {
      totalCertificates: campaign.totalCertificates,
      generatedCount: campaign.generatedCount,
      failedCount: campaign.failedCount,
      sentCount: campaign.sentCount,
      successRate:
        campaign.totalCertificates > 0
          ? ((campaign.generatedCount / campaign.totalCertificates) * 100).toFixed(2)
          : 0,
      failureRate:
        campaign.totalCertificates > 0
          ? ((campaign.failedCount / campaign.totalCertificates) * 100).toFixed(2)
          : 0,
    };

    return stats;
  }
}
