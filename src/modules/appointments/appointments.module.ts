import { Module } from '@nestjs/common';

import { RequestContextModule } from '../../common/request-context/request-context.module';
import { AppointmentsAdminController } from './appointments.admin.controller';
import { AppointmentsBarberController } from './appointments.barber.controller';
import { AppointmentsCustomerController } from './appointments.customer.controller';
import { PostgresAppointmentsRepository } from './appointments.postgres.repository';
import {
  AppointmentsRepository,
  UnconfiguredAppointmentsRepository,
} from './appointments.repository';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [RequestContextModule],
  controllers: [
    AppointmentsCustomerController,
    AppointmentsAdminController,
    AppointmentsBarberController,
  ],
  providers: [
    AppointmentsService,
    {
      provide: AppointmentsRepository,
      useClass: PostgresAppointmentsRepository,
    },
    UnconfiguredAppointmentsRepository,
    PostgresAppointmentsRepository,
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
