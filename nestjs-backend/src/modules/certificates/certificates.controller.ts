import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
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
import { CertificatesService } from './certificates.service';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Version('1')
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all certificates' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Certificates retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.certificatesService.findAll(
      req.user.organizationId,
      skip || 0,
      take || 10,
    );
  }

  @Version('1')
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get certificate by ID' })
  @ApiResponse({ status: 200, description: 'Certificate retrieved successfully' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.certificatesService.findOne(id, req.user.organizationId);
  }

  @Version('1')
  @Get('verify/:code')
  @ApiOperation({ summary: 'Verify certificate by code' })
  @ApiResponse({ status: 200, description: 'Certificate verified' })
  async verifyCertificate(
    @Param('code') code: string,
    @Request() req,
  ) {
    const ipAddress = req.ip;
    return this.certificatesService.verifyCertificate(code, ipAddress);
  }

  @Version('1')
  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update certificate status' })
  @ApiResponse({ status: 200, description: 'Certificate status updated' })
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.certificatesService.updateStatus(
      id,
      req.user.organizationId,
      body.status,
    );
  }

  @Version('1')
  @Post(':id/revoke')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke certificate' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  async revokeCertificate(
    @Request() req,
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    return this.certificatesService.revokeCertificate(
      id,
      req.user.organizationId,
      body?.reason,
    );
  }

  @Version('1')
  @Get('stats/overview')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get certificate statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getStats(@Request() req) {
    return this.certificatesService.getStats(req.user.organizationId);
  }

  @Version('1')
  @Get('campaign/:campaignId/list')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get certificates for campaign' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Campaign certificates retrieved' })
  async getCampaignCertificates(
    @Request() req,
    @Param('campaignId') campaignId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.certificatesService.getCampaignCertificates(
      campaignId,
      req.user.organizationId,
      skip || 0,
      take || 10,
    );
  }
}
