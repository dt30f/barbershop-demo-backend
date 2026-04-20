import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import {
  buildAppointmentPayload,
  mapAppointmentSummary,
  mapCustomerAppointmentList,
  validateBookableStartAt,
} from './appointments.engine';
import { AppointmentCreatedByType, AppointmentStatus } from './appointments.enums';
import {
  AppointmentsRepository,
  CustomerSnapshot,
} from './appointments.repository';
import {
  AdminAppointmentsSortBy,
  AdminAppointmentListItem,
  AdminAppointmentUpdatedResult,
  CancelCustomerAppointmentResult,
  CreateAdminAppointmentInput,
  CreateBarberAppointmentInput,
  CreateAppointmentFlowResult,
  CreateCustomerAppointmentInput,
  CustomerAppointmentListItem,
  ListAdminAppointmentsInput,
  PaginatedAdminAppointmentsResult,
  SortDirection,
  UpdateAdminAppointmentInput,
} from './appointments.types';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
  ) {}

  async createCustomerAppointment(
    input: CreateCustomerAppointmentInput,
  ): Promise<CreateAppointmentFlowResult> {
    const customer = await this.appointmentsRepository.getCustomerSnapshot(
      input.salonId,
      input.customerId,
    );

    if (!customer) {
      throw new NotFoundException('Customer nije pronadjen.');
    }

    return this.createAppointmentFlow({
      salonId: input.salonId,
      barberId: input.barberId,
      barberServiceId: input.barberServiceId,
      startAt: input.startAt,
      customer,
      createdByType: AppointmentCreatedByType.CUSTOMER,
    });
  }

  async listCustomerFutureAppointments(
    salonId: string,
    customerId: string,
  ): Promise<CustomerAppointmentListItem[]> {
    const records = await this.appointmentsRepository.findCustomerFutureAppointments(
      salonId,
      customerId,
    );

    return records.map((record) => mapCustomerAppointmentList(record));
  }

  async listAdminAppointments(
    input: ListAdminAppointmentsInput,
  ): Promise<PaginatedAdminAppointmentsResult> {
    if (input.dateFrom && input.dateTo && input.dateFrom > input.dateTo) {
      throw new UnprocessableEntityException(
        'dateFrom ne moze biti posle dateTo.',
      );
    }

    const normalizedInput: ListAdminAppointmentsInput = {
      ...input,
      page: input.page || 1,
      pageSize: input.pageSize || 20,
      sortBy: input.sortBy || AdminAppointmentsSortBy.START_AT,
      sortDirection: input.sortDirection || SortDirection.ASC,
    };

    const result =
      await this.appointmentsRepository.findAdminAppointments(normalizedInput);

    const items: AdminAppointmentListItem[] = result.items.map((record) => ({
      id: record.id,
      status: record.status,
      barberId: record.barberId,
      barberName: record.barberName,
      serviceId: record.serviceId,
      serviceName: record.serviceName,
      customerId: record.customerId,
      customerPhone: record.customerPhone,
      customerFirstName: record.customerFirstName,
      customerLastName: record.customerLastName,
      startAt: record.startAt,
      endAt: record.endAt,
      priceAmount: record.priceAmount,
      currency: record.currency,
      createdByType: record.createdByType,
      cancelReason: record.cancelReason,
      requiresRescheduleReason: record.requiresRescheduleReason,
    }));

    return {
      items,
      pagination: {
        page: normalizedInput.page,
        pageSize: normalizedInput.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / normalizedInput.pageSize)),
      },
      sort: {
        sortBy: normalizedInput.sortBy,
        sortDirection: normalizedInput.sortDirection,
      },
    };
  }

  async cancelCustomerAppointment(
    salonId: string,
    customerId: string,
    appointmentId: string,
  ): Promise<CancelCustomerAppointmentResult> {
    const appointment =
      await this.appointmentsRepository.findOwnedAppointmentById(
        salonId,
        customerId,
        appointmentId,
      );

    if (!appointment) {
      throw new NotFoundException('Appointment nije pronadjen.');
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new UnprocessableEntityException(
        'Samo potvrden termin moze da se otkaze iz customer flow-a.',
      );
    }

    const cancellationDeadline = new Date(
      new Date(appointment.startAt).getTime() - 24 * 60 * 60_000,
    );

    if (new Date() >= cancellationDeadline) {
      throw new ConflictException(
        'Termin nije moguce otkazati manje od 24h pre pocetka.',
      );
    }

    const cancelledAt = new Date().toISOString();

    await this.appointmentsRepository.updateCustomerAppointmentCancellation({
      salonId,
      appointmentId,
      cancelledAt,
      cancelReason: 'Cancelled by customer.',
    });

    return {
      id: appointment.id,
      status: AppointmentStatus.CANCELLED,
      cancelledAt,
    };
  }

  async createAdminAppointment(
    input: CreateAdminAppointmentInput,
  ): Promise<CreateAppointmentFlowResult> {
    const customer =
      await this.appointmentsRepository.findOrCreateCustomerByPhone({
        salonId: input.salonId,
        phoneNumber: input.customerPhoneNumber,
        firstName: input.customerFirstName,
        lastName: input.customerLastName,
      });

    return this.createAppointmentFlow({
      salonId: input.salonId,
      barberId: input.barberId,
      barberServiceId: input.barberServiceId,
      startAt: input.startAt,
      customer,
      createdByType: AppointmentCreatedByType.ADMIN,
    });
  }

  async createBarberAppointment(
    input: CreateBarberAppointmentInput,
  ): Promise<CreateAppointmentFlowResult> {
    const customer =
      await this.appointmentsRepository.findOrCreateCustomerByPhone({
        salonId: input.salonId,
        phoneNumber: input.customerPhoneNumber,
        firstName: input.customerFirstName,
        lastName: input.customerLastName,
      });

    return this.createAppointmentFlow({
      salonId: input.salonId,
      barberId: input.barberId,
      barberServiceId: input.barberServiceId,
      startAt: input.startAt,
      customer,
      createdByType: AppointmentCreatedByType.BARBER,
    });
  }

  async updateAdminAppointment(
    input: UpdateAdminAppointmentInput,
  ): Promise<AdminAppointmentUpdatedResult> {
    const appointment =
      await this.appointmentsRepository.findAdminManagedAppointmentById(
        input.salonId,
        input.appointmentId,
      );

    if (!appointment) {
      throw new NotFoundException('Appointment nije pronadjen.');
    }

    const allowedStatuses = new Set<AppointmentStatus>([
      AppointmentStatus.CANCELLED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
    ]);

    if (!allowedStatuses.has(input.status)) {
      throw new UnprocessableEntityException(
        'Status nije dozvoljen za admin update.',
      );
    }

    const cancelledAt =
      input.status === AppointmentStatus.CANCELLED
        ? new Date().toISOString()
        : undefined;

    await this.appointmentsRepository.updateAdminAppointmentStatus({
      salonId: input.salonId,
      appointmentId: input.appointmentId,
      status: input.status,
      cancelledAt,
      cancelReason: input.cancelReason,
    });

    return {
      id: input.appointmentId,
      status: input.status,
      cancelledAt,
      cancelReason: input.cancelReason,
    };
  }

  private async createAppointmentFlow(params: {
    salonId: string;
    barberId: string;
    barberServiceId: string;
    startAt: string;
    customer: CustomerSnapshot;
    createdByType: AppointmentCreatedByType;
  }): Promise<CreateAppointmentFlowResult> {
    const context = await this.appointmentsRepository.getBookingContext({
      salonId: params.salonId,
      barberId: params.barberId,
      barberServiceId: params.barberServiceId,
      startAt: params.startAt,
    });

    if (!context) {
      throw new NotFoundException('Barber ili usluga nisu pronadjeni.');
    }

    let bookingValidationResult: {
      localDate: string;
      localTime: string;
      endAt: string;
      durationMinutes: number;
    };

    try {
      bookingValidationResult = validateBookableStartAt(params.startAt, context);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Booking validation failed.';

      if (message.includes('overlaps')) {
        throw new ConflictException('Izabrani termin vise nije dostupan.');
      }

      throw new UnprocessableEntityException(message);
    }

    const payload = buildAppointmentPayload({
      context,
      customer: params.customer,
      startAt: params.startAt,
      endAt: bookingValidationResult.endAt,
      createdByType: params.createdByType,
    });

    let created: CreateAppointmentFlowResult;

    try {
      created = mapAppointmentSummary(
        await this.appointmentsRepository.createAppointment({
          salonId: params.salonId,
          payload,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Appointment creation failed.';

      if (message.includes('overlaps')) {
        throw new ConflictException('Izabrani termin vise nije dostupan.');
      }

      throw error;
    }

    return created;
  }
}
