import { Injectable, NotImplementedException } from '@nestjs/common';

export type WorkingHoursWindow = {
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export type AvailabilityBlockedInterval = {
  startAt: string;
  endAt: string;
};

export type AvailabilityAppointmentInterval = {
  startAt: string;
  endAt: string;
  status: 'CONFIRMED' | 'REQUIRES_RESCHEDULE';
};

export type BarberAvailabilityContext = {
  salon: {
    id: string;
    timezone: string;
    slotGranularityMinutes: number;
  };
  barber: {
    id: string;
    isActive: boolean;
  };
  service: {
    id: string;
    durationMinutes: number;
    isActive: boolean;
  };
  barberService: {
    id: string;
    barberId: string;
    serviceId: string;
    isActive: boolean;
    durationOverrideMinutes: number | null;
  };
  workingHours: WorkingHoursWindow | null;
  barberDayOff: {
    dateLocal: string;
    reason?: string | null;
  } | null;
  blockedSlots: AvailabilityBlockedInterval[];
  appointments: AvailabilityAppointmentInterval[];
};

export abstract class AvailabilityRepository {
  abstract getBarberAvailabilityContext(input: {
    salonId: string;
    barberId: string;
    barberServiceId: string;
    date: string;
  }): Promise<BarberAvailabilityContext | null>;
}

@Injectable()
export class UnconfiguredAvailabilityRepository
  implements AvailabilityRepository
{
  async getBarberAvailabilityContext(_input: {
    salonId: string;
    barberId: string;
    barberServiceId: string;
    date: string;
  }): Promise<BarberAvailabilityContext | null> {
    throw new NotImplementedException(
      'AvailabilityRepository is not wired to a real data source yet.',
    );
  }
}
