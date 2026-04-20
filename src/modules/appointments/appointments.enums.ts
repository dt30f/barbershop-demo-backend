export enum AppointmentStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  REQUIRES_RESCHEDULE = 'REQUIRES_RESCHEDULE',
}

export enum AppointmentCreatedByType {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  BARBER = 'BARBER',
}
