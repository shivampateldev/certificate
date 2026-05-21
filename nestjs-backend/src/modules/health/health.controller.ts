import { Controller, Get, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Version('1')
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        database: 'connected',
      },
    },
  })
  async healthCheck() {
    const startTime = Date.now();

    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        responseTime: `${Date.now() - startTime}ms`,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        error: error.message,
      };
    }
  }

  @Version('1')
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
  })
  async readinessCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ready: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Version('1')
  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  async livenessCheck() {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
