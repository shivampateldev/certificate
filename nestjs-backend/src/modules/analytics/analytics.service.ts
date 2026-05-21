import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardStats(organizationId: string) {
    const [
      totalCertificates,
      totalEmails,
      totalParticipants,
      totalCampaigns,
    ] = await Promise.all([
      this.prisma.certificate.count({ where: { organizationId } }),
      this.prisma.emailLog.count({ where: { organizationId } }),
      this.prisma.participant.count({ where: { organizationId } }),
      this.prisma.campaign.count({ where: { organizationId } }),
    ]);

    const emailStats = await this.prisma.emailLog.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });

    const certificateStats = await this.prisma.certificate.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });

    return {
      totalCertificates,
      totalEmails,
      totalParticipants,
      totalCampaigns,
      emailStats: Object.fromEntries(
        emailStats.map((s) => [s.status, s._count]),
      ),
      certificateStats: Object.fromEntries(
        certificateStats.map((s) => [s.status, s._count]),
      ),
    };
  }

  async getCertificateAnalytics(organizationId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.prisma.analytics.findMany({
      where: {
        organizationId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    return {
      period: `Last ${days} days`,
      data: analytics,
      summary: {
        totalGenerated: analytics.reduce((sum, a) => sum + a.certificatesGenerated, 0),
        totalSent: analytics.reduce((sum, a) => sum + a.certificatesSent, 0),
        totalViewed: analytics.reduce((sum, a) => sum + a.certificatesViewed, 0),
        totalDownloaded: analytics.reduce((sum, a) => sum + a.certificatesDownloaded, 0),
      },
    };
  }

  async getEmailAnalytics(organizationId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.prisma.analytics.findMany({
      where: {
        organizationId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    return {
      period: `Last ${days} days`,
      data: analytics,
      summary: {
        totalSent: analytics.reduce((sum, a) => sum + a.emailsSent, 0),
        totalDelivered: analytics.reduce((sum, a) => sum + a.emailsDelivered, 0),
        totalFailed: analytics.reduce((sum, a) => sum + a.emailsFailed, 0),
        totalOpened: analytics.reduce((sum, a) => sum + a.emailsOpened, 0),
        totalClicked: analytics.reduce((sum, a) => sum + a.emailsClicked, 0),
      },
    };
  }

  async getCampaignAnalytics(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        certificates: true,
        emailLogs: true,
      },
    });

    if (!campaign) {
      return null;
    }

    const certificatesByStatus = await this.prisma.certificate.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    const emailsByStatus = await this.prisma.emailLog.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      certificates: {
        total: campaign.totalCertificates,
        generated: campaign.generatedCount,
        failed: campaign.failedCount,
        sent: campaign.sentCount,
        byStatus: Object.fromEntries(
          certificatesByStatus.map((s) => [s.status, s._count]),
        ),
      },
      emails: {
        total: campaign.emailLogs.length,
        byStatus: Object.fromEntries(
          emailsByStatus.map((s) => [s.status, s._count]),
        ),
      },
    };
  }

  async recordAnalytics(organizationId: string, data: Record<string, any>) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.analytics.findUnique({
      where: {
        organizationId_date: {
          organizationId,
          date: today,
        },
      },
    });

    if (existing) {
      return this.prisma.analytics.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.analytics.create({
      data: {
        organizationId,
        date: today,
        ...data,
      },
    });
  }

  async generateReport(
    organizationId: string,
    reportType: string,
    filters?: Record<string, any>,
  ) {
    let data: any = {};

    switch (reportType) {
      case 'CERTIFICATES_GENERATED':
        data = await this.getCertificateAnalytics(organizationId, filters?.days || 30);
        break;
      case 'EMAIL_DELIVERY':
        data = await this.getEmailAnalytics(organizationId, filters?.days || 30);
        break;
      case 'CAMPAIGN_PERFORMANCE':
        data = await this.getCampaignAnalytics(
          organizationId,
          filters?.campaignId,
        );
        break;
      default:
        data = await this.getDashboardStats(organizationId);
    }

    const report = await this.prisma.report.create({
      data: {
        organizationId,
        userId: filters?.userId,
        name: `${reportType} Report - ${new Date().toISOString()}`,
        type: reportType as any,
        filters: filters || {},
        data,
        status: 'COMPLETED',
      },
    });

    this.logger.log(`Report generated: ${report.id}`);
    return report;
  }
}
