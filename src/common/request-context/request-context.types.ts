export type ActorRole = 'CUSTOMER' | 'ADMIN' | 'BARBER';

export type RequestContextActor = {
  role: ActorRole;
  actorId: string;
};

export type BarberBookingRequestContext = {
  salonId: string;
  actor?: RequestContextActor;
};
