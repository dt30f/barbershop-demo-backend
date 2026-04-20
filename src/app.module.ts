import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { ManagementModule } from './modules/management/management.module';
import { ScheduleModule } from './modules/schedule/schedule.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AvailabilityModule,
    AppointmentsModule,
    ManagementModule,
    ScheduleModule,
  ],
})
export class AppModule {}
