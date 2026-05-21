import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async logAction(
    organizationId: string,
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    changes?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        resource,
        resourceId,
        changes,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      },
    });

    this.logger.log(
      `Audit log created: ${action} on ${resource} by ${userId}`,
    );

    return auditLog;
  }

  async logError(
    organizationId: string,
    userId: string,
    action: string,
    resource: string,
    errorMessage: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        resource,
        resourceId,
        ipAddress,
        userAgent,
        status: 'FAILURE',
        errorMessage,
      },
    });

    this.logger.warn(
      `Audit error logged: ${action} on ${resource} - ${errorMessage}`,
    );

    return auditLog;
  }

  async getLogs(
    organizationId: string,
    skip = 0,
    take = 10,
    filters?: {
      action?: string;
      resource?: string;
      userId?: string;
      status?: string;
    },
  ) {
    const where: any = { organizationId };

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.resource) {
      where.resource = filters.resource;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }

  async getUserActivity(organizationId: string, userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const actionCounts = logs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      userId,
      period: `Last ${days} days`,
      totalActions: logs.length,
      actionCounts,
      logs: logs.slice(0, 50),
    };
  }

  async getResourceActivity(
    organizationId: string,
    resource: string,
    resourceId: string,
  ) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        resource,
        resourceId,
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
      orderBy: { createdAt: 'desc' },
    });

    return {
      resource,
      resourceId,
      totalChanges: logs.length,
      logs,
    };
  }

  async getSecurityEvents(organizationId: string, skip = 0, take = 10) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        status: 'FAILURE',
      },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.auditLog.count({
      where: {
        organizationId,
        status: 'FAILURE',
      },
    });

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }
}
