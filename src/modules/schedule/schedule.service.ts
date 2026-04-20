import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import {
  AppointmentStatus,
} from '../appointments/appointments.enums';
import {
  addDaysToLocalDate,
  formatUtcDateInTimeZone,
  parseLocalDateTimeToUtcDate,
  getTodayInTimeZone,
} from '../availability/availability.timezone';
import { BlockedSlotReasonType } from './schedule.enums';
import { ScheduleRepository } from './schedule.repository';
import {
  CreateBarberDayOffResult,
  CreateBlockedSlotResult,
  DeleteScheduleItemResult,
  GetScheduleDayResult,
  GetScheduleWeekResult,
  ScheduleDayBarber,
  ScheduleDayCalendar,
  ScheduleDayCalendarColumn,
  ScheduleDaySummary,
  ScheduleDaySegment,
  ScheduleWeekCalendar,
} from './schedule.types';

function parseTimeToMinutes(localTime: string): number {
  const [hours, minutes] = localTime.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToLocalTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function rangesOverlap(
  rangeA: { start: Date; end: Date },
  rangeB: { start: Date; end: Date },
): boolean {
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}

function buildEmptySummary(): ScheduleDaySummary {
  return {
    totalSegments: 0,
    freeSegments: 0,
    bookedSegments: 0,
    blockedSegments: 0,
    dayOffSegments: 0,
    requiresRescheduleSegments: 0,
  };
}

function buildSummaryFromSegments(segments: ScheduleDaySegment[]): ScheduleDaySummary {
  const summary = buildEmptySummary();
  summary.totalSegments = segments.length;

  for (const segment of segments) {
    switch (segment.state) {
      case 'FREE':
        summary.freeSegments += 1;
        break;
      case 'BOOKED':
        summary.bookedSegments += 1;
        break;
      case 'BLOCKED':
        summary.blockedSegments += 1;
        break;
      case 'DAY_OFF':
        summary.dayOffSegments += 1;
        break;
      case 'REQUIRES_RESCHEDULE':
        summary.requiresRescheduleSegments += 1;
        break;
    }
  }

  return summary;
}

function buildCalendarItemTitle(input: {
  serviceName?: string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string;
  reason?: string | null;
  reasonType?: string;
}): { title: string; subtitle?: string } {
  if (input.serviceName) {
    const customerName = [input.customerFirstName, input.customerLastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      title: input.serviceName,
      subtitle: customerName || input.customerPhone,
    };
  }

  if (input.reasonType) {
    return {
      title: input.reasonType.replace(/_/g, ' '),
      subtitle: input.reason ?? undefined,
    };
  }

  return {
    title: 'Day off',
    subtitle: input.reason ?? undefined,
  };
}

function buildSegmentsForBarber(input: {
  date: string;
  timeZone: string;
  slotGranularityMinutes: number;
  barber: ScheduleDayBarber;
}): ScheduleDaySegment[] {
  const { barber, date, timeZone, slotGranularityMinutes } = input;

  if (!barber.workingHours || !barber.workingHours.isActive) {
    return [];
  }

  const workStartMinutes = parseTimeToMinutes(barber.workingHours.startTimeLocal);
  const workEndMinutes = parseTimeToMinutes(barber.workingHours.endTimeLocal);
  const segments: ScheduleDaySegment[] = [];

  for (
    let currentMinutes = workStartMinutes;
    currentMinutes < workEndMinutes;
    currentMinutes += slotGranularityMinutes
  ) {
    const nextMinutes = Math.min(currentMinutes + slotGranularityMinutes, workEndMinutes);
    const segmentStart = parseLocalDateTimeToUtcDate(
      date,
      formatMinutesToLocalTime(currentMinutes),
      timeZone,
    );
    const segmentEnd = parseLocalDateTimeToUtcDate(
      date,
      formatMinutesToLocalTime(nextMinutes),
      timeZone,
    );

    const segmentRange = { start: segmentStart, end: segmentEnd };
    const requiresRescheduleAppointment = barber.appointments.find(
      (appointment) =>
        appointment.status === AppointmentStatus.REQUIRES_RESCHEDULE &&
        rangesOverlap(segmentRange, {
          start: new Date(appointment.startAt),
          end: new Date(appointment.endAt),
        }),
    );

    if (requiresRescheduleAppointment) {
      segments.push({
        startAt: formatUtcDateInTimeZone(segmentStart, timeZone),
        endAt: formatUtcDateInTimeZone(segmentEnd, timeZone),
        state: 'REQUIRES_RESCHEDULE',
        appointmentId: requiresRescheduleAppointment.id,
      });
      continue;
    }

    if (barber.dayOff) {
      segments.push({
        startAt: formatUtcDateInTimeZone(segmentStart, timeZone),
        endAt: formatUtcDateInTimeZone(segmentEnd, timeZone),
        state: 'DAY_OFF',
      });
      continue;
    }

    const activeAppointment = barber.appointments.find(
      (appointment) =>
        appointment.status !== AppointmentStatus.CANCELLED &&
        appointment.status !== AppointmentStatus.REQUIRES_RESCHEDULE &&
        rangesOverlap(segmentRange, {
          start: new Date(appointment.startAt),
          end: new Date(appointment.endAt),
        }),
    );

    if (activeAppointment) {
      segments.push({
        startAt: formatUtcDateInTimeZone(segmentStart, timeZone),
        endAt: formatUtcDateInTimeZone(segmentEnd, timeZone),
        state: 'BOOKED',
        appointmentId: activeAppointment.id,
      });
      continue;
    }

    const blockedSlot = barber.blockedSlots.find((slot) =>
      rangesOverlap(segmentRange, {
        start: new Date(slot.startAt),
        end: new Date(slot.endAt),
      }),
    );

    if (blockedSlot) {
      segments.push({
        startAt: formatUtcDateInTimeZone(segmentStart, timeZone),
        endAt: formatUtcDateInTimeZone(segmentEnd, timeZone),
        state: 'BLOCKED',
        blockedSlotId: blockedSlot.id,
      });
      continue;
    }

    segments.push({
      startAt: formatUtcDateInTimeZone(segmentStart, timeZone),
      endAt: formatUtcDateInTimeZone(segmentEnd, timeZone),
      state: 'FREE',
    });
  }

  return segments;
}

function buildTimeAxis(result: {
  date: string;
  timeZone: string;
  slotGranularityMinutes: number;
  barbers: ScheduleDayBarber[];
}): ScheduleDayCalendar['timeAxis'] {
  const activeWorkingHours = result.barbers
    .map((barber) => barber.workingHours)
    .filter(
      (workingHours): workingHours is NonNullable<ScheduleDayBarber['workingHours']> =>
        Boolean(workingHours?.isActive),
    );

  if (activeWorkingHours.length === 0) {
    return [];
  }

  const earliestMinutes = Math.min(
    ...activeWorkingHours.map((workingHours) =>
      parseTimeToMinutes(workingHours.startTimeLocal),
    ),
  );
  const latestMinutes = Math.max(
    ...activeWorkingHours.map((workingHours) =>
      parseTimeToMinutes(workingHours.endTimeLocal),
    ),
  );
  const slots: ScheduleDayCalendar['timeAxis'] = [];

  for (
    let currentMinutes = earliestMinutes;
    currentMinutes < latestMinutes;
    currentMinutes += result.slotGranularityMinutes
  ) {
    const nextMinutes = Math.min(
      currentMinutes + result.slotGranularityMinutes,
      latestMinutes,
    );
    const slotStart = parseLocalDateTimeToUtcDate(
      result.date,
      formatMinutesToLocalTime(currentMinutes),
      result.timeZone,
    );
    const slotEnd = parseLocalDateTimeToUtcDate(
      result.date,
      formatMinutesToLocalTime(nextMinutes),
      result.timeZone,
    );

    slots.push({
      startAt: formatUtcDateInTimeZone(slotStart, result.timeZone),
      endAt: formatUtcDateInTimeZone(slotEnd, result.timeZone),
      label: formatMinutesToLocalTime(currentMinutes).slice(0, 5),
    });
  }

  return slots;
}

function buildCalendarColumns(result: GetScheduleDayResult): ScheduleDayCalendarColumn[] {
  return result.barbers.map((barber) => {
    const items = [
      ...barber.appointments.map((appointment) => {
        const title = buildCalendarItemTitle({
          serviceName: appointment.serviceName,
          customerFirstName: appointment.customerFirstName,
          customerLastName: appointment.customerLastName,
          customerPhone: appointment.customerPhone,
        });

        return {
          id: appointment.id,
          type: 'APPOINTMENT' as const,
          startAt: formatUtcDateInTimeZone(
            new Date(appointment.startAt),
            result.timezone,
          ),
          endAt: formatUtcDateInTimeZone(
            new Date(appointment.endAt),
            result.timezone,
          ),
          title: title.title,
          subtitle: title.subtitle,
          status: appointment.status,
          appointmentId: appointment.id,
        };
      }),
      ...barber.blockedSlots.map((slot) => {
        const title = buildCalendarItemTitle({
          reasonType: slot.reasonType,
          reason: slot.note,
        });

        return {
          id: slot.id,
          type: 'BLOCKED_SLOT' as const,
          startAt: slot.startAt,
          endAt: slot.endAt,
          title: title.title,
          subtitle: title.subtitle,
          blockedSlotId: slot.id,
        };
      }),
      ...(barber.dayOff && barber.workingHours && barber.workingHours.isActive
        ? [
            (() => {
              const startAt = parseLocalDateTimeToUtcDate(
                result.date,
                barber.workingHours.startTimeLocal,
                result.timezone,
              );
              const endAt = parseLocalDateTimeToUtcDate(
                result.date,
                barber.workingHours.endTimeLocal,
                result.timezone,
              );
              const title = buildCalendarItemTitle({
                reason: barber.dayOff.reason,
              });

              return {
                id: barber.dayOff.id,
                type: 'DAY_OFF' as const,
                startAt: formatUtcDateInTimeZone(startAt, result.timezone),
                endAt: formatUtcDateInTimeZone(endAt, result.timezone),
                title: title.title,
                subtitle: title.subtitle,
                dayOffId: barber.dayOff.id,
              };
            })(),
          ]
        : []),
    ].sort((left, right) => left.startAt.localeCompare(right.startAt));

    return {
      barberId: barber.barberId,
      displayName: barber.displayName,
      summary: barber.summary,
      items,
    };
  });
}

function buildDayCalendar(result: GetScheduleDayResult): ScheduleDayCalendar {
  return {
    timeAxis: buildTimeAxis({
      date: result.date,
      timeZone: result.timezone,
      slotGranularityMinutes: result.slotGranularityMinutes,
      barbers: result.barbers,
    }),
    columns: buildCalendarColumns(result),
  };
}

function buildWeekCalendar(result: GetScheduleWeekResult): ScheduleWeekCalendar {
  const columnMap = new Map<
    string,
    { barberId: string; displayName: string; isActive: boolean }
  >();

  for (const day of result.days) {
    for (const barber of day.barbers) {
      if (!columnMap.has(barber.barberId)) {
        columnMap.set(barber.barberId, {
          barberId: barber.barberId,
          displayName: barber.displayName,
          isActive: barber.isActive,
        });
      }
    }
  }

  const columns = [...columnMap.values()].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );

  return {
    columns,
    days: result.days.map((day) => ({
      date: day.date,
      cells: columns.map((column) => {
        const barber = day.barbers.find((item) => item.barberId === column.barberId);

        return {
          barberId: column.barberId,
          displayName: column.displayName,
          isWorkingDay: Boolean(barber?.workingHours?.isActive),
          hasDayOff: Boolean(barber?.dayOff),
          appointmentCount: barber?.appointments.length ?? 0,
          blockedSlotCount: barber?.blockedSlots.length ?? 0,
          summary: barber?.summary ?? buildEmptySummary(),
        };
      }),
    })),
  };
}

