import { Module } from '@nestjs/common';

import { AuthTokenModule } from '../../common/auth-tokens/auth-token.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { AuthCustomerController } from './auth.customer.controller';
import { AuthStaffController } from './auth.staff.controller';
import { PostgresAuthRepository } from './auth.postgres.repository';
import {
  AuthRepository,
  UnconfiguredAuthRepository,
} from './auth.repository';
import { AuthService } from './auth.service';

@Module({
  imports: [AuthTokenModule, RequestContextModule],
  controllers: [AuthCustomerController, AuthStaffController],
  providers: [
    AuthService,
    {
      provide: AuthRepository,
      useClass: PostgresAuthRepository,
    },
    UnconfiguredAuthRepository,
    PostgresAuthRepository,
  ],
  exports: [AuthService],
})
export class AuthModule {}
