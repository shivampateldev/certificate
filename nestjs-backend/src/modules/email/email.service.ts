import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '@common/prisma/prisma.service';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');
    const smtpSecure = this.configService.get('SMTP_SECURE') === 'true';

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP configuration incomplete - email sending disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log('SMTP transporter initialized');
  }

  async sendEmail(
    organizationId: string,
    userId: string,
    sendEmailDto: SendEmailDto,
  ) {
    if (!this.transporter) {
      throw new BadRequestException('Email service is not configured');
    }

    const {
      to,
      subject,
      htmlContent,
      textContent,
      attachments,
      campaignId,
      certificateId,
    } = sendEmailDto;

    try {
      const fromEmail = this.configService.get('SMTP_FROM_EMAIL');
      const fromName = this.configService.get('SMTP_FROM_NAME');

      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html: htmlContent,
        text: textContent,
        attachments: attachments || [],
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Log email
      const emailLog = await this.prisma.emailLog.create({
        data: {
          organizationId,
          userId,
          campaignId,
          certificateId,
          recipientEmail: to,
          subject,
          status: 'SENT',
          provider: 'SMTP',
          messageId: info.messageId,
          sentAt: new Date(),
        },
      });

      this.logger.log(`Email sent to ${to} - Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        emailLogId: emailLog.id,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);

      // Log failed email
      await this.prisma.emailLog.create({
        data: {
          organizationId,
          userId,
          campaignId,
          certificateId,
          recipientEmail: to,
          subject,
          status: 'FAILED',
          provider: 'SMTP',
          errorMessage: error.message,
        },
      });

      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  async sendBulkEmails(
    organizationId: string,
    userId: string,
    emails: SendEmailDto[],
  ) {
    if (!this.transporter) {
      throw new BadRequestException('Email service is not configured');
    }

    const results = [];

    for (const email of emails) {
      try {
        const result = await this.sendEmail(organizationId, userId, email);
        results.push({
          to: email.to,
          status: 'sent',
          messageId: result.messageId,
        });
      } catch (error) {
        results.push({
          to: email.to,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return {
      total: emails.length,
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    };
  }

  async getEmailLogs(
    organizationId: string,
    skip = 0,
    take = 10,
    filters?: {
      status?: string;
      recipientEmail?: string;
      campaignId?: string;
    },
  ) {
    const where: any = { organizationId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.recipientEmail) {
      where.recipientEmail = { contains: filters.recipientEmail };
    }

    if (filters?.campaignId) {
      where.campaignId = filters.campaignId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }

  async getEmailStats(organizationId: string) {
    const stats = await this.prisma.emailLog.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });

    const result = {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
    };

    stats.forEach((stat) => {
      result.total += stat._count;
      if (stat.status === 'SENT') result.sent += stat._count;
      if (stat.status === 'DELIVERED') result.delivered += stat._count;
      if (stat.status === 'FAILED') result.failed += stat._count;
      if (stat.status === 'BOUNCED') result.bounced += stat._count;
    });

    return result;
  }

  async retryFailedEmails(organizationId: string, maxRetries = 3) {
    const failedEmails = await this.prisma.emailLog.findMany({
      where: {
        organizationId,
        status: 'FAILED',
        retryCount: { lt: maxRetries },
      },
      take: 100,
    });

    const results = [];

    for (const email of failedEmails) {
      try {
        await this.transporter.sendMail({
          from: this.configService.get('SMTP_FROM_EMAIL'),
          to: email.recipientEmail,
          subject: email.subject,
        });

        await this.prisma.emailLog.update({
          where: { id: email.id },
          data: {
            status: 'SENT',
            retryCount: email.retryCount + 1,
            sentAt: new Date(),
          },
        });

        results.push({ email: email.recipientEmail, status: 'retried' });
      } catch (error) {
        await this.prisma.emailLog.update({
          where: { id: email.id },
          data: {
            retryCount: email.retryCount + 1,
            errorMessage: error.message,
          },
        });

        results.push({ email: email.recipientEmail, status: 'failed' });
      }
    }

    return results;
  }
}
