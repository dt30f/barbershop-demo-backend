import { Module } from '@nestjs/common';

import { AuthTokenModule } from '../auth-tokens/auth-token.module';
import {
  AdminDevAuthGuard,
  BarberDevAuthGuard,
  CustomerDevAuthGuard,
  WhiteLabelSalonGuard,
} from './request-context.guards';
import { RequestContextService } from './request-context.service';

@Module({
  imports: [AuthTokenModule],
  providers: [
    RequestContextService,
    WhiteLabelSalonGuard,
    CustomerDevAuthGuard,
    AdminDevAuthGuard,
    BarberDevAuthGuard,
  ],
  exports: [
    RequestContextService,
    WhiteLabelSalonGuard,
    CustomerDevAuthGuard,
    AdminDevAuthGuard,
    BarberDevAuthGuard,
  ],
})
export class RequestContextModule {}
