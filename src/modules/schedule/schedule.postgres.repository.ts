import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

import { DATABASE_POOL } from '../../database/database.constants';
import {
  addDaysToLocalDate,
  getDayOfWeekFromLocalDate,
  parseLocalDateTimeToUtcDate,
} from '../availability/availability.timezone';
import {
  AppointmentCreatedByType,
  AppointmentStatus,
} from '../appointments/appointments.enums';
import { BlockedSlotReasonType } from './schedule.enums';
import {
  BarberScheduleContext,
  ScheduleRepository,
} from './schedule.repository';
import {
  CreateBarberDayOffResult,
  CreateBlockedSlotResult,
  GetScheduleDayResult,
  ScheduleDayAppointment,
  ScheduleDayBarber,
  ScheduleDayBlockedSlot,
  ScheduleDayOff,
  ScheduleDayWorkingHours,
} from './schedule.types';

type BarberContextRow = {
  salon_id: string;
  salon_timezone: string;
  barber_id: string;
  barber_display_name: string;
  barber_is_active: boolean;
};

type InsertDayOffRow = {
  id: string;
  date_local: string;
  reason: string | null;
};

type InsertBlockedSlotRow = {
  id: string;
  start_at: string | Date;
  end_at: string | Date;
  reason_type: BlockedSlotReasonType;
  note: string | null;
};

type ImpactedAppointmentRow = {
  id: string;
  customer_id: string;
};

type SalonRow = {
  id: string;
  timezone: string;
  slot_granularity_minutes: number;
};

type DayScheduleBarberRow = {
  id: string;
  display_name: string;
  is_active: boolean;
};

type WorkingHoursRow = {
  day_of_week: number;
  start_time_local: string;
  end_time_local: string;
  is_active: boolean;
};

type DayOffRow = {
  id: string;
  barber_id: string;
  date_local: string;
  reason: string | null;
};

type BlockedSlotRow = {
  id: string;
  barber_id: string;
  start_at: string | Date;
  end_at: string | Date;
  reason_type: BlockedSlotReasonType;
  note: string | null;
};

type DayAppointmentRow = {
  id: string;
  barber_id: string;
  customer_id: string;
  start_at: string | Date;
  end_at: string | Date;
  status: AppointmentStatus;
  service_id: string;
  service_name: string;
  customer_phone: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  created_by_type: AppointmentCreatedByType;
};

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapWorkingHours(row: WorkingHoursRow | undefined): ScheduleDayWorkingHours | null {
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

function mapDayOff(row: DayOffRow | undefined): ScheduleDayOff | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    dateLocal: row.date_local,
    reason: row.reason,
  };
}

function mapBlockedSlot(row: BlockedSlotRow): ScheduleDayBlockedSlot {
  return {
    id: row.id,
    startAt: toIsoString(row.start_at),
    endAt: toIsoString(row.end_at),
    reasonType: row.reason_type,
    note: row.note,
  };
}

function mapAppointment(row: DayAppointmentRow): ScheduleDayAppointment {
  return {
    id: row.id,
    status: row.status,
    startAt: toIsoString(row.start_at),
    endAt: toIsoString(row.end_at),
    serviceId: row.service_id,
    serviceName: row.service_name,
    customerId: row.customer_id,
    customerFirstName: row.customer_first_name,
    customerLastName: row.customer_last_name,
    customerPhone: row.customer_phone,
    createdByType: row.created_by_type,
  };
}

