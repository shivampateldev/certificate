import {
  Controller,
  Post,
  Get,
  Body,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Version('1')
  @Post('send')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Send an email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  async sendEmail(
    @Request() req,
    @Body() sendEmailDto: SendEmailDto,
  ) {
    return this.emailService.sendEmail(
      req.user.organizationId,
      req.user.userId,
      sendEmailDto,
    );
  }

  @Version('1')
  @Post('send-bulk')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Send bulk emails' })
  @ApiResponse({ status: 200, description: 'Bulk emails sent' })
  async sendBulkEmails(
    @Request() req,
    @Body() body: { emails: SendEmailDto[] },
  ) {
    return this.emailService.sendBulkEmails(
      req.user.organizationId,
      req.user.userId,
      body.emails,
    );
  }

  @Version('1')
  @Get('logs')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get email logs' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Email logs retrieved' })
  async getEmailLogs(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('status') status?: string,
  ) {
    return this.emailService.getEmailLogs(
      req.user.organizationId,
      skip || 0,
      take || 10,
      { status },
    );
  }

  @Version('1')
  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiResponse({ status: 200, description: 'Email stats retrieved' })
  async getEmailStats(@Request() req) {
    return this.emailService.getEmailStats(req.user.organizationId);
  }

  @Version('1')
  @Post('retry-failed')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retry failed emails' })
  @ApiResponse({ status: 200, description: 'Failed emails retried' })
  async retryFailedEmails(@Request() req) {
    return this.emailService.retryFailedEmails(req.user.organizationId);
  }
}