function enrichScheduleDayResult(result: GetScheduleDayResult): GetScheduleDayResult {
  const enrichedResult: GetScheduleDayResult = {
    ...result,
    barbers: result.barbers.map((barber) => {
      const segments = buildSegmentsForBarber({
        date: result.date,
        timeZone: result.timezone,
        slotGranularityMinutes: result.slotGranularityMinutes,
        barber,
      });

      return {
        ...barber,
        segments,
        summary: buildSummaryFromSegments(segments),
      };
    }),
  };

  return {
    ...enrichedResult,
    calendar: buildDayCalendar(enrichedResult),
  };
}

function normalizeDateOnly(value: string): string {
  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new UnprocessableEntityException('dateLocal mora biti u YYYY-MM-DD formatu.');
  }

  return normalized;
}

async function getWeekDays(params: {
  startDate: string;
  buildDay: (date: string) => Promise<GetScheduleDayResult>;
}): Promise<GetScheduleDayResult[]> {
  const days: GetScheduleDayResult[] = [];

  for (let index = 0; index < 7; index += 1) {
    const date = addDaysToLocalDate(params.startDate, index);
    days.push(await params.buildDay(date));
  }

  return days;
}

function assertFutureOrTodayDate(dateLocal: string, todayLocal: string): void {
  if (dateLocal < todayLocal) {
    throw new ConflictException('Slobodan dan nije moguce dodati za prosli datum.');
  }
}

