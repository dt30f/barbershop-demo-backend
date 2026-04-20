import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

import { DATABASE_POOL } from '../../database/database.constants';
import {
  addDaysToLocalDate,
  formatUtcDateInTimeZone,
  getDayOfWeekFromLocalDate,
  getTodayInTimeZone,
  parseLocalDateTimeToUtcDate,
} from '../availability/availability.timezone';
import {
  AppointmentCreatedByType,
  AppointmentStatus,
} from './appointments.enums';
import {
  AdminAppointmentListRecord,
  AdminManagedAppointmentRecord,
  AppointmentsRepository,
  BookingContext,
  CustomerAppointmentRecord,
  CustomerSnapshot,
  ExistingAppointmentInterval,
  OwnedAppointmentRecord,
} from './appointments.repository';
import {
  AdminAppointmentsSortBy,
  AppointmentPersistencePayload,
  SortDirection,
} from './appointments.types';

type BookingBaseRow = {
  salon_id: string;
  salon_timezone: string;
  slot_granularity_minutes: number;
  barber_id: string;
  barber_display_name: string;
  barber_is_active: boolean;
  service_id: string;
  service_name: string;
  service_duration_minutes: number;
  service_is_active: boolean;
  barber_service_id: string;
  barber_service_barber_id: string;
  barber_service_service_id: string;
  barber_service_price_amount: string;
  barber_service_currency: string;
  barber_service_duration_override_minutes: number | null;
  barber_service_is_active: boolean;
};

type WorkingHoursRow = {
  day_of_week: number;
  start_time_local: string;
  end_time_local: string;
  is_active: boolean;
};

type BarberDayOffRow = {
  date_local: string;
  reason: string | null;
};

type TimestampIntervalRow = {
  start_at: string | Date;
  end_at: string | Date;
};

type AppointmentIntervalRow = TimestampIntervalRow & {
  status: AppointmentStatus.CONFIRMED | AppointmentStatus.REQUIRES_RESCHEDULE;
};

type CustomerRow = {
  id: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
};

type CreatedAppointmentRow = {
  id: string;
  status: AppointmentStatus;
  start_at: string | Date;
  end_at: string | Date;
};

type CustomerAppointmentRow = {
  id: string;
  status: AppointmentStatus;
  barber_id: string;
  barber_name: string;
  service_id: string;
  service_name: string;
  start_at: string | Date;
  end_at: string | Date;
  price_amount: string;
  currency: string;
  salon_timezone: string;
};

type OwnedAppointmentRow = {
  id: string;
  salon_id: string;
  customer_id: string;
  status: AppointmentStatus;
  start_at: string | Date;
  end_at: string | Date;
  cancelled_at: string | Date | null;
  cancel_reason: string | null;
  salon_timezone: string;
};

type AdminManagedAppointmentRow = {
  id: string;
  salon_id: string;
  status: AppointmentStatus;
};

type AdminAppointmentListRow = {
  id: string;
  status: AppointmentStatus;
  barber_id: string;
  barber_name: string;
  service_id: string;
  service_name: string;
  customer_id: string;
  customer_phone: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  start_at: string | Date;
  end_at: string | Date;
  price_amount: string;
  currency: string;
  created_by_type: AppointmentCreatedByType;
  cancel_reason: string | null;
  requires_reschedule_reason: string | null;
};

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapIntervals(rows: TimestampIntervalRow[]) {
  return rows.map((row) => ({
    startAt: toIsoString(row.start_at),
    endAt: toIsoString(row.end_at),
  }));
}

function mapExistingAppointments(
  rows: AppointmentIntervalRow[],
): ExistingAppointmentInterval[] {
  return rows.map((row) => ({
    startAt: toIsoString(row.start_at),
    endAt: toIsoString(row.end_at),
    status: row.status,
  }));
}

function isPgOverlapConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23P01'
  );
}

