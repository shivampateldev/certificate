import {
  Controller,
  Get,
  Post,
  Query,
  Body,
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
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Version('1')
  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  async getDashboardStats(@Request() req) {
    return this.analyticsService.getDashboardStats(req.user.organizationId);
  }

  @Version('1')
  @Get('certificates')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get certificate analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Certificate analytics retrieved' })
  async getCertificateAnalytics(
    @Request() req,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getCertificateAnalytics(
      req.user.organizationId,
      days || 30,
    );
  }

  @Version('1')
  @Get('emails')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get email analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Email analytics retrieved' })
  async getEmailAnalytics(
    @Request() req,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getEmailAnalytics(
      req.user.organizationId,
      days || 30,
    );
  }

  @Version('1')
  @Get('campaigns/:campaignId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get campaign analytics' })
  @ApiResponse({ status: 200, description: 'Campaign analytics retrieved' })
  async getCampaignAnalytics(
    @Request() req,
    @Query('campaignId') campaignId: string,
  ) {
    return this.analyticsService.getCampaignAnalytics(
      req.user.organizationId,
      campaignId,
    );
  }

  @Version('1')
  @Post('reports')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateReport(
    @Request() req,
    @Body() body: { reportType: string; filters?: Record<string, any> },
  ) {
    return this.analyticsService.generateReport(
      req.user.organizationId,
      body.reportType,
      { ...body.filters, userId: req.user.userId },
    );
  }
}
