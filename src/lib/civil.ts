import type { CivilDate } from './types';

const DAY = 86_400_000;

/** Days since 1970-01-01 for a civil date (pure arithmetic, timezone-free). */
export function dayNumber(c: CivilDate): number {
  return Math.round(Date.UTC(c.y, c.m - 1, c.d) / DAY);
}

export function fromDayNumber(n: number): CivilDate {
  const dt = new Date(n * DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function addDays(c: CivilDate, n: number): CivilDate {
  return fromDayNumber(dayNumber(c) + n);
}

export function diffDays(a: CivilDate, b: CivilDate): number {
  return dayNumber(a) - dayNumber(b);
}

export function sameDay(a: CivilDate, b: CivilDate): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(c: CivilDate): number {
  return new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();
}

export function key(c: CivilDate): string {
  return `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`;
}

export function parseKey(s: string): CivilDate {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** Noon UTC instant of a civil date — safe input for calendar formatters using timeZone:'UTC'. */
export function noonUTC(c: CivilDate): Date {
  return new Date(Date.UTC(c.y, c.m - 1, c.d, 12));
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
function partsFmt(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    partsCache.set(tz, f);
  }
  return f;
}

/** Civil date (and wall-clock time) of an instant in a given IANA timezone. DST-correct. */
export function wallClock(instant: Date, tz: string) {
  const p: Record<string, string> = {};
  for (const x of partsFmt(tz).formatToParts(instant)) p[x.type] = x.value;
  return {
    date: { y: +p.year, m: +p.month, d: +p.day } as CivilDate,
    h: +p.hour % 24,
    min: +p.minute,
    s: +p.second,
  };
}

export function civilToday(tz: string, now: Date = new Date()): CivilDate {
  return wallClock(now, tz).date;
}

/** UTC offset in minutes of tz at an instant (e.g. Cairo summer = 180). */
export function tzOffsetMin(tz: string, instant: Date): number {
  const w = wallClock(instant, tz);
  const asUTC = Date.UTC(w.date.y, w.date.m - 1, w.date.d, w.h, w.min, w.s);
  return Math.round((asUTC - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

export function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function deviceTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo';
  } catch {
    return 'Africa/Cairo';
  }
}