function assertFutureBlockedSlot(startAt: Date, endAt: Date): void {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new UnprocessableEntityException('startAt i endAt moraju biti validni ISO datumi.');
  }

  if (endAt <= startAt) {
    throw new UnprocessableEntityException('endAt mora biti posle startAt.');
  }

  if (startAt <= new Date()) {
    throw new ConflictException('Blokiranje vremena je dozvoljeno samo za buduce termine.');
  }
}

@Injectable()
export class ScheduleService {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async getAdminScheduleDay(input: {
    salonId: string;
    date: string;
    barberId?: string;
  }): Promise<GetScheduleDayResult> {
    const date = normalizeDateOnly(input.date);
    const result = await this.scheduleRepository.getScheduleDay({
      salonId: input.salonId,
      date,
      barberId: input.barberId,
    });

    if (!result || (input.barberId && result.barbers.length === 0)) {
      throw new NotFoundException('Raspored za trazenog barbera nije pronadjen.');
    }

    return enrichScheduleDayResult(result);
  }

  async getBarberOwnScheduleDay(input: {
    salonId: string;
    barberId: string;
    date: string;
  }): Promise<GetScheduleDayResult> {
    const date = normalizeDateOnly(input.date);
    const result = await this.scheduleRepository.getScheduleDay({
      salonId: input.salonId,
      date,
      barberId: input.barberId,
    });

    if (!result || result.barbers.length === 0) {
      throw new NotFoundException('Raspored za barbera nije pronadjen.');
    }

    return enrichScheduleDayResult(result);
  }

