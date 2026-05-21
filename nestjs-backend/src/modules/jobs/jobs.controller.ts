import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Version,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Version('1')
  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue stats retrieved' })
  async getAllQueueStats(@Request() req) {
    return this.jobsService.getAllQueueStats();
  }

  @Version('1')
  @Get('stats/:queueName')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue stats retrieved' })
  async getQueueStats(
    @Request() req,
    @Param('queueName') queueName: string,
  ) {
    return this.jobsService.getQueueStats(queueName);
  }

  @Version('1')
  @Get(':queueName/:jobId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get job status' })
  @ApiResponse({ status: 200, description: 'Job status retrieved' })
  async getJobStatus(
    @Request() req,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.getJobStatus(queueName, parseInt(jobId));
  }

  @Version('1')
  @Post(':queueName/:jobId/retry')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retry failed job' })
  @ApiResponse({ status: 200, description: 'Job retried' })
  async retryJob(
    @Request() req,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.retryFailedJob(queueName, parseInt(jobId));
  }

  @Version('1')
  @Post(':queueName/:jobId/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cancel job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancelJob(
    @Request() req,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.cancelJob(queueName, parseInt(jobId));
  }
}
