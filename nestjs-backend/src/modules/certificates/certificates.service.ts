import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    campaignId: string,
    participantId: string,
    fileUrl: string,
    filePath: string,
    fileSize?: number,
  ) {
    const certificateNumber = `CERT-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const verificationCode = uuidv4();

    const certificate = await this.prisma.certificate.create({
      data: {
        organizationId,
        userId,
        campaignId,
        participantId,
        certificateNumber,
        fileUrl,
        filePath,
        fileSize,
        status: 'GENERATED',
        verificationCode,
        verificationUrl: `/verify/${verificationCode}`,
      },
    });

    this.logger.log(`Certificate created: ${certificateNumber}`);
    return certificate;
  }

  async findAll(organizationId: string, skip = 0, take = 10) {
    const [certificates, total] = await Promise.all([
      this.prisma.certificate.findMany({
        where: { organizationId },
        skip,
        take,
        include: {
          participant: true,
          campaign: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.certificate.count({ where: { organizationId } }),
    ]);

    return {
      data: certificates,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string, organizationId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id, organizationId },
      include: {
        participant: true,
        campaign: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }

    return certificate;
  }

  async findByVerificationCode(verificationCode: string) {
    return this.prisma.certificate.findUnique({
      where: { verificationCode },
      include: {
        participant: true,
        campaign: true,
      },
    });
  }

  async updateStatus(id: string, organizationId: string, status: string) {
    const validStatuses = [
      'GENERATED',
      'SENT',
      'VIEWED',
      'DOWNLOADED',
      'VERIFIED',
      'REVOKED',
      'EXPIRED',
    ];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid certificate status');
    }

    const certificate = await this.prisma.certificate.update({
      where: { id },
      data: { status: status as any },
    });

    this.logger.log(`Certificate status updated: ${id} -> ${status}`);
    return certificate;
  }

  async verifyCertificate(verificationCode: string, ipAddress?: string) {
    const certificate = await this.findByVerificationCode(verificationCode);

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    // Update verification record
    await this.prisma.certificateVerification.upsert({
      where: { certificateId: certificate.id },
      create: {
        certificateId: certificate.id,
        verificationCode,
        verificationUrl: `/verify/${verificationCode}`,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedIp: ipAddress,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      update: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedIp: ipAddress,
      },
    });

    // Update certificate status
    await this.updateStatus(certificate.id, certificate.organizationId, 'VERIFIED');

    return {
      verified: true,
      certificate: {
        number: certificate.certificateNumber,
        participant: certificate.participant,
        issuedDate: certificate.issuedDate,
        expiryDate: certificate.expiryDate,
      },
    };
  }

  async revokeCertificate(id: string, organizationId: string, reason?: string) {
    const certificate = await this.findOne(id, organizationId);

    await this.prisma.certificate.update({
      where: { id },
      data: {
        status: 'REVOKED',
        metadata: {
          ...(certificate.metadata as any),
          revokedAt: new Date().toISOString(),
          revokeReason: reason,
        } as any,
      },
    });

    this.logger.log(`Certificate revoked: ${id}`);
    return { message: 'Certificate revoked successfully' };
  }

  async getStats(organizationId: string) {
    const total = await this.prisma.certificate.count({
      where: { organizationId },
    });

    const generated = await this.prisma.certificate.count({
      where: { organizationId, status: 'GENERATED' },
    });

    const sent = await this.prisma.certificate.count({
      where: { organizationId, status: 'SENT' },
    });

    const verified = await this.prisma.certificate.count({
      where: { organizationId, status: 'VERIFIED' },
    });

    const revoked = await this.prisma.certificate.count({
      where: { organizationId, status: 'REVOKED' },
    });

    return {
      total,
      generated,
      sent,
      verified,
      revoked,
      verificationRate: total > 0 ? ((verified / total) * 100).toFixed(2) : 0,
    };
  }

  async getCampaignCertificates(
    campaignId: string,
    organizationId: string,
    skip = 0,
    take = 10,
  ) {
    const [certificates, total] = await Promise.all([
      this.prisma.certificate.findMany({
        where: { campaignId, organizationId },
        skip,
        take,
        include: {
          participant: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.certificate.count({
        where: { campaignId, organizationId },
      }),
    ]);

    return {
      data: certificates,
      total,
      skip,
      take,
    };
  }
}
