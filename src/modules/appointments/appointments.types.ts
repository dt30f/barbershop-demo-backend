import {
  AppointmentCreatedByType,
  AppointmentStatus,
} from './appointments.enums';

export type AppointmentActorContext = {
  actorId: string;
  actorRole: 'CUSTOMER' | 'ADMIN' | 'BARBER';
  salonId: string;
  customerId?: string;
  barberId?: string;
};

export type AppointmentSummary = {
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
};

export type CreateCustomerAppointmentInput = {
  salonId: string;
  customerId: string;
  barberId: string;
  barberServiceId: string;
  startAt: string;
};

export type CreateAdminAppointmentInput = {
  salonId: string;
  adminUserId: string;
  customerPhoneNumber: string;
  customerFirstName: string;
  customerLastName?: string;
  barberId: string;
  barberServiceId: string;
  startAt: string;
};

export type CreateBarberAppointmentInput = {
  salonId: string;
  barberId: string;
  customerPhoneNumber: string;
  customerFirstName: string;
  customerLastName?: string;
  barberServiceId: string;
  startAt: string;
};

export type CustomerAppointmentListItem = AppointmentSummary & {
  canCancel: boolean;
};

export enum AdminAppointmentsSortBy {
  START_AT = 'START_AT',
  STATUS = 'STATUS',
  BARBER_NAME = 'BARBER_NAME',
  CUSTOMER_PHONE = 'CUSTOMER_PHONE',
  CREATED_AT = 'CREATED_AT',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type AdminAppointmentListItem = AppointmentSummary & {
  customerId: string;
  customerPhone: string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  createdByType: AppointmentCreatedByType;
  cancelReason?: string | null;
  requiresRescheduleReason?: string | null;
};

export type CancelCustomerAppointmentResult = {
  id: string;
  status: AppointmentStatus.CANCELLED;
  cancelledAt: string;
};

export type UpdateAdminAppointmentInput = {
  salonId: string;
  adminUserId: string;
  appointmentId: string;
  status:
    | AppointmentStatus.CANCELLED
    | AppointmentStatus.COMPLETED
    | AppointmentStatus.NO_SHOW;
  cancelReason?: string;
};

export type AdminAppointmentUpdatedResult = {
  id: string;
  status:
    | AppointmentStatus.CANCELLED
    | AppointmentStatus.COMPLETED
    | AppointmentStatus.NO_SHOW;
  cancelledAt?: string;
  cancelReason?: string;
};

export type ListAdminAppointmentsInput = {
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
};

export type PaginatedAdminAppointmentsResult = {
  items: AdminAppointmentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sort: {
    sortBy: AdminAppointmentsSortBy;
    sortDirection: SortDirection;
  };
};

export type AppointmentPersistencePayload = {
  barberId: string;
  customerId: string;
  serviceId: string;
  barberServiceId: string;
  status: AppointmentStatus;
  createdByType: AppointmentCreatedByType;
  startAt: string;
  endAt: string;
  serviceNameSnapshot: string;
  barberNameSnapshot: string;
  priceAmount: number;
  currency: string;
  customerPhoneSnapshot: string;
};

export type CreateAppointmentFlowResult = AppointmentSummary;