  async getAdminScheduleWeek(input: {
    salonId: string;
    startDate: string;
    barberId?: string;
  }): Promise<GetScheduleWeekResult> {
    const startDate = normalizeDateOnly(input.startDate);
    const days = await getWeekDays({
      startDate,
      buildDay: async (date) => {
        const result = await this.scheduleRepository.getScheduleDay({
          salonId: input.salonId,
          date,
          barberId: input.barberId,
        });

        if (!result) {
          throw new NotFoundException('Raspored nije pronadjen.');
        }

        return enrichScheduleDayResult(result);
      },
    });

    if (input.barberId && days.every((day) => day.barbers.length === 0)) {
      throw new NotFoundException('Raspored za trazenog barbera nije pronadjen.');
    }

    return {
      startDate,
      endDate: addDaysToLocalDate(startDate, 6),
      timezone: days[0].timezone,
      slotGranularityMinutes: days[0].slotGranularityMinutes,
      days,
      calendar: buildWeekCalendar({
        startDate,
        endDate: addDaysToLocalDate(startDate, 6),
        timezone: days[0].timezone,
        slotGranularityMinutes: days[0].slotGranularityMinutes,
        days,
        calendar: {
          columns: [],
          days: [],
        },
      }),
    };
  }

  async getBarberOwnScheduleWeek(input: {
    salonId: string;
    barberId: string;
    startDate: string;
  }): Promise<GetScheduleWeekResult> {
    const startDate = normalizeDateOnly(input.startDate);
    const days = await getWeekDays({
      startDate,
      buildDay: async (date) => {
        const result = await this.scheduleRepository.getScheduleDay({
          salonId: input.salonId,
          date,
          barberId: input.barberId,
        });

        if (!result) {
          throw new NotFoundException('Raspored za barbera nije pronadjen.');
        }

        return enrichScheduleDayResult(result);
      },
    });

    if (days.every((day) => day.barbers.length === 0)) {
      throw new NotFoundException('Raspored za barbera nije pronadjen.');
    }

    return {
      startDate,
      endDate: addDaysToLocalDate(startDate, 6),
      timezone: days[0].timezone,
      slotGranularityMinutes: days[0].slotGranularityMinutes,
      days,
      calendar: buildWeekCalendar({
        startDate,
        endDate: addDaysToLocalDate(startDate, 6),
        timezone: days[0].timezone,
        slotGranularityMinutes: days[0].slotGranularityMinutes,
        days,
        calendar: {
          columns: [],
          days: [],
        },
      }),
    };
  }

