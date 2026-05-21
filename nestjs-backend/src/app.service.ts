import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): Record<string, any> {
    return {
      message: 'Certificate Management Platform API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}
