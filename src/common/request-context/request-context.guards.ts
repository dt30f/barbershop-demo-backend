import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { REQUEST_CONTEXT_KEY } from './request-context.constants';
import { RequestContextService } from './request-context.service';
import { ActorRole, BarberBookingRequestContext } from './request-context.types';

type MutableRequest = {
  headers: Record<string, string | string[] | undefined>;
  [REQUEST_CONTEXT_KEY]?: BarberBookingRequestContext;
};

function setRequestContext(
  request: MutableRequest,
  context: BarberBookingRequestContext,
): void {
  request[REQUEST_CONTEXT_KEY] = context;
}

@Injectable()
export class WhiteLabelSalonGuard implements CanActivate {
  constructor(private readonly requestContextService: RequestContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MutableRequest>();
    const salonId = this.requestContextService.resolveSalonId(request);

    setRequestContext(request, { salonId });

    return true;
  }
}

abstract class BaseActorGuard implements CanActivate {
  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly role: ActorRole,
    private readonly headerName: 'x-customer-id' | 'x-admin-user-id' | 'x-barber-id',
    private readonly missingMessage: string,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MutableRequest>();
    const salonId = this.requestContextService.resolveSalonId(request);
    const actorFromToken = this.requestContextService.resolveActorFromAccessToken(
      request,
      [this.role],
      salonId,
    );

    if (actorFromToken) {
      setRequestContext(request, {
        salonId,
        actor: actorFromToken,
      });

      return true;
    }

    const actorId = this.requestContextService.resolveRequiredActorId(
      request,
      this.headerName,
      this.missingMessage,
    );

    setRequestContext(request, {
      salonId,
      actor: {
        role: this.role,
        actorId,
      },
    });

    return true;
  }
}

@Injectable()
export class CustomerDevAuthGuard extends BaseActorGuard {
  constructor(requestContextService: RequestContextService) {
    super(
      requestContextService,
      'CUSTOMER',
      'x-customer-id',
      'x-customer-id header is required for customer routes in MVP/dev auth flow.',
    );
  }
}

@Injectable()
export class AdminDevAuthGuard extends BaseActorGuard {
  constructor(requestContextService: RequestContextService) {
    super(
      requestContextService,
      'ADMIN',
      'x-admin-user-id',
      'x-admin-user-id header is required for admin routes in MVP/dev auth flow.',
    );
  }
}

@Injectable()
export class BarberDevAuthGuard extends BaseActorGuard {
  constructor(requestContextService: RequestContextService) {
    super(
      requestContextService,
      'BARBER',
      'x-barber-id',
      'x-barber-id header is required for barber routes in MVP/dev auth flow.',
    );
  }
}