  async createAdminBarberDayOff(input: {
    salonId: string;
    adminUserId: string;
    barberId: string;
    dateLocal: string;
    reason?: string;
  }): Promise<CreateBarberDayOffResult> {
    return this.createBarberDayOffFlow({
      salonId: input.salonId,
      barberId: input.barberId,
      dateLocal: input.dateLocal,
      reason: input.reason,
      createdByAdminUserId: input.adminUserId,
    });
  }

  async createBarberOwnDayOff(input: {
    salonId: string;
    barberId: string;
    dateLocal: string;
    reason?: string;
  }): Promise<CreateBarberDayOffResult> {
    return this.createBarberDayOffFlow(input);
  }

  async deleteAdminBarberDayOff(input: {
    salonId: string;
    barberId: string;
    dayOffId: string;
  }): Promise<DeleteScheduleItemResult> {
    return this.deleteDayOffFlow(input);
  }

  async deleteBarberOwnDayOff(input: {
    salonId: string;
    barberId: string;
    dayOffId: string;
  }): Promise<DeleteScheduleItemResult> {
    return this.deleteDayOffFlow(input);
  }

  async createAdminBlockedSlot(input: {
    salonId: string;
    adminUserId: string;
    barberId: string;
    startAt: string;
    endAt: string;
    reasonType: BlockedSlotReasonType;
    note?: string;
  }): Promise<CreateBlockedSlotResult> {
    return this.createBlockedSlotFlow({
      salonId: input.salonId,
      barberId: input.barberId,
      startAt: input.startAt,
      endAt: input.endAt,
      reasonType: input.reasonType,
      note: input.note,
      createdByAdminUserId: input.adminUserId,
    });
  }

  async createBarberOwnBlockedSlot(input: {
    salonId: string;
    barberId: string;
    startAt: string;
    endAt: string;
    reasonType: BlockedSlotReasonType;
    note?: string;
  }): Promise<CreateBlockedSlotResult> {
    return this.createBlockedSlotFlow(input);
  }

  async deleteAdminBlockedSlot(input: {
    salonId: string;
    barberId: string;
    blockedSlotId: string;
  }): Promise<DeleteScheduleItemResult> {
    return this.deleteBlockedSlotFlow(input);
  }

