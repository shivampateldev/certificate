import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, createOrgDto: CreateOrganizationDto) {
    const { name, slug, description, email, phone } = createOrgDto;

    // Check if slug already exists
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization slug already exists');
    }

    const organization = await this.prisma.organization.create({
      data: {
        name,
        slug,
        description,
        email,
        phone,
        status: 'ACTIVE',
        subscriptionTier: 'FREE',
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: true,
      },
    });

    this.logger.log(`Organization created: ${name}`);
    return organization;
  }

  async findAll(skip = 0, take = 10) {
    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip,
        take,
        include: {
          members: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count(),
    ]);

    return {
      data: organizations,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({
      where: { slug },
      include: {
        members: true,
      },
    });
  }

  async update(id: string, updateOrgDto: UpdateOrganizationDto) {
    const organization = await this.findOne(id);

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        name: updateOrgDto.name ?? organization.name,
        description: updateOrgDto.description ?? organization.description,
        email: updateOrgDto.email ?? organization.email,
        phone: updateOrgDto.phone ?? organization.phone,
        website: updateOrgDto.website ?? organization.website,
        address: updateOrgDto.address ?? organization.address,
        city: updateOrgDto.city ?? organization.city,
        state: updateOrgDto.state ?? organization.state,
        country: updateOrgDto.country ?? organization.country,
        postalCode: updateOrgDto.postalCode ?? organization.postalCode,
      },
      include: {
        members: true,
      },
    });

    this.logger.log(`Organization updated: ${id}`);
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.organization.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    this.logger.log(`Organization deleted: ${id}`);
    return { message: 'Organization deleted successfully' };
  }

  async addMember(organizationId: string, userId: string, role = 'MEMBER') {
    const organization = await this.findOne(organizationId);

    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role: role as any,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    this.logger.log(`Member added to organization: ${organizationId}`);
    return member;
  }

  async removeMember(organizationId: string, userId: string) {
    await this.prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    this.logger.log(`Member removed from organization: ${organizationId}`);
    return { message: 'Member removed successfully' };
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: string,
  ) {
    const member = await this.prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      data: { role: role as any },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    this.logger.log(`Member role updated: ${organizationId} - ${userId}`);
    return member;
  }
}
