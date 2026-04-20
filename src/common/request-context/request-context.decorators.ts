import {
  ExecutionContext,
  InternalServerErrorException,
  createParamDecorator,
} from '@nestjs/common';

import { REQUEST_CONTEXT_KEY } from './request-context.constants';
import { BarberBookingRequestContext } from './request-context.types';

type RequestLike = {
  [REQUEST_CONTEXT_KEY]?: BarberBookingRequestContext;
};

function getRequestContext(context: ExecutionContext): BarberBookingRequestContext {
  const request = context.switchToHttp().getRequest<RequestLike>();
  const requestContext = request[REQUEST_CONTEXT_KEY];

  if (!requestContext) {
    throw new InternalServerErrorException(
      'Request context is not available. Check route guards configuration.',
    );
  }

  return requestContext;
}

export const CurrentSalonId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => getRequestContext(context).salonId,
);

export const CurrentActorId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const actor = getRequestContext(context).actor;

    if (!actor) {
      throw new InternalServerErrorException(
        'Actor context is not available. Check route guards configuration.',
      );
    }

    return actor.actorId;
  },
);
