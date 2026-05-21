import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    name: string,
    permissions: string[] = [],
    expiresAt?: Date,
  ) {
    const key = `sk_${uuidv4()}`;
    const secret = crypto.randomBytes(32).toString('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        userId,
        name,
        key,
        secret,
        permissions,
        expiresAt,
        isActive: true,
      },
    });

    this.logger.log(`API key created: ${name}`);

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key,
      secret, // Only return secret on creation
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async findAll(organizationId: string, skip = 0, take = 10) {
    const [apiKeys, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where: { organizationId },
        skip,
        take,
        select: {
          id: true,
          name: true,
          key: true,
          permissions: true,
          lastUsedAt: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apiKey.count({ where: { organizationId } }),
    ]);

    return {
      data: apiKeys,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string, organizationId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    return apiKey;
  }

  async validateKey(key: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
      include: {
        organization: true,
        user: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    if (!apiKey.isActive) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used time
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      userId: apiKey.userId,
      permissions: apiKey.permissions,
    };
  }

  async updatePermissions(
    id: string,
    organizationId: string,
    permissions: string[],
  ) {
    const apiKey = await this.findOne(id, organizationId);

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { permissions },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        expiresAt: true,
      },
    });

    this.logger.log(`API key permissions updated: ${id}`);
    return updated;
  }

  async revoke(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`API key revoked: ${id}`);
    return { message: 'API key revoked successfully' };
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.apiKey.delete({
      where: { id },
    });

    this.logger.log(`API key deleted: ${id}`);
    return { message: 'API key deleted successfully' };
  }

  async rotateKey(id: string, organizationId: string) {
    const apiKey = await this.findOne(id, organizationId);

    const newKey = `sk_${uuidv4()}`;
    const newSecret = crypto.randomBytes(32).toString('hex');

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: {
        key: newKey,
        secret: newSecret,
      },
    });

    this.logger.log(`API key rotated: ${id}`);

    return {
      id: updated.id,
      name: updated.name,
      key: newKey,
      secret: newSecret,
      message: 'API key rotated successfully',
    };
  }
}
