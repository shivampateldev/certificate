import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application info' })
  @ApiResponse({
    status: 200,
    description: 'Application is running',
    schema: {
      example: {
        message: 'Certificate Management Platform API',
        version: '1.0.0',
        status: 'running',
      },
    },
  })
  getHello(): Record<string, any> {
    return this.appService.getInfo();
  }
}
