import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    createParticipantDto: CreateParticipantDto,
  ) {
    const { email, firstName, lastName, customData } = createParticipantDto;

    // Check if participant already exists
    const existing = await this.prisma.participant.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Participant with this email already exists');
    }

    const participant = await this.prisma.participant.create({
      data: {
        organizationId,
        userId,
        email,
        firstName,
        lastName,
        customData: customData || {},
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Participant created: ${email}`);
    return participant;
  }

  async findAll(organizationId: string, skip = 0, take = 10) {
    const [participants, total] = await Promise.all([
      this.prisma.participant.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.participant.count({ where: { organizationId } }),
    ]);

    return {
      data: participants,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string, organizationId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { id, organizationId },
      include: {
        certificates: true,
      },
    });

    if (!participant) {
      throw new NotFoundException(`Participant with ID ${id} not found`);
    }

    return participant;
  }

  async update(
    id: string,
    organizationId: string,
    updateParticipantDto: UpdateParticipantDto,
  ) {
    const participant = await this.findOne(id, organizationId);

    const updated = await this.prisma.participant.update({
      where: { id },
      data: {
        firstName: updateParticipantDto.firstName ?? participant.firstName,
        lastName: updateParticipantDto.lastName ?? participant.lastName,
        customData: updateParticipantDto.customData ?? participant.customData,
        status: (updateParticipantDto.status ?? participant.status) as any,
      },
    });

    this.logger.log(`Participant updated: ${id}`);
    return updated;
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.participant.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    this.logger.log(`Participant deleted: ${id}`);
    return { message: 'Participant deleted successfully' };
  }

  async importFromCSV(
    organizationId: string,
    userId: string,
    csvData: Array<Record<string, any>>,
  ) {
    const results = {
      imported: 0,
      failed: 0,
      errors: [],
    };

    for (const row of csvData) {
      try {
        const email = row.email || row.Email;
        const firstName = row.firstName || row.first_name || row.First_Name;
        const lastName = row.lastName || row.last_name || row.Last_Name;

        if (!email || !firstName) {
          results.failed++;
          results.errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
          continue;
        }

        await this.create(organizationId, userId, {
          email,
          firstName,
          lastName,
          customData: row,
        });

        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push(error.message);
      }
    }

    this.logger.log(
      `CSV import completed: ${results.imported} imported, ${results.failed} failed`,
    );

    return results;
  }

  async getStats(organizationId: string) {
    const total = await this.prisma.participant.count({
      where: { organizationId },
    });

    const active = await this.prisma.participant.count({
      where: { organizationId, status: 'ACTIVE' },
    });

    const inactive = await this.prisma.participant.count({
      where: { organizationId, status: 'INACTIVE' },
    });

    return {
      total,
      active,
      inactive,
      suspended: total - active - inactive,
    };
  }
}
