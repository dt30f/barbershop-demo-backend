import {
  addDaysToLocalDate,
  formatUtcDateInTimeZone,
  getDayOfWeekFromLocalDate,
  getTodayInTimeZone,
  parseLocalDateTimeToUtcDate,
} from '../availability/availability.timezone';
import { AppointmentCreatedByType, AppointmentStatus } from './appointments.enums';
import { BookingContext, CustomerSnapshot } from './appointments.repository';
import {
  AppointmentPersistencePayload,
  AppointmentSummary,
  CustomerAppointmentListItem,
} from './appointments.types';

function parseTimeToMinutes(localTime: string): number {
  const [hours, minutes] = localTime.split(':').map(Number);
  return hours * 60 + minutes;
}

function getLocalDateFromIso(isoDateTime: string, timeZone: string): string {
  return formatUtcDateInTimeZone(new Date(isoDateTime), timeZone).slice(0, 10);
}

function getLocalTimeFromIso(isoDateTime: string, timeZone: string): string {
  return formatUtcDateInTimeZone(new Date(isoDateTime), timeZone).slice(11, 19);
}

function rangesOverlap(
  rangeA: { start: Date; end: Date },
  rangeB: { start: Date; end: Date },
): boolean {
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}

function resolveServiceDurationMinutes(context: BookingContext): number {
  return (
    context.barberService.durationOverrideMinutes ?? context.service.durationMinutes
  );
}

export function validateBookableStartAt(
  startAt: string,
  context: BookingContext,
): {
  localDate: string;
  localTime: string;
  endAt: string;
  durationMinutes: number;
} {
  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid startAt datetime.');
  }

  const localDate = getLocalDateFromIso(startAt, context.salon.timezone);
  const localTime = getLocalTimeFromIso(startAt, context.salon.timezone);
  const todayInSalonTime = getTodayInTimeZone(context.salon.timezone);
  const lastBookableDate = addDaysToLocalDate(todayInSalonTime, 14);

  if (localDate < todayInSalonTime || localDate > lastBookableDate) {
    throw new Error('Start time is outside of the booking horizon.');
  }

  if (!context.barber.isActive || !context.service.isActive || !context.barberService.isActive) {
    throw new Error('Barber or service is not active.');
  }

  if (context.barberService.barberId !== context.barber.id) {
    throw new Error('Barber service does not belong to the requested barber.');
  }

  if (context.barberService.serviceId !== context.service.id) {
    throw new Error('Barber service does not match the requested service.');
  }

  if (context.barberDayOff) {
    throw new Error('Barber is not available on the selected day.');
  }

  const workingHours = context.workingHours;
  const requestedDayOfWeek = getDayOfWeekFromLocalDate(localDate);

  if (
    !workingHours ||
    !workingHours.isActive ||
    workingHours.dayOfWeek !== requestedDayOfWeek
  ) {
    throw new Error('Selected time is outside of working hours.');
  }

  const startMinutes = parseTimeToMinutes(localTime);
  const workStartMinutes = parseTimeToMinutes(workingHours.startTimeLocal);
  const workEndMinutes = parseTimeToMinutes(workingHours.endTimeLocal);
  const durationMinutes = resolveServiceDurationMinutes(context);
  const endMinutes = startMinutes + durationMinutes;

  if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
    throw new Error('Selected time is outside of working hours.');
  }

  if ((startMinutes - workStartMinutes) % context.salon.slotGranularityMinutes !== 0) {
    throw new Error('Selected time is not aligned with slot granularity.');
  }

  const slotEndDate = new Date(startDate.getTime() + durationMinutes * 60_000);

  const overlapsBlockedSlot = context.blockedSlots.some((interval) =>
    rangesOverlap(
      { start: startDate, end: slotEndDate },
      {
        start: new Date(interval.startAt),
        end: new Date(interval.endAt),
      },
    ),
  );

  if (overlapsBlockedSlot) {
    throw new Error('Selected time overlaps a blocked slot.');
  }

  const overlapsAppointment = context.appointments.some((interval) =>
    rangesOverlap(
      { start: startDate, end: slotEndDate },
      {
        start: new Date(interval.startAt),
        end: new Date(interval.endAt),
      },
    ),
  );

  if (overlapsAppointment) {
    throw new Error('Selected time overlaps an existing appointment.');
  }

  return {
    localDate,
    localTime,
    endAt: slotEndDate.toISOString(),
    durationMinutes,
  };
}

export function buildAppointmentPayload(params: {
  context: BookingContext;
  customer: CustomerSnapshot;
  startAt: string;
  endAt: string;
  createdByType: AppointmentCreatedByType;
}): AppointmentPersistencePayload {
  const { context, customer, startAt, endAt, createdByType } = params;

  return {
    barberId: context.barber.id,
    customerId: customer.id,
    serviceId: context.service.id,
    barberServiceId: context.barberService.id,
    status: AppointmentStatus.CONFIRMED,
    createdByType,
    startAt,
    endAt,
    serviceNameSnapshot: context.service.name,
    barberNameSnapshot: context.barber.displayName,
    priceAmount: context.barberService.priceAmount,
    currency: context.barberService.currency,
    customerPhoneSnapshot: customer.phoneNumber,
  };
}

export function mapAppointmentSummary(record: {
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
}): AppointmentSummary {
  return {
    id: record.id,
    status: record.status,
    barberId: record.barberId,
    barberName: record.barberName,
    serviceId: record.serviceId,
    serviceName: record.serviceName,
    startAt: record.startAt,
    endAt: record.endAt,
    priceAmount: record.priceAmount,
    currency: record.currency,
  };
}

export function mapCustomerAppointmentList(
  record: {
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
  },
  now = new Date(),
): CustomerAppointmentListItem {
  const cancellationDeadline = new Date(
    new Date(record.startAt).getTime() - 24 * 60 * 60_000,
  );

  return {
    id: record.id,
    status: record.status,
    barberId: record.barberId,
    barberName: record.barberName,
    serviceId: record.serviceId,
    serviceName: record.serviceName,
    startAt: record.startAt,
    endAt: record.endAt,
    priceAmount: record.priceAmount,
    currency: record.currency,
    canCancel:
      record.status === AppointmentStatus.CONFIRMED && now < cancellationDeadline,
  };
}
