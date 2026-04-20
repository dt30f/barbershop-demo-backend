type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

function getParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = getFormatter(timeZone).formatToParts(date);

  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: valueOf('year'),
    month: valueOf('month'),
    day: valueOf('day'),
    hour: valueOf('hour'),
    minute: valueOf('minute'),
    second: valueOf('second'),
  };
}

function getOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const rawOffset =
    parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';

  const normalized = rawOffset.replace('GMT', '');
  if (normalized === '' || normalized === '+0' || normalized === '-0') {
    return 0;
  }

  const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unsupported timezone offset format: ${rawOffset}`);
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? '0');

  return sign * (hours * 60 + minutes);
}

export function getTodayInTimeZone(timeZone: string, now = new Date()): string {
  const parts = getParts(now, timeZone);

  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

export function addDaysToLocalDate(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return utcDate.toISOString().slice(0, 10);
}

export function getDayOfWeekFromLocalDate(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const jsDay = date.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function parseLocalDateTimeToUtcDate(
  localDate: string,
  localTime: string,
  timeZone: string,
): Date {
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, minute, second = 0] = localTime.split(':').map(Number);

  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const firstOffset = getOffsetMinutes(naiveUtc, timeZone);
  const firstPass = new Date(naiveUtc.getTime() - firstOffset * 60_000);
  const finalOffset = getOffsetMinutes(firstPass, timeZone);

  return new Date(naiveUtc.getTime() - finalOffset * 60_000);
}

export function formatUtcDateInTimeZone(date: Date, timeZone: string): string {
  const parts = getParts(date, timeZone);
  const offsetMinutes = getOffsetMinutes(date, timeZone);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const offsetMins = absoluteOffset % 60;

  return (
    `${String(parts.year).padStart(4, '0')}-` +
    `${String(parts.month).padStart(2, '0')}-` +
    `${String(parts.day).padStart(2, '0')}T` +
    `${String(parts.hour).padStart(2, '0')}:` +
    `${String(parts.minute).padStart(2, '0')}:` +
    `${String(parts.second).padStart(2, '0')}` +
    `${sign}${String(offsetHours).padStart(2, '0')}:` +
    `${String(offsetMins).padStart(2, '0')}`
  );
}
