import { Module } from '@nestjs/common';

import { RequestContextModule } from '../../common/request-context/request-context.module';
import { ManagementController } from './management.controller';
import { ManagementPublicController } from './management.public.controller';
import { PostgresManagementRepository } from './management.postgres.repository';
import {
  ManagementRepository,
  UnconfiguredManagementRepository,
} from './management.repository';
import { ManagementService } from './management.service';

@Module({
  imports: [RequestContextModule],
  controllers: [ManagementController, ManagementPublicController],
  providers: [
    ManagementService,
    {
      provide: ManagementRepository,
      useClass: PostgresManagementRepository,
    },
    UnconfiguredManagementRepository,
    PostgresManagementRepository,
  ],
  exports: [ManagementService],
})
export class ManagementModule {}
