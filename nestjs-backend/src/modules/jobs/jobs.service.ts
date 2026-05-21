import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('certificates') private certificateQueue: Queue,
    @InjectQueue('emails') private emailQueue: Queue,
    @InjectQueue('reports') private reportQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async queueCertificateGeneration(
    organizationId: string,
    campaignId: string,
    participants: Array<Record<string, any>>,
  ) {
    const job = await this.certificateQueue.add(
      {
        organizationId,
        campaignId,
        participants,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );

    this.logger.log(`Certificate generation job queued: ${job.id}`);
    return job;
  }

  async queueEmailSending(
    organizationId: string,
    campaignId: string,
    emails: Array<Record<string, any>>,
  ) {
    const job = await this.emailQueue.add(
      {
        organizationId,
        campaignId,
        emails,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );

    this.logger.log(`Email sending job queued: ${job.id}`);
    return job;
  }

  async queueReportGeneration(
    organizationId: string,
    reportType: string,
    filters?: Record<string, any>,
  ) {
    const job = await this.reportQueue.add(
      {
        organizationId,
        reportType,
        filters,
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );

    this.logger.log(`Report generation job queued: ${job.id}`);
    return job;
  }

  async getJobStatus(queueName: string, jobId: number) {
    let queue: Queue;

    switch (queueName) {
      case 'certificates':
        queue = this.certificateQueue;
        break;
      case 'emails':
        queue = this.emailQueue;
        break;
      case 'reports':
        queue = this.reportQueue;
        break;
      default:
        return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress(),
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }

  async getQueueStats(queueName: string) {
    let queue: Queue;

    switch (queueName) {
      case 'certificates':
        queue = this.certificateQueue;
        break;
      case 'emails':
        queue = this.emailQueue;
        break;
      case 'reports':
        queue = this.reportQueue;
        break;
      default:
        return null;
    }

    const counts = await queue.getJobCounts();
    return {
      queue: queueName,
      ...counts,
    };
  }

  async getAllQueueStats() {
    const stats = await Promise.all([
      this.getQueueStats('certificates'),
      this.getQueueStats('emails'),
      this.getQueueStats('reports'),
    ]);

    return stats;
  }

  async retryFailedJob(queueName: string, jobId: number) {
    let queue: Queue;

    switch (queueName) {
      case 'certificates':
        queue = this.certificateQueue;
        break;
      case 'emails':
        queue = this.emailQueue;
        break;
      case 'reports':
        queue = this.reportQueue;
        break;
      default:
        return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    await job.retry();
    this.logger.log(`Job retried: ${queueName} - ${jobId}`);
    return { message: 'Job retried successfully' };
  }

  async cancelJob(queueName: string, jobId: number) {
    let queue: Queue;

    switch (queueName) {
      case 'certificates':
        queue = this.certificateQueue;
        break;
      case 'emails':
        queue = this.emailQueue;
        break;
      case 'reports':
        queue = this.reportQueue;
        break;
      default:
        return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    await job.remove();
    this.logger.log(`Job cancelled: ${queueName} - ${jobId}`);
    return { message: 'Job cancelled successfully' };
  }
}
