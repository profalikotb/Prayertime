import type { CivilDate, PrayerKey, PrayerTimesDay } from './types';
import { weekday } from './civil';

/** A recurring clinic session. days: 0 = Sunday … 6 = Saturday. Times are local wall-clock "HH:MM". */
export interface Clinic {
  id: string;
  name: string;
  days: number[];
  start: string;
  end: string;
  /** travel time from home, minutes — used to compute when you must leave */
  travelMin: number;
  mapUrl: string;
  enabled: boolean;
}

/** Defaults — the hours are placeholders; edit them in Settings → العيادات. */
export const DEFAULT_CLINICS: Clinic[] = [
  {
    id: 'heliopolis',
    name: 'عيادة مصر الجديدة',
    days: [6, 0, 2],
    start: '19:00',
    end: '22:00',
    travelMin: 30,
    mapUrl: 'https://maps.app.goo.gl/kneM2xHcoW8rMNJ5A',
    enabled: true,
  },
  {
    id: 'wadi',
    name: 'مستشفى وادي النيل',
    days: [1],
    start: '10:00',
    end: '13:00',
    travelMin: 30,
    mapUrl: 'https://maps.app.goo.gl/HtfDCkk2QfTLGgNU7',
    enabled: true,
  },
  {
    id: 'toukh',
    name: 'عيادة طوخ',
    days: [5],
    start: '14:00',
    end: '18:00',
    travelMin: 45,
    mapUrl: 'https://maps.app.goo.gl/UGxQ1xMsdCmEj2oS7',
    enabled: true,
  },
];

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
    if (!c.enabled || !c.days.includes(wd)) continue;
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
