import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

import { AuthTokenPayload } from './auth-token.types';

type SignTokenInput = {
  sub: string;
  actorId?: string;
  salonId: string;
  role: AuthTokenPayload['role'];
  type: AuthTokenPayload['type'];
  expiresInSeconds: number;
};

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getNowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

@Injectable()
export class AuthTokenService {
  private readonly accessSecret =
    process.env.AUTH_ACCESS_TOKEN_SECRET ?? 'barber-booking-dev-access-secret';

  private readonly refreshSecret =
    process.env.AUTH_REFRESH_TOKEN_SECRET ?? 'barber-booking-dev-refresh-secret';

  signAccessToken(input: Omit<SignTokenInput, 'type'>): string {
    return this.signToken({
      ...input,
      type: 'access',
    });
  }

  signRefreshToken(input: Omit<SignTokenInput, 'type'>): string {
    return this.signToken({
      ...input,
      type: 'refresh',
    });
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    return this.verifyToken(token, 'access');
  }

  verifyRefreshToken(token: string): AuthTokenPayload {
    return this.verifyToken(token, 'refresh');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generateOpaqueDeviceInfo(): string {
    return randomBytes(12).toString('hex');
  }

  private signToken(input: SignTokenInput): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = getNowInSeconds();
    const payload: AuthTokenPayload = {
      sub: input.sub,
      actorId: input.actorId,
      nonce: randomBytes(12).toString('hex'),
      salonId: input.salonId,
      role: input.role,
      type: input.type,
      iat: now,
      exp: now + input.expiresInSeconds,
    };

    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = this.signSignature(
      `${encodedHeader}.${encodedPayload}`,
      input.type,
    );

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verifyToken(
    token: string,
    expectedType: AuthTokenPayload['type'],
  ): AuthTokenPayload {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Token format is invalid.');
    }

    const expectedSignature = this.signSignature(
      `${encodedHeader}.${encodedPayload}`,
      expectedType,
    );

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Token signature is invalid.');
    }

    let payload: AuthTokenPayload;

    try {
      payload = JSON.parse(decodeBase64Url(encodedPayload)) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Token payload is invalid.');
    }

    if (payload.type !== expectedType) {
      throw new UnauthorizedException('Token type is invalid.');
    }

    if (!payload.exp || payload.exp <= getNowInSeconds()) {
      throw new UnauthorizedException('Token has expired.');
    }

    return payload;
  }

  private signSignature(
    content: string,
    type: AuthTokenPayload['type'],
  ): string {
    const secret = type === 'refresh' ? this.refreshSecret : this.accessSecret;

    return createHmac('sha256', secret).update(content).digest('base64url');
  }
}
