import type { CivilDate, PrayerKey, PrayerTimesDay } from './types';
import { weekday } from './civil';

export type ScheduleKind = 'clinic' | 'surgery' | 'lecture' | 'study' | 'work' | 'other';

export const KINDS: { k: ScheduleKind; ar: string; en: string; emoji: string; color: string }[] = [
  { k: 'clinic', ar: 'عيادة', en: 'Clinic', emoji: '🩺', color: '#0e8a6a' },
  { k: 'surgery', ar: 'عمليات', en: 'Surgery', emoji: '🏥', color: '#c2523b' },
  { k: 'lecture', ar: 'محاضرة', en: 'Lecture', emoji: '🎓', color: '#4b6cb7' },
  { k: 'study', ar: 'دراسة', en: 'Study', emoji: '📚', color: '#8a5cc2' },
  { k: 'work', ar: 'عمل', en: 'Work', emoji: '💼', color: '#c08a1e' },
  { k: 'other', ar: 'أخرى', en: 'Other', emoji: '📌', color: '#5e6b66' },
];

/**
 * One schedule entry — clinic, surgery list, lecture, study session, work, anything.
 *  repeat 'weekly': on `days` (0 = Sunday … 6 = Saturday), optionally only between `from` and `until`
 *  repeat 'once'  : only on `date`
 * Times are local wall-clock "HH:MM".
 */
export interface Clinic {
  id: string;
  name: string;
  kind?: ScheduleKind;
  repeat?: 'weekly' | 'once';
  days: number[];
  date?: string;
  from?: string;
  until?: string;
  start: string;
  end: string;
  /** travel time, minutes — used to compute when you must leave */
  travelMin: number;
  mapUrl: string;
  enabled: boolean;
}

export function newEntry(kind: ScheduleKind = 'clinic', date?: string): Clinic {
  return {
    id: `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    kind,
    repeat: date ? 'once' : 'weekly',
    days: [],
    date,
    start: '09:00',
    end: '12:00',
    travelMin: 30,
    mapUrl: '',
    enabled: true,
  };
}

export function kindOf(c: Clinic) {
  return KINDS.find((k) => k.k === (c.kind ?? 'clinic')) ?? KINDS[0];
}

const iso = (d: CivilDate) => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;

/** Does this entry take place on the given civil day? */
export function occursOn(c: Clinic, day: CivilDate): boolean {
  if (!c.enabled) return false;
  const k = iso(day);
  if ((c.repeat ?? 'weekly') === 'once') return c.date === k;
  if (c.from && k < c.from) return false;
  if (c.until && k > c.until) return false;
  return c.days.includes(weekday(day));
}

/** The schedule starts empty — every entry is added by the user in Settings → جدولي. */
export const DEFAULT_CLINICS: Clinic[] = [];

/** ids of the sample entries shipped in earlier versions — removed once on upgrade */
export const LEGACY_SAMPLE_IDS = ['heliopolis', 'wadi', 'toukh'];

const OBL: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Absolute instant for a wall-clock time on a civil date, anchored on the day's Dhuhr instant
 * (whose local wall time we know from `wallMinutes`) — DST-safe without timezone tables.
 */
function instantAt(hhmm: string, dhuhr: Date, dhuhrWallMin: number): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(dhuhr.getTime() + (h * 60 + m - dhuhrWallMin) * 60000);
}

export type AdviceKind = 'before' | 'during' | 'jumuah';

export interface Advice {
  prayer: PrayerKey;
  at: Date;
  kind: AdviceKind;
}

export interface ClinicPlan {
  clinic: Clinic;
  leaveAt: Date;
  startAt: Date;
  endAt: Date;
  advice: Advice[];
}

/**
 * Today's clinic sessions with prayer guidance:
 *  before  – prayer time falls between now/morning and the moment you must leave → pray before leaving
 *  during  – prayer time falls inside the session → plan a short break
 *  jumuah  – Friday session starting after Dhuhr → Jumuʿa first
 */
export function clinicPlans(day: CivilDate, t: PrayerTimesDay, dhuhrWallMin: number, clinics: Clinic[]): ClinicPlan[] {
  const wd = weekday(day);
  const out: ClinicPlan[] = [];
  for (const c of clinics) {
    if (!occursOn(c, day)) continue;
    const startAt = instantAt(c.start, t.dhuhr, dhuhrWallMin);
    const endAt = instantAt(c.end, t.dhuhr, dhuhrWallMin);
    const leaveAt = new Date(startAt.getTime() - c.travelMin * 60000);
    const advice: Advice[] = [];
    for (const k of OBL) {
      const at = t[k];
      if (wd === 5 && k === 'dhuhr' && at <= leaveAt) {
        advice.push({ prayer: k, at, kind: 'jumuah' });
        continue;
      }
      // prayer due within 3 h before leaving → pray before you go
      if (at <= leaveAt && leaveAt.getTime() - at.getTime() <= 3 * 3600_000) advice.push({ prayer: k, at, kind: 'before' });
      else if (at > leaveAt && at < endAt) advice.push({ prayer: k, at, kind: 'during' });
    }
    out.push({ clinic: c, leaveAt, startAt, endAt, advice });
  }
  return out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
