import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Version('1')
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  async create(
    @Request() req,
    @Body() createOrgDto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(req.user.userId, createOrgDto);
  }

  @Version('1')
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.organizationsService.findAll(skip || 0, take || 10);
  }

  @Version('1')
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Version('1')
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateOrgDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrgDto);
  }

  @Version('1')
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  @Version('1')
  @Post(':id/members')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add member to organization' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  async addMember(
    @Param('id') organizationId: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.organizationsService.addMember(
      organizationId,
      body.userId,
      body.role,
    );
  }

  @Version('1')
  @Delete(':id/members/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  async removeMember(
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
  ) {
    return this.organizationsService.removeMember(organizationId, userId);
  }

  @Version('1')
  @Patch(':id/members/:userId/role')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  async updateMemberRole(
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    return this.organizationsService.updateMemberRole(
      organizationId,
      userId,
      body.role,
    );
  }
}
