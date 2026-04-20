import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthTokenService } from '../auth-tokens/auth-token.service';
import { ActorRole, RequestContextActor } from './request-context.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
};

function normalizeHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return value?.trim() || null;
}

function assertUuid(value: string, message: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new BadRequestException(message);
  }
}

@Injectable()
export class RequestContextService {
  constructor(private readonly authTokenService: AuthTokenService) {}

  resolveSalonId(request: RequestLike): string {
    const envSalonId = process.env.APP_SALON_ID?.trim() || null;
    const headerSalonId = normalizeHeaderValue(request.headers['x-salon-id']);
    const salonId = envSalonId ?? headerSalonId;

    if (!salonId) {
      throw new BadRequestException(
        'Salon context is missing. Provide APP_SALON_ID or x-salon-id.',
      );
    }

    assertUuid(salonId, 'Salon context is invalid.');

    return salonId;
  }

  resolveRequiredActorId(
    request: RequestLike,
    headerName: 'x-customer-id' | 'x-admin-user-id' | 'x-barber-id',
    message: string,
  ): string {
    const actorId = normalizeHeaderValue(request.headers[headerName]);

    if (!actorId) {
      throw new UnauthorizedException(message);
    }

    assertUuid(actorId, `${headerName} must be a valid UUID.`);

    return actorId;
  }

  resolveActorFromAccessToken(
    request: RequestLike,
    expectedRoles: ActorRole[],
    salonId: string,
  ): RequestContextActor | null {
    const authorizationHeader = normalizeHeaderValue(request.headers.authorization);

    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Authorization header format is invalid.');
    }

    const payload = this.authTokenService.verifyAccessToken(token);

    if (payload.salonId !== salonId) {
      throw new UnauthorizedException('Access token salon does not match.');
    }

    if (!expectedRoles.includes(payload.role)) {
      throw new UnauthorizedException('Access token role is not allowed.');
    }

    return {
      role: payload.role,
      actorId: payload.actorId ?? payload.sub,
    };
  }
}
