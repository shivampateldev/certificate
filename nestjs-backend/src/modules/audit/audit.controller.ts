import {
  Controller,
  Get,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Version('1')
  @Get('logs')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async getLogs(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
  ) {
    return this.auditService.getLogs(
      req.user.organizationId,
      skip || 0,
      take || 10,
      { action, resource },
    );
  }

  @Version('1')
  @Get('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user activity' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User activity retrieved' })
  async getUserActivity(
    @Request() req,
    @Param('userId') userId: string,
    @Query('days') days?: number,
  ) {
    return this.auditService.getUserActivity(
      req.user.organizationId,
      userId,
      days || 30,
    );
  }

  @Version('1')
  @Get('resource/:resource/:resourceId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get resource activity' })
  @ApiResponse({ status: 200, description: 'Resource activity retrieved' })
  async getResourceActivity(
    @Request() req,
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.auditService.getResourceActivity(
      req.user.organizationId,
      resource,
      resourceId,
    );
  }

  @Version('1')
  @Get('security-events')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get security events' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Security events retrieved' })
  async getSecurityEvents(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.auditService.getSecurityEvents(
      req.user.organizationId,
      skip || 0,
      take || 10,
    );
  }
}