@Injectable()
export class PostgresScheduleRepository extends ScheduleRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    super();
  }

  async getBarberScheduleContext(
    salonId: string,
    barberId: string,
  ): Promise<BarberScheduleContext | null> {
    const result = await this.pool.query<BarberContextRow>(
      `
        select
          s.id as salon_id,
          s.timezone as salon_timezone,
          b.id as barber_id,
          b.display_name as barber_display_name,
          b.is_active as barber_is_active
        from salon s
        inner join barber b
          on b.salon_id = s.id
         and b.id = $2
        where s.id = $1
        limit 1
      `,
      [salonId, barberId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      salon: {
        id: row.salon_id,
        timezone: row.salon_timezone,
      },
      barber: {
        id: row.barber_id,
        displayName: row.barber_display_name,
        isActive: row.barber_is_active,
      },
    };
  }

  async createBarberDayOff(input: {
    salonId: string;
    barberId: string;
    dateLocal: string;
    reason?: string;
    createdByAdminUserId?: string;
  }): Promise<CreateBarberDayOffResult> {
    const context = await this.requireBarberContext(input.salonId, input.barberId);
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      const insertResult = await client.query<InsertDayOffRow>(
        `
          insert into barber_day_off (
            salon_id,
            barber_id,
            date_local,
            reason,
            created_by_admin_user_id
          )
          values ($1, $2, $3::date, $4, $5)
          returning
            id,
            date_local::text as date_local,
            reason
        `,
        [
          input.salonId,
          input.barberId,
          input.dateLocal,
          input.reason ?? null,
          input.createdByAdminUserId ?? null,
        ],
      );

      const impactedAppointments = await this.markAppointmentsForReschedule(
        client,
        {
          salonId: input.salonId,
          barberId: input.barberId,
          startAt: parseLocalDateTimeToUtcDate(
            input.dateLocal,
            '00:00:00',
            context.salon.timezone,
          ).toISOString(),
          endAt: parseLocalDateTimeToUtcDate(
            addDaysToLocalDate(input.dateLocal, 1),
            '00:00:00',
            context.salon.timezone,
          ).toISOString(),
          reason:
            input.reason?.trim() ||
            `Barber day off was added for ${input.dateLocal}.`,
        },
      );

      await client.query('commit');

      const row = insertResult.rows[0];

      return {
        id: row.id,
        barberId: input.barberId,
        dateLocal: row.date_local,
        reason: row.reason,
        impactedAppointments,
      };
    } catch (error) {
      await this.rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteBarberDayOff(input: {
    salonId: string;
    barberId: string;
    dayOffId: string;
  }): Promise<boolean> {
    const result = await this.pool.query(
      `
        delete from barber_day_off
        where salon_id = $1
          and barber_id = $2
          and id = $3
      `,
      [input.salonId, input.barberId, input.dayOffId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async createBlockedSlot(input: {
    salonId: string;
    barberId: string;
    startAt: string;
    endAt: string;
    reasonType: BlockedSlotReasonType;
    note?: string;
    createdByAdminUserId?: string;
  }): Promise<CreateBlockedSlotResult> {
    await this.requireBarberContext(input.salonId, input.barberId);
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      const insertResult = await client.query<InsertBlockedSlotRow>(
        `
          insert into blocked_slot (
            salon_id,
            barber_id,
            start_at,
            end_at,
            reason_type,
            note,
            created_by_admin_user_id
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning
            id,
            start_at,
            end_at,
            reason_type,
            note
        `,
        [
          input.salonId,
          input.barberId,
          input.startAt,
          input.endAt,
          input.reasonType,
          input.note ?? null,
          input.createdByAdminUserId ?? null,
        ],
      );

      const impactedAppointments = await this.markAppointmentsForReschedule(
        client,
        {
          salonId: input.salonId,
          barberId: input.barberId,
          startAt: input.startAt,
          endAt: input.endAt,
          reason:
            input.note?.trim() ||
            `Blocked slot (${input.reasonType}) was added over the appointment time.`,
        },
      );

      await client.query('commit');

      const row = insertResult.rows[0];

      return {
        id: row.id,
        barberId: input.barberId,
        startAt: toIsoString(row.start_at),
        endAt: toIsoString(row.end_at),
        reasonType: row.reason_type,
        note: row.note,
        impactedAppointments,
      };
    } catch (error) {
      await this.rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteBlockedSlot(input: {
    salonId: string;
    barberId: string;
    blockedSlotId: string;
  }): Promise<boolean> {
    const result = await this.pool.query(
      `
        delete from blocked_slot
        where salon_id = $1
          and barber_id = $2
          and id = $3
      `,
      [input.salonId, input.barberId, input.blockedSlotId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getScheduleDay(input: {
    salonId: string;
    date: string;
    barberId?: string;
  }): Promise<GetScheduleDayResult | null> {
    const salonResult = await this.pool.query<SalonRow>(
      `
        select
          id,
          timezone,
          slot_granularity_minutes
        from salon
        where id = $1
        limit 1
      `,
      [input.salonId],
    );

    const salon = salonResult.rows[0];
    if (!salon) {
      return null;
    }

    const barberResult = await this.pool.query<DayScheduleBarberRow>(
      `
        select
          id,
          display_name,
          is_active
        from barber
        where salon_id = $1
          and ($2::uuid is null or id = $2)
          and ($2::uuid is not null or is_active = true)
        order by display_order asc, display_name asc
      `,
      [input.salonId, input.barberId ?? null],
    );

    const barbers = barberResult.rows;
    if (barbers.length === 0) {
      return {
        date: input.date,
        timezone: salon.timezone,
        slotGranularityMinutes: salon.slot_granularity_minutes,
        barbers: [],
        calendar: {
          timeAxis: [],
          columns: [],
        },
      };
    }

    const barberIds = barbers.map((barber) => barber.id);
    const normalizedDayOfWeek = getDayOfWeekFromLocalDate(input.date);
    const dayStart = parseLocalDateTimeToUtcDate(
      input.date,
      '00:00:00',
      salon.timezone,
    );
    const dayEnd = parseLocalDateTimeToUtcDate(
      addDaysToLocalDate(input.date, 1),
      '00:00:00',
      salon.timezone,
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
          [input.salonId, normalizedDayOfWeek],
        ),
        this.pool.query<DayOffRow>(
          `
            select
              id,
              barber_id,
              date_local::text as date_local,
              reason
            from barber_day_off
            where salon_id = $1
              and barber_id = any($2::uuid[])
              and date_local = $3::date
          `,
          [input.salonId, barberIds, input.date],
        ),
        this.pool.query<BlockedSlotRow>(
          `
            select
              id,
              barber_id,
              start_at,
              end_at,
              reason_type,
              note
            from blocked_slot
            where salon_id = $1
              and barber_id = any($2::uuid[])
              and start_at < $4
              and end_at > $3
            order by start_at asc
          `,
          [input.salonId, barberIds, dayStart.toISOString(), dayEnd.toISOString()],
        ),
        this.pool.query<DayAppointmentRow>(
          `
            select
              a.id,
              a.barber_id,
              a.customer_id,
              a.start_at,
              a.end_at,
              a.status,
              a.service_id,
              a.service_name_snapshot as service_name,
              a.customer_phone_snapshot as customer_phone,
              c.first_name as customer_first_name,
              c.last_name as customer_last_name,
              a.created_by_type
            from appointment a
            left join customer c
              on c.id = a.customer_id
             and c.salon_id = a.salon_id
            where a.salon_id = $1
              and a.barber_id = any($2::uuid[])
              and a.start_at < $4
              and a.end_at > $3
            order by a.start_at asc
          `,
          [input.salonId, barberIds, dayStart.toISOString(), dayEnd.toISOString()],
        ),
      ]);

    const workingHours = mapWorkingHours(workingHoursResult.rows[0]);
    const dayOffByBarber = new Map<string, ScheduleDayOff>();
    const blockedSlotsByBarber = new Map<string, ScheduleDayBlockedSlot[]>();
    const appointmentsByBarber = new Map<string, ScheduleDayAppointment[]>();

    for (const row of dayOffResult.rows) {
      dayOffByBarber.set(row.barber_id, mapDayOff(row)!);
    }

    for (const row of blockedSlotsResult.rows) {
      const items = blockedSlotsByBarber.get(row.barber_id) ?? [];
      items.push(mapBlockedSlot(row));
      blockedSlotsByBarber.set(row.barber_id, items);
    }

    for (const row of appointmentsResult.rows) {
      const items = appointmentsByBarber.get(row.barber_id) ?? [];
      items.push(mapAppointment(row));
      appointmentsByBarber.set(row.barber_id, items);
    }

    const scheduleBarbers: ScheduleDayBarber[] = barbers.map((barber) => ({
      barberId: barber.id,
      displayName: barber.display_name,
      isActive: barber.is_active,
      workingHours,
      dayOff: dayOffByBarber.get(barber.id) ?? null,
      blockedSlots: blockedSlotsByBarber.get(barber.id) ?? [],
      appointments: appointmentsByBarber.get(barber.id) ?? [],
      summary: {
        totalSegments: 0,
        freeSegments: 0,
        bookedSegments: 0,
        blockedSegments: 0,
        dayOffSegments: 0,
        requiresRescheduleSegments: 0,
      },
      segments: [],
    }));

    return {
      date: input.date,
      timezone: salon.timezone,
      slotGranularityMinutes: salon.slot_granularity_minutes,
      barbers: scheduleBarbers,
      calendar: {
        timeAxis: [],
        columns: [],
      },
    };
  }

  private async requireBarberContext(
    salonId: string,
    barberId: string,
  ): Promise<BarberScheduleContext> {
    const context = await this.getBarberScheduleContext(salonId, barberId);

    if (!context) {
      throw new Error('Barber context missing.');
    }

    return context;
  }

  private async markAppointmentsForReschedule(
    client: PoolClient,
    input: {
      salonId: string;
      barberId: string;
      startAt: string;
      endAt: string;
      reason: string;
    },
  ): Promise<number> {
    const updateResult = await client.query<ImpactedAppointmentRow>(
      `
        update appointment
        set
          status = $5,
          cancelled_at = null,
          cancel_reason = null,
          requires_reschedule_reason = $6
        where salon_id = $1
          and barber_id = $2
          and status = $3
          and start_at < $4
          and end_at > $7
        returning id, customer_id
      `,
      [
        input.salonId,
        input.barberId,
        AppointmentStatus.CONFIRMED,
        input.endAt,
        AppointmentStatus.REQUIRES_RESCHEDULE,
        input.reason,
        input.startAt,
      ],
    );

    if (updateResult.rows.length === 0) {
      return 0;
    }

    await client.query(
      `
        insert into notification (
          salon_id,
          customer_id,
          appointment_id,
          type,
          channel,
          title,
          body,
          status,
          sent_at
        )
        select
          $1,
          impacted.customer_id,
          impacted.id,
          'RESCHEDULE_REQUIRED',
          'IN_APP',
          'Termin zahteva ponovno zakazivanje',
          'Vas barber nije dostupan za zakazani termin. Izaberite drugog barbera ili novi termin.',
          'SENT',
          now()
        from unnest($2::uuid[], $3::uuid[]) as impacted(id, customer_id)
      `,
      [
        input.salonId,
        updateResult.rows.map((row) => row.id),
        updateResult.rows.map((row) => row.customer_id),
      ],
    );

    return updateResult.rows.length;
  }

  private async rollbackQuietly(client: PoolClient): Promise<void> {
    try {
      await client.query('rollback');
    } catch {
      return;
    }
  }
}
