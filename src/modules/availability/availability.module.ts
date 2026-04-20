import { Module } from '@nestjs/common';

import { RequestContextModule } from '../../common/request-context/request-context.module';
import { AvailabilityController } from './availability.controller';
import { PostgresAvailabilityRepository } from './availability.postgres.repository';
import {
  AvailabilityRepository,
  UnconfiguredAvailabilityRepository,
} from './availability.repository';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [RequestContextModule],
  controllers: [AvailabilityController],
  providers: [
    AvailabilityService,
    {
      provide: AvailabilityRepository,
      useClass: PostgresAvailabilityRepository,
    },
    UnconfiguredAvailabilityRepository,
    PostgresAvailabilityRepository,
  ],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
