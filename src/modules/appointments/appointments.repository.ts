import { Injectable, NotImplementedException } from '@nestjs/common';

import { AppointmentCreatedByType, AppointmentStatus } from './appointments.enums';
import {
  AdminAppointmentsSortBy,
  AppointmentPersistencePayload,
  SortDirection,
} from './appointments.types';

export type AppointmentWorkingHoursWindow = {
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export type AppointmentBlockedInterval = {
  startAt: string;
  endAt: string;
};

export type ExistingAppointmentInterval = {
  startAt: string;
  endAt: string;
  status: AppointmentStatus.CONFIRMED | AppointmentStatus.REQUIRES_RESCHEDULE;
};

export type BookingContext = {
  salon: {
    id: string;
    timezone: string;
    slotGranularityMinutes: number;
  };
  barber: {
    id: string;
    displayName: string;
    isActive: boolean;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    isActive: boolean;
  };
  barberService: {
    id: string;
    barberId: string;
    serviceId: string;
    priceAmount: number;
    currency: string;
    durationOverrideMinutes: number | null;
    isActive: boolean;
  };
  workingHours: AppointmentWorkingHoursWindow | null;
  barberDayOff: {
    dateLocal: string;
    reason?: string | null;
  } | null;
  blockedSlots: AppointmentBlockedInterval[];
  appointments: ExistingAppointmentInterval[];
};

export type CustomerSnapshot = {
  id: string;
  phoneNumber: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type CustomerAppointmentRecord = {
  id: string;
  status: AppointmentStatus;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  salonTimezone: string;
};

export type OwnedAppointmentRecord = {
  id: string;
  salonId: string;
  customerId: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  salonTimezone: string;
};

export type AdminManagedAppointmentRecord = {
  id: string;
  salonId: string;
  status: AppointmentStatus;
};

export type AdminAppointmentListRecord = {
  id: string;
  status: AppointmentStatus;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  customerPhone: string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  createdByType: AppointmentCreatedByType;
  cancelReason?: string | null;
  requiresRescheduleReason?: string | null;
};

export type AdminAppointmentListPageRecord = {
  items: AdminAppointmentListRecord[];
  total: number;
};

export abstract class AppointmentsRepository {
  abstract getBookingContext(input: {
    salonId: string;
    barberId: string;
    barberServiceId: string;
    startAt: string;
  }): Promise<BookingContext | null>;

  abstract getCustomerSnapshot(
    salonId: string,
    customerId: string,
  ): Promise<CustomerSnapshot | null>;

  abstract findOrCreateCustomerByPhone(input: {
    salonId: string;
    phoneNumber: string;
    firstName: string;
    lastName?: string;
  }): Promise<CustomerSnapshot>;

  abstract createAppointment(input: {
    salonId: string;
    payload: AppointmentPersistencePayload;
  }): Promise<{
    id: string;
    status: AppointmentStatus;
    barberId: string;
    barberName: string;
    serviceId: string;
    serviceName: string;
    startAt: string;
    endAt: string;
    priceAmount: number;
    currency: string;
  }>;

  abstract findCustomerFutureAppointments(
    salonId: string,
    customerId: string,
  ): Promise<CustomerAppointmentRecord[]>;

  abstract findOwnedAppointmentById(
    salonId: string,
    customerId: string,
    appointmentId: string,
  ): Promise<OwnedAppointmentRecord | null>;

  abstract updateCustomerAppointmentCancellation(input: {
    salonId: string;
    appointmentId: string;
    cancelledAt: string;
    cancelReason?: string;
  }): Promise<void>;

  abstract findAdminManagedAppointmentById(
    salonId: string,
    appointmentId: string,
  ): Promise<AdminManagedAppointmentRecord | null>;

  abstract updateAdminAppointmentStatus(input: {
    salonId: string;
    appointmentId: string;
    status:
      | AppointmentStatus.CANCELLED
      | AppointmentStatus.COMPLETED
      | AppointmentStatus.NO_SHOW;
    cancelledAt?: string;
    cancelReason?: string;
  }): Promise<void>;

  abstract findAdminAppointments(input: {
    salonId: string;
    dateFrom?: string;
    dateTo?: string;
    barberId?: string;
    status?: AppointmentStatus;
    customerPhone?: string;
    page: number;
    pageSize: number;
    sortBy: AdminAppointmentsSortBy;
    sortDirection: SortDirection;
  }): Promise<AdminAppointmentListPageRecord>;
}

@Injectable()
export class UnconfiguredAppointmentsRepository
  implements AppointmentsRepository
{
  async getBookingContext(_input: {
    salonId: string;
    barberId: string;
    barberServiceId: string;
    startAt: string;
  }): Promise<BookingContext | null> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async getCustomerSnapshot(
    _salonId: string,
    _customerId: string,
  ): Promise<CustomerSnapshot | null> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async findOrCreateCustomerByPhone(_input: {
    salonId: string;
    phoneNumber: string;
    firstName: string;
    lastName?: string;
  }): Promise<CustomerSnapshot> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async createAppointment(_input: {
    salonId: string;
    payload: AppointmentPersistencePayload;
  }): Promise<{
    id: string;
    status: AppointmentStatus;
    barberId: string;
    barberName: string;
    serviceId: string;
    serviceName: string;
    startAt: string;
    endAt: string;
    priceAmount: number;
    currency: string;
  }> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async findCustomerFutureAppointments(
    _salonId: string,
    _customerId: string,
  ): Promise<CustomerAppointmentRecord[]> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async findOwnedAppointmentById(
    _salonId: string,
    _customerId: string,
    _appointmentId: string,
  ): Promise<OwnedAppointmentRecord | null> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async updateCustomerAppointmentCancellation(_input: {
    salonId: string;
    appointmentId: string;
    cancelledAt: string;
    cancelReason?: string;
  }): Promise<void> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async findAdminManagedAppointmentById(
    _salonId: string,
    _appointmentId: string,
  ): Promise<AdminManagedAppointmentRecord | null> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async updateAdminAppointmentStatus(_input: {
    salonId: string;
    appointmentId: string;
    status:
      | AppointmentStatus.CANCELLED
      | AppointmentStatus.COMPLETED
      | AppointmentStatus.NO_SHOW;
    cancelledAt?: string;
    cancelReason?: string;
  }): Promise<void> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }

  async findAdminAppointments(_input: {
    salonId: string;
    dateFrom?: string;
    dateTo?: string;
    barberId?: string;
    status?: AppointmentStatus;
    customerPhone?: string;
    page: number;
    pageSize: number;
    sortBy: AdminAppointmentsSortBy;
    sortDirection: SortDirection;
  }): Promise<AdminAppointmentListPageRecord> {
    throw new NotImplementedException(
      'AppointmentsRepository is not wired to a real data source yet.',
    );
  }
}
