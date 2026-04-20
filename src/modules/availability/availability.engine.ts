import {
  formatUtcDateInTimeZone,
  getDayOfWeekFromLocalDate,
  parseLocalDateTimeToUtcDate,
} from './availability.timezone';
import {
  BarberAvailabilityContext,
  WorkingHoursWindow,
} from './availability.repository';
import {
  AvailabilitySlot,
  GetBarberAvailabilityInput,
  GetBarberAvailabilityResult,
} from './availability.types';

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

function buildCandidateSlots(params: {
  date: string;
  timeZone: string;
  workingHours: WorkingHoursWindow;
  slotGranularityMinutes: number;
  serviceDurationMinutes: number;
  blockedSlots: { startAt: string; endAt: string }[];
  appointments: { startAt: string; endAt: string }[];
}): AvailabilitySlot[] {
  const {
    date,
    timeZone,
    workingHours,
    slotGranularityMinutes,
    serviceDurationMinutes,
    blockedSlots,
    appointments,
  } = params;

  const workStartMinutes = parseTimeToMinutes(workingHours.startTimeLocal);
  const workEndMinutes = parseTimeToMinutes(workingHours.endTimeLocal);
  const latestAllowedStart = workEndMinutes - serviceDurationMinutes;
  const slots: AvailabilitySlot[] = [];

  for (
    let current = workStartMinutes;
    current <= latestAllowedStart;
    current += slotGranularityMinutes
  ) {
    const slotStart = parseLocalDateTimeToUtcDate(
      date,
      formatMinutesToLocalTime(current),
      timeZone,
    );
    const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60_000);

    const overlapsBlockedSlot = blockedSlots.some((interval) =>
      rangesOverlap(
        { start: slotStart, end: slotEnd },
        {
          start: new Date(interval.startAt),
          end: new Date(interval.endAt),
        },
      ),
    );

    if (overlapsBlockedSlot) {
      continue;
    }

    const overlapsAppointment = appointments.some((interval) =>
      rangesOverlap(
        { start: slotStart, end: slotEnd },
        {
          start: new Date(interval.startAt),
          end: new Date(interval.endAt),
        },
      ),
    );

    if (overlapsAppointment) {
      continue;
    }

    slots.push({
      startAt: formatUtcDateInTimeZone(slotStart, timeZone),
      endAt: formatUtcDateInTimeZone(slotEnd, timeZone),
    });
  }

  return slots;
}

export function calculateAvailability(params: {
  input: GetBarberAvailabilityInput;
  context: BarberAvailabilityContext;
}): GetBarberAvailabilityResult {
  const { input, context } = params;

  const { salon, barber, barberService, service, workingHours, barberDayOff } =
    context;

  const serviceDurationMinutes =
    barberService.durationOverrideMinutes ?? service.durationMinutes;

  if (barberDayOff) {
    return {
      date: input.date,
      barberId: input.barberId,
      barberServiceId: input.barberServiceId,
      barberAvailable: false,
      message: 'Barber nije dostupan ovog dana.',
      slotGranularityMinutes: salon.slotGranularityMinutes,
      serviceDurationMinutes,
      slots: [],
    };
  }

  if (!barber.isActive || !barberService.isActive || !service.isActive) {
    return {
      date: input.date,
      barberId: input.barberId,
      barberServiceId: input.barberServiceId,
      barberAvailable: false,
      message: 'Barber ili usluga nisu dostupni.',
      slotGranularityMinutes: salon.slotGranularityMinutes,
      serviceDurationMinutes,
      slots: [],
    };
  }

  const requestedDayOfWeek = getDayOfWeekFromLocalDate(input.date);
  const activeWindow =
    workingHours &&
    workingHours.isActive &&
    workingHours.dayOfWeek === requestedDayOfWeek
      ? workingHours
      : null;

  if (!activeWindow) {
    return {
      date: input.date,
      barberId: input.barberId,
      barberServiceId: input.barberServiceId,
      barberAvailable: false,
      message: 'Barber nije dostupan ovog dana.',
      slotGranularityMinutes: salon.slotGranularityMinutes,
      serviceDurationMinutes,
      slots: [],
    };
  }

  const slots = buildCandidateSlots({
    date: input.date,
    timeZone: salon.timezone,
    workingHours: activeWindow,
    slotGranularityMinutes: salon.slotGranularityMinutes,
    serviceDurationMinutes,
    blockedSlots: context.blockedSlots,
    appointments: context.appointments,
  });

  return {
    date: input.date,
    barberId: input.barberId,
    barberServiceId: input.barberServiceId,
    barberAvailable: true,
    message:
      slots.length === 0 ? 'Nema slobodnih termina za izabrani dan.' : null,
    slotGranularityMinutes: salon.slotGranularityMinutes,
    serviceDurationMinutes,
    slots,
  };
}
