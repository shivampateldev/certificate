import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
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
import { ApiKeysService } from './api-keys.service';

@ApiTags('API Keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Version('1')
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async create(
    @Request() req,
    @Body()
    body: {
      name: string;
      permissions?: string[];
      expiresAt?: string;
    },
  ) {
    return this.apiKeysService.create(
      req.user.organizationId,
      req.user.userId,
      body.name,
      body.permissions,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  @Version('1')
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.apiKeysService.findAll(
      req.user.organizationId,
      skip || 0,
      take || 10,
    );
  }

  @Version('1')
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.apiKeysService.findOne(id, req.user.organizationId);
  }

  @Version('1')
  @Patch(':id/permissions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update API key permissions' })
  @ApiResponse({ status: 200, description: 'Permissions updated' })
  async updatePermissions(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    return this.apiKeysService.updatePermissions(
      id,
      req.user.organizationId,
      body.permissions,
    );
  }

  @Version('1')
  @Post(':id/revoke')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revoke(@Request() req, @Param('id') id: string) {
    return this.apiKeysService.revoke(id, req.user.organizationId);
  }

  @Version('1')
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 200, description: 'API key deleted' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.apiKeysService.delete(id, req.user.organizationId);
  }

  @Version('1')
  @Post(':id/rotate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rotate API key' })
  @ApiResponse({ status: 200, description: 'API key rotated' })
  async rotateKey(@Request() req, @Param('id') id: string) {
    return this.apiKeysService.rotateKey(id, req.user.organizationId);
  }
}
