import { BlockedSlotReasonType } from './schedule.enums';
import { AppointmentCreatedByType, AppointmentStatus } from '../appointments/appointments.enums';

export type CreateBarberDayOffResult = {
  id: string;
  barberId: string;
  dateLocal: string;
  reason?: string | null;
  impactedAppointments: number;
};

export type CreateBlockedSlotResult = {
  id: string;
  barberId: string;
  startAt: string;
  endAt: string;
  reasonType: BlockedSlotReasonType;
  note?: string | null;
  impactedAppointments: number;
};

export type DeleteScheduleItemResult = {
  id: string;
  success: true;
};

export type ScheduleDayWorkingHours = {
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export type ScheduleDayOff = {
  id: string;
  dateLocal: string;
  reason?: string | null;
};

export type ScheduleDayBlockedSlot = {
  id: string;
  startAt: string;
  endAt: string;
  reasonType: BlockedSlotReasonType;
  note?: string | null;
};

export type ScheduleDayAppointment = {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone: string;
  createdByType: AppointmentCreatedByType;
};

export type ScheduleDaySegmentState =
  | 'FREE'
  | 'BOOKED'
  | 'BLOCKED'
  | 'DAY_OFF'
  | 'REQUIRES_RESCHEDULE';

export type ScheduleDaySegment = {
  startAt: string;
  endAt: string;
  state: ScheduleDaySegmentState;
  appointmentId?: string;
  blockedSlotId?: string;
};

export type ScheduleCalendarItemType =
  | 'APPOINTMENT'
  | 'BLOCKED_SLOT'
  | 'DAY_OFF';

export type ScheduleCalendarItem = {
  id: string;
  type: ScheduleCalendarItemType;
  startAt: string;
  endAt: string;
  title: string;
  subtitle?: string;
  status?: AppointmentStatus;
  appointmentId?: string;
  blockedSlotId?: string;
  dayOffId?: string;
};

export type ScheduleDaySummary = {
  totalSegments: number;
  freeSegments: number;
  bookedSegments: number;
  blockedSegments: number;
  dayOffSegments: number;
  requiresRescheduleSegments: number;
};

export type ScheduleDayBarber = {
  barberId: string;
  displayName: string;
  isActive: boolean;
  workingHours: ScheduleDayWorkingHours | null;
  dayOff: ScheduleDayOff | null;
  blockedSlots: ScheduleDayBlockedSlot[];
  appointments: ScheduleDayAppointment[];
  summary: ScheduleDaySummary;
  segments: ScheduleDaySegment[];
};

export type ScheduleCalendarTimeSlot = {
  startAt: string;
  endAt: string;
  label: string;
};

export type ScheduleDayCalendarColumn = {
  barberId: string;
  displayName: string;
  summary: ScheduleDaySummary;
  items: ScheduleCalendarItem[];
};

export type ScheduleDayCalendar = {
  timeAxis: ScheduleCalendarTimeSlot[];
  columns: ScheduleDayCalendarColumn[];
};

export type GetScheduleDayResult = {
  date: string;
  timezone: string;
  slotGranularityMinutes: number;
  barbers: ScheduleDayBarber[];
  calendar: ScheduleDayCalendar;
};

export type ScheduleWeekCalendarColumn = {
  barberId: string;
  displayName: string;
  isActive: boolean;
};

export type ScheduleWeekCalendarCell = {
  barberId: string;
  displayName: string;
  isWorkingDay: boolean;
  hasDayOff: boolean;
  appointmentCount: number;
  blockedSlotCount: number;
  summary: ScheduleDaySummary;
};

export type ScheduleWeekCalendarDay = {
  date: string;
  cells: ScheduleWeekCalendarCell[];
};

export type ScheduleWeekCalendar = {
  columns: ScheduleWeekCalendarColumn[];
  days: ScheduleWeekCalendarDay[];
};

export type GetScheduleWeekResult = {
  startDate: string;
  endDate: string;
  timezone: string;
  slotGranularityMinutes: number;
  days: GetScheduleDayResult[];
  calendar: ScheduleWeekCalendar;
};
