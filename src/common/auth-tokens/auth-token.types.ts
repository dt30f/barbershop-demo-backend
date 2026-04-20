import { ActorRole } from '../request-context/request-context.types';

export type AuthTokenPayload = {
  sub: string;
  actorId?: string;
  nonce: string;
  salonId: string;
  role: ActorRole;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
};
