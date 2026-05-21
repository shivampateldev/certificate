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
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@ApiTags('Participants')
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Version('1')
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new participant' })
  @ApiResponse({ status: 201, description: 'Participant created successfully' })
  async create(
    @Request() req,
    @Body() createParticipantDto: CreateParticipantDto,
  ) {
    return this.participantsService.create(
      req.user.organizationId,
      req.user.userId,
      createParticipantDto,
    );
  }

  @Version('1')
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all participants' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.participantsService.findAll(
      req.user.organizationId,
      skip || 0,
      take || 10,
    );
  }

  @Version('1')
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get participant by ID' })
  @ApiResponse({ status: 200, description: 'Participant retrieved successfully' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.participantsService.findOne(id, req.user.organizationId);
  }

  @Version('1')
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update participant' })
  @ApiResponse({ status: 200, description: 'Participant updated successfully' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateParticipantDto: UpdateParticipantDto,
  ) {
    return this.participantsService.update(
      id,
      req.user.organizationId,
      updateParticipantDto,
    );
  }

  @Version('1')
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete participant' })
  @ApiResponse({ status: 200, description: 'Participant deleted successfully' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.participantsService.remove(id, req.user.organizationId);
  }

  @Version('1')
  @Post('import-csv')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Import participants from CSV' })
  @ApiResponse({ status: 200, description: 'Participants imported' })
  async importCSV(
    @Request() req,
    @Body() body: { csvData: Array<Record<string, any>> },
  ) {
    return this.participantsService.importFromCSV(
      req.user.organizationId,
      req.user.userId,
      body.csvData,
    );
  }

  @Version('1')
  @Get('stats/overview')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get participant statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getStats(@Request() req) {
    return this.participantsService.getStats(req.user.organizationId);
  }
}
