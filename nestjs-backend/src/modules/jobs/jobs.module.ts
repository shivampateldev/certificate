import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaModule } from '@common/prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'certificates' },
      { name: 'emails' },
      { name: 'reports' },
    ),
    PrismaModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
