import { Module } from '@nestjs/common';

import { RequestContextModule } from '../../common/request-context/request-context.module';
import { ScheduleAdminController } from './schedule.admin.controller';
import { ScheduleBarberController } from './schedule.barber.controller';
import { ScheduleDayController } from './schedule.day.controller';
import { PostgresScheduleRepository } from './schedule.postgres.repository';
import {
  ScheduleRepository,
  UnconfiguredScheduleRepository,
} from './schedule.repository';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [RequestContextModule],
  controllers: [
    ScheduleAdminController,
    ScheduleBarberController,
    ScheduleDayController,
  ],
  providers: [
    ScheduleService,
    {
      provide: ScheduleRepository,
      useClass: PostgresScheduleRepository,
    },
    UnconfiguredScheduleRepository,
    PostgresScheduleRepository,
  ],
})
export class ScheduleModule {}
