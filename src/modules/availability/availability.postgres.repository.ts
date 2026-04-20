import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

import { DATABASE_POOL } from '../../database/database.constants';
import {
  addDaysToLocalDate,
  getDayOfWeekFromLocalDate,
  parseLocalDateTimeToUtcDate,
} from './availability.timezone';
import {
  AvailabilityAppointmentInterval,
  AvailabilityBlockedInterval,
  AvailabilityRepository,
  BarberAvailabilityContext,
  WorkingHoursWindow,
} from './availability.repository';

type AvailabilityBaseRow = {
  salon_id: string;
  salon_timezone: string;
  slot_granularity_minutes: number;
  barber_id: string;
  barber_is_active: boolean;
  service_id: string;
  service_duration_minutes: number;
  service_is_active: boolean;
  barber_service_id: string;
  barber_service_barber_id: string;
  barber_service_service_id: string;
  barber_service_is_active: boolean;
  duration_override_minutes: number | null;
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
  status: 'CONFIRMED' | 'REQUIRES_RESCHEDULE';
};

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapWorkingHours(row: WorkingHoursRow | undefined): WorkingHoursWindow | null {
  if (!row) {
    return null;
  }

  return {
    dayOfWeek: row.day_of_week,
    startTimeLocal: row.start_time_local,
    endTimeLocal: row.end_time_local,
    isActive: row.is_active,
  };
}

function mapBlockedIntervals(rows: TimestampIntervalRow[]): AvailabilityBlockedInterval[] {
  return rows.map((row) => ({
    startAt: toIsoString(row.start_at),
    endAt: toIsoString(row.end_at),
  }));
}

function mapAppointmentIntervals(
  rows: AppointmentIntervalRow[],
): AvailabilityAppointmentInterval[] {
  return rows.map((row) => ({
    startAt: toIsoString(row.start_at),
    endAt: toIsoString(row.end_at),
    status: row.status,
  }));
}

@Injectable()
export class PostgresAvailabilityRepository extends AvailabilityRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    super();
  }

  async getBarberAvailabilityContext(input: {
    salonId: string;
    barberId: string;
    barberServiceId: string;
    date: string;
  }): Promise<BarberAvailabilityContext | null> {
    const baseResult = await this.pool.query<AvailabilityBaseRow>(
      `
        select
          s.id as salon_id,
          s.timezone as salon_timezone,
          s.slot_granularity_minutes,
          b.id as barber_id,
          b.is_active as barber_is_active,
          svc.id as service_id,
          svc.duration_minutes as service_duration_minutes,
          svc.is_active as service_is_active,
          bs.id as barber_service_id,
          bs.barber_id as barber_service_barber_id,
          bs.service_id as barber_service_service_id,
          bs.is_active as barber_service_is_active,
          bs.duration_override_minutes
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

    const dayOfWeek = getDayOfWeekFromLocalDate(input.date);
    const dayStart = parseLocalDateTimeToUtcDate(
      input.date,
      '00:00:00',
      base.salon_timezone,
    );
    const dayEnd = parseLocalDateTimeToUtcDate(
      addDaysToLocalDate(input.date, 1),
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
          [input.salonId, input.barberId, input.date],
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

    return {
      salon: {
        id: base.salon_id,
        timezone: base.salon_timezone,
        slotGranularityMinutes: base.slot_granularity_minutes,
      },
      barber: {
        id: base.barber_id,
        isActive: base.barber_is_active,
      },
      service: {
        id: base.service_id,
        durationMinutes: base.service_duration_minutes,
        isActive: base.service_is_active,
      },
      barberService: {
        id: base.barber_service_id,
        barberId: base.barber_service_barber_id,
        serviceId: base.barber_service_service_id,
        isActive: base.barber_service_is_active,
        durationOverrideMinutes: base.duration_override_minutes,
      },
      workingHours: mapWorkingHours(workingHoursResult.rows[0]),
      barberDayOff: dayOffResult.rows[0]
        ? {
            dateLocal: dayOffResult.rows[0].date_local,
            reason: dayOffResult.rows[0].reason,
          }
        : null,
      blockedSlots: mapBlockedIntervals(blockedSlotsResult.rows),
      appointments: mapAppointmentIntervals(appointmentsResult.rows),
    };
  }
}