  async deleteBarberOwnBlockedSlot(input: {
    salonId: string;
    barberId: string;
    blockedSlotId: string;
  }): Promise<DeleteScheduleItemResult> {
    return this.deleteBlockedSlotFlow(input);
  }

  private async createBarberDayOffFlow(input: {
    salonId: string;
    barberId: string;
    dateLocal: string;
    reason?: string;
    createdByAdminUserId?: string;
  }): Promise<CreateBarberDayOffResult> {
    const context = await this.scheduleRepository.getBarberScheduleContext(
      input.salonId,
      input.barberId,
    );

    if (!context) {
      throw new NotFoundException('Barber nije pronadjen.');
    }

    if (!context.barber.isActive) {
      throw new UnprocessableEntityException(
        'Day off nije moguce dodati za neaktivan barber nalog.',
      );
    }

    const dateLocal = normalizeDateOnly(input.dateLocal);
    assertFutureOrTodayDate(
      dateLocal,
      getTodayInTimeZone(context.salon.timezone),
    );

    try {
      return await this.scheduleRepository.createBarberDayOff({
        salonId: input.salonId,
        barberId: input.barberId,
        dateLocal,
        reason: input.reason,
        createdByAdminUserId: input.createdByAdminUserId,
      });
    } catch (error) {
      this.handleCreateError(error, 'Vec postoji slobodan dan za izabrani datum.');
    }
  }

  private async deleteDayOffFlow(input: {
    salonId: string;
    barberId: string;
    dayOffId: string;
  }): Promise<DeleteScheduleItemResult> {
    const deleted = await this.scheduleRepository.deleteBarberDayOff(input);

    if (!deleted) {
      throw new NotFoundException('Slobodan dan nije pronadjen.');
    }

    return {
      id: input.dayOffId,
      success: true,
    };
  }

  private async createBlockedSlotFlow(input: {
    salonId: string;
    barberId: string;
    startAt: string;
    endAt: string;
    reasonType: BlockedSlotReasonType;
    note?: string;
    createdByAdminUserId?: string;
  }): Promise<CreateBlockedSlotResult> {
    const context = await this.scheduleRepository.getBarberScheduleContext(
      input.salonId,
      input.barberId,
    );

    if (!context) {
      throw new NotFoundException('Barber nije pronadjen.');
    }

    if (!context.barber.isActive) {
      throw new UnprocessableEntityException(
        'Blokirani termin nije moguce dodati za neaktivan barber nalog.',
      );
    }

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    assertFutureBlockedSlot(startAt, endAt);

    const localStartDate = formatUtcDateInTimeZone(startAt, context.salon.timezone).slice(
      0,
      10,
    );
    const localEndDate = formatUtcDateInTimeZone(endAt, context.salon.timezone).slice(
      0,
      10,
    );

    if (localStartDate !== localEndDate) {
      throw new UnprocessableEntityException(
        'Blocked slot mora ostati unutar jednog lokalnog dana.',
      );
    }

    try {
      return await this.scheduleRepository.createBlockedSlot({
        salonId: input.salonId,
        barberId: input.barberId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reasonType: input.reasonType,
        note: input.note,
        createdByAdminUserId: input.createdByAdminUserId,
      });
    } catch (error) {
      this.handleCreateError(
        error,
        'Blokirani termin se preklapa sa postojecim blokiranim intervalom.',
      );
    }
  }

  private async deleteBlockedSlotFlow(input: {
    salonId: string;
    barberId: string;
    blockedSlotId: string;
  }): Promise<DeleteScheduleItemResult> {
    const deleted = await this.scheduleRepository.deleteBlockedSlot(input);

    if (!deleted) {
      throw new NotFoundException('Blocked slot nije pronadjen.');
    }

    return {
      id: input.blockedSlotId,
      success: true,
    };
  }

  private handleCreateError(error: unknown, conflictMessage: string): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === '23505' || error.code === '23P01')
    ) {
      throw new ConflictException(conflictMessage);
    }

    throw error;
  }
}