function getAdminAppointmentsOrderBy(
  sortBy: AdminAppointmentsSortBy,
  sortDirection: SortDirection,
): string {
  const direction = sortDirection === SortDirection.DESC ? 'desc' : 'asc';

  switch (sortBy) {
    case AdminAppointmentsSortBy.STATUS:
      return `a.status ${direction}, a.start_at asc`;
    case AdminAppointmentsSortBy.BARBER_NAME:
      return `a.barber_name_snapshot ${direction}, a.start_at asc`;
    case AdminAppointmentsSortBy.CUSTOMER_PHONE:
      return `a.customer_phone_snapshot ${direction}, a.start_at asc`;
    case AdminAppointmentsSortBy.CREATED_AT:
      return `a.created_at ${direction}, a.start_at asc`;
    case AdminAppointmentsSortBy.START_AT:
    default:
      return `a.start_at ${direction}, a.id asc`;
  }
}

@Injectable()
export class PostgresAppointmentsRepository extends AppointmentsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    super();
  }

  async getBookingContext(input: {
    salonId: string;
    barberId: string;
    barberServiceId: string;
    startAt: string;
  }): Promise<BookingContext | null> {
    const baseResult = await this.pool.query<BookingBaseRow>(
      `
        select
          s.id as salon_id,
          s.timezone as salon_timezone,
          s.slot_granularity_minutes,
          b.id as barber_id,
          b.display_name as barber_display_name,
          b.is_active as barber_is_active,
          svc.id as service_id,
          svc.name as service_name,
          svc.duration_minutes as service_duration_minutes,
          svc.is_active as service_is_active,
          bs.id as barber_service_id,
          bs.barber_id as barber_service_barber_id,
          bs.service_id as barber_service_service_id,
          bs.price_amount::text as barber_service_price_amount,
          bs.currency as barber_service_currency,
          bs.duration_override_minutes as barber_service_duration_override_minutes,
          bs.is_active as barber_service_is_active
        from salon s
        inner join barber b
          on b.salon_id = s.id
         and b.id = $2
        inner join barber_service bs
          on bs.salon_id = s.id
         and bs.id = $3
        inner join service svc
          on svc.salon_id = s.id
         and svc.id = bs.service_id
        where s.id = $1
      `,
      [input.salonId, input.barberId, input.barberServiceId],
    );

    const base = baseResult.rows[0];
    if (!base) {
      return null;
    }

    const parsedStart = new Date(input.startAt);
    const localDate = Number.isNaN(parsedStart.getTime())
      ? getTodayInTimeZone(base.salon_timezone)
      : formatUtcDateInTimeZone(parsedStart, base.salon_timezone).slice(0, 10);
    const dayOfWeek = getDayOfWeekFromLocalDate(localDate);
    const dayStart = parseLocalDateTimeToUtcDate(
      localDate,
      '00:00:00',
      base.salon_timezone,
    );
    const dayEnd = parseLocalDateTimeToUtcDate(
      addDaysToLocalDate(localDate, 1),
      '00:00:00',
      base.salon_timezone,
    );

    const [workingHoursResult, dayOffResult, blockedSlotsResult, appointmentsResult] =
      await Promise.all([
        this.pool.query<WorkingHoursRow>(
          `
            select
              day_of_week,
              start_time_local::text as start_time_local,
              end_time_local::text as end_time_local,
              is_active
            from working_hours
            where salon_id = $1
              and day_of_week = $2
            limit 1
          `,
          [input.salonId, dayOfWeek],
        ),
        this.pool.query<BarberDayOffRow>(
          `
            select
              date_local::text as date_local,
              reason
            from barber_day_off
            where salon_id = $1
              and barber_id = $2
              and date_local = $3::date
            limit 1
          `,
          [input.salonId, input.barberId, localDate],
        ),
        this.pool.query<TimestampIntervalRow>(
          `
            select
              start_at,
              end_at
            from blocked_slot
            where salon_id = $1
              and barber_id = $2
              and start_at < $4
              and end_at > $3
            order by start_at asc
          `,
          [input.salonId, input.barberId, dayStart.toISOString(), dayEnd.toISOString()],
        ),
        this.pool.query<AppointmentIntervalRow>(
          `
            select
              start_at,
              end_at,
              status
            from appointment
            where salon_id = $1
              and barber_id = $2
              and status in ('CONFIRMED', 'REQUIRES_RESCHEDULE')
              and start_at < $4
              and end_at > $3
            order by start_at asc
          `,
          [input.salonId, input.barberId, dayStart.toISOString(), dayEnd.toISOString()],
        ),
      ]);

    const workingHours = workingHoursResult.rows[0];

    return {
      salon: {
        id: base.salon_id,
        timezone: base.salon_timezone,
        slotGranularityMinutes: base.slot_granularity_minutes,
      },
      barber: {
        id: base.barber_id,
        displayName: base.barber_display_name,
        isActive: base.barber_is_active,
      },
      service: {
        id: base.service_id,
        name: base.service_name,
        durationMinutes: base.service_duration_minutes,
        isActive: base.service_is_active,
      },
      barberService: {
        id: base.barber_service_id,
        barberId: base.barber_service_barber_id,
        serviceId: base.barber_service_service_id,
        priceAmount: Number(base.barber_service_price_amount),
        currency: base.barber_service_currency,
        durationOverrideMinutes: base.barber_service_duration_override_minutes,
        isActive: base.barber_service_is_active,
      },
      workingHours: workingHours
        ? {
            dayOfWeek: workingHours.day_of_week,
            startTimeLocal: workingHours.start_time_local,
            endTimeLocal: workingHours.end_time_local,
            isActive: workingHours.is_active,
          }
        : null,
      barberDayOff: dayOffResult.rows[0]
        ? {
            dateLocal: dayOffResult.rows[0].date_local,
            reason: dayOffResult.rows[0].reason,
          }
        : null,
      blockedSlots: mapIntervals(blockedSlotsResult.rows),
      appointments: mapExistingAppointments(appointmentsResult.rows),
    };
  }

  async getCustomerSnapshot(
    salonId: string,
    customerId: string,
  ): Promise<CustomerSnapshot | null> {
    const result = await this.pool.query<CustomerRow>(
      `
        select
          id,
          phone_number,
          first_name,
          last_name
        from customer
        where salon_id = $1
          and id = $2
        limit 1
      `,
      [salonId, customerId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      phoneNumber: row.phone_number,
      firstName: row.first_name,
      lastName: row.last_name,
    };
  }

  async findOrCreateCustomerByPhone(input: {
    salonId: string;
    phoneNumber: string;
    firstName: string;
    lastName?: string;
  }): Promise<CustomerSnapshot> {
    const result = await this.pool.query<CustomerRow>(
      `
        insert into customer (
          salon_id,
          phone_number,
          first_name,
          last_name
        )
        values ($1, $2, $3, $4)
        on conflict (salon_id, phone_number)
        do update
        set
          first_name = coalesce(customer.first_name, excluded.first_name),
          last_name = coalesce(customer.last_name, excluded.last_name)
        returning
          id,
          phone_number,
          first_name,
          last_name
      `,
      [
        input.salonId,
        input.phoneNumber,
        input.firstName,
        input.lastName ?? null,
      ],
    );

    const row = result.rows[0];

    return {
      id: row.id,
      phoneNumber: row.phone_number,
      firstName: row.first_name,
      lastName: row.last_name,
    };
  }

  async createAppointment(input: {
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
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      const result = await client.query<CreatedAppointmentRow>(
        `
          insert into appointment (
            salon_id,
            barber_id,
            customer_id,
            service_id,
            barber_service_id,
            status,
            start_at,
            end_at,
            service_name_snapshot,
            barber_name_snapshot,
            price_amount,
            currency,
            customer_phone_snapshot,
            created_by_type
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14
          )
          returning
            id,
            status,
            start_at,
            end_at
        `,
        [
          input.salonId,
          input.payload.barberId,
          input.payload.customerId,
          input.payload.serviceId,
          input.payload.barberServiceId,
          input.payload.status,
          input.payload.startAt,
          input.payload.endAt,
          input.payload.serviceNameSnapshot,
          input.payload.barberNameSnapshot,
          input.payload.priceAmount,
          input.payload.currency,
          input.payload.customerPhoneSnapshot,
          input.payload.createdByType,
        ],
      );

      await client.query('commit');

      const row = result.rows[0];

      return {
        id: row.id,
        status: row.status,
        barberId: input.payload.barberId,
        barberName: input.payload.barberNameSnapshot,
        serviceId: input.payload.serviceId,
        serviceName: input.payload.serviceNameSnapshot,
        startAt: toIsoString(row.start_at),
        endAt: toIsoString(row.end_at),
        priceAmount: input.payload.priceAmount,
        currency: input.payload.currency,
      };
    } catch (error) {
      await this.rollbackQuietly(client);

      if (isPgOverlapConflict(error)) {
        throw new Error('Selected time overlaps an existing appointment.');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async findCustomerFutureAppointments(
    salonId: string,
    customerId: string,
  ): Promise<CustomerAppointmentRecord[]> {
    const result = await this.pool.query<CustomerAppointmentRow>(
      `
        select
          a.id,
          a.status,
          a.barber_id,
          a.barber_name_snapshot as barber_name,
          a.service_id,
          a.service_name_snapshot as service_name,
          a.start_at,
          a.end_at,
          a.price_amount::text as price_amount,
          a.currency,
          s.timezone as salon_timezone
        from appointment a
        inner join salon s
          on s.id = a.salon_id
        where a.salon_id = $1
          and a.customer_id = $2
          and a.start_at >= now()
          and a.status in ('CONFIRMED', 'REQUIRES_RESCHEDULE')
        order by a.start_at asc
      `,
      [salonId, customerId],
    );

    return result.rows.map((row: CustomerAppointmentRow) => ({
      id: row.id,
      status: row.status,
      barberId: row.barber_id,
      barberName: row.barber_name,
      serviceId: row.service_id,
      serviceName: row.service_name,
      startAt: toIsoString(row.start_at),
      endAt: toIsoString(row.end_at),
      priceAmount: Number(row.price_amount),
      currency: row.currency,
      salonTimezone: row.salon_timezone,
    }));
  }

  async findOwnedAppointmentById(
    salonId: string,
    customerId: string,
    appointmentId: string,
  ): Promise<OwnedAppointmentRecord | null> {
    const result = await this.pool.query<OwnedAppointmentRow>(
      `
        select
          a.id,
          a.salon_id,
          a.customer_id,
          a.status,
          a.start_at,
          a.end_at,
          a.cancelled_at,
          a.cancel_reason,
          s.timezone as salon_timezone
        from appointment a
        inner join salon s
          on s.id = a.salon_id
        where a.salon_id = $1
          and a.customer_id = $2
          and a.id = $3
        limit 1
      `,
      [salonId, customerId, appointmentId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      salonId: row.salon_id,
      customerId: row.customer_id,
      status: row.status,
      startAt: toIsoString(row.start_at),
      endAt: toIsoString(row.end_at),
      cancelledAt: row.cancelled_at ? toIsoString(row.cancelled_at) : null,
      cancelReason: row.cancel_reason,
      salonTimezone: row.salon_timezone,
    };
  }

  async updateCustomerAppointmentCancellation(input: {
    salonId: string;
    appointmentId: string;
    cancelledAt: string;
    cancelReason?: string;
  }): Promise<void> {
    await this.pool.query(
      `
        update appointment
        set
          status = 'CANCELLED',
          cancelled_at = $3,
          cancel_reason = $4,
          requires_reschedule_reason = null
        where salon_id = $1
          and id = $2
      `,
      [
        input.salonId,
        input.appointmentId,
        input.cancelledAt,
        input.cancelReason ?? null,
      ],
    );
  }

  async findAdminManagedAppointmentById(
    salonId: string,
    appointmentId: string,
  ): Promise<AdminManagedAppointmentRecord | null> {
    const result = await this.pool.query<AdminManagedAppointmentRow>(
      `
        select
          id,
          salon_id,
          status
        from appointment
        where salon_id = $1
          and id = $2
        limit 1
      `,
      [salonId, appointmentId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      salonId: row.salon_id,
      status: row.status,
    };
  }

  async updateAdminAppointmentStatus(input: {
    salonId: string;
    appointmentId: string;
    status:
      | AppointmentStatus.CANCELLED
      | AppointmentStatus.COMPLETED
      | AppointmentStatus.NO_SHOW;
    cancelledAt?: string;
    cancelReason?: string;
  }): Promise<void> {
    await this.pool.query(
      `
        update appointment
        set
          status = $3,
          cancelled_at = $4,
          cancel_reason = $5,
          requires_reschedule_reason = null
        where salon_id = $1
          and id = $2
      `,
      [
        input.salonId,
        input.appointmentId,
        input.status,
        input.cancelledAt ?? null,
        input.cancelReason ?? null,
      ],
    );
  }

  async findAdminAppointments(input: {
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
  }): Promise<{ items: AdminAppointmentListRecord[]; total: number }> {
    const filters = [
      input.salonId,
      input.barberId ?? null,
      input.status ?? null,
      input.customerPhone?.trim() || null,
      input.dateFrom ?? null,
      input.dateTo ?? null,
    ];
    const offset = (input.page - 1) * input.pageSize;
    const orderBy = getAdminAppointmentsOrderBy(
      input.sortBy,
      input.sortDirection,
    );

    const countResult = await this.pool.query<{ total: string }>(
      `
        select count(*)::text as total
        from appointment a
        inner join salon s
          on s.id = a.salon_id
        where a.salon_id = $1
          and ($2::uuid is null or a.barber_id = $2)
          and ($3::appointment_status is null or a.status = $3)
          and ($4::text is null or a.customer_phone_snapshot ilike '%' || $4 || '%')
          and ($5::date is null or (a.start_at at time zone s.timezone)::date >= $5::date)
          and ($6::date is null or (a.start_at at time zone s.timezone)::date <= $6::date)
      `,
      filters,
    );
    const total = Number(countResult.rows[0]?.total ?? '0');

    const result = await this.pool.query<AdminAppointmentListRow>(
      `
        select
          a.id,
          a.status,
          a.barber_id,
          a.barber_name_snapshot as barber_name,
          a.service_id,
          a.service_name_snapshot as service_name,
          a.customer_id,
          a.customer_phone_snapshot as customer_phone,
          c.first_name as customer_first_name,
          c.last_name as customer_last_name,
          a.start_at,
          a.end_at,
          a.price_amount::text as price_amount,
          a.currency,
          a.created_by_type,
          a.cancel_reason,
          a.requires_reschedule_reason
        from appointment a
        inner join salon s
          on s.id = a.salon_id
        left join customer c
          on c.id = a.customer_id
         and c.salon_id = a.salon_id
        where a.salon_id = $1
          and ($2::uuid is null or a.barber_id = $2)
          and ($3::appointment_status is null or a.status = $3)
          and ($4::text is null or a.customer_phone_snapshot ilike '%' || $4 || '%')
          and ($5::date is null or (a.start_at at time zone s.timezone)::date >= $5::date)
          and ($6::date is null or (a.start_at at time zone s.timezone)::date <= $6::date)
        order by ${orderBy}
        limit $7
        offset $8
      `,
      [
        ...filters,
        input.pageSize,
        offset,
      ],
    );

    return {
      total,
      items: result.rows.map((row) => ({
        id: row.id,
        status: row.status,
        barberId: row.barber_id,
        barberName: row.barber_name,
        serviceId: row.service_id,
        serviceName: row.service_name,
        customerId: row.customer_id,
        customerPhone: row.customer_phone,
        customerFirstName: row.customer_first_name,
        customerLastName: row.customer_last_name,
        startAt: toIsoString(row.start_at),
        endAt: toIsoString(row.end_at),
        priceAmount: Number(row.price_amount),
        currency: row.currency,
        createdByType: row.created_by_type,
        cancelReason: row.cancel_reason,
        requiresRescheduleReason: row.requires_reschedule_reason,
      })),
    };
  }

  private async rollbackQuietly(client: PoolClient): Promise<void> {
    try {
      await client.query('rollback');
    } catch {
      return;
    }
  }
}
