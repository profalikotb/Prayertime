import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes, Rounding } from 'adhan';
import type { Adjustments, CivilDate, MethodKey, Place, PrayerKey, PrayerTimesDay, Profile, Settings } from './types';
import { OBLIGATORY, PRAYER_KEYS } from './types';
import { addDays } from './civil';
import { autoMethod } from './methods';

export function profileFor(cc: string): Profile {
  const u = cc.toUpperCase();
  return u === 'EG' ? 'EG' : u === 'SA' ? 'SA' : 'OTHER';
}

export function effectiveMethod(settings: Settings, place: Place): MethodKey {
  return settings.method === 'auto' ? autoMethod(place.cc) : settings.method;
}

export interface PrayerOptions {
  method: MethodKey;
  madhab: 'shafi' | 'hanafi';
  adjustments: Adjustments;
  /** true when the Hijri month is Ramadan (Umm al-Qura Isha = 120 min) */
  ramadan: boolean;
}

/**
 * Astronomical prayer times for a civil date at a location.
 * Returns absolute instants; format them with place.tz.
 */
export function computeDay(date: CivilDate, place: Pick<Place, 'lat' | 'lng'>, o: PrayerOptions): PrayerTimesDay {
  const coords = new Coordinates(place.lat, place.lng);
  const p = CalculationMethod[o.method]();
  // Egyptian Survey published schedules use true Dhuhr (no +1 min safety margin).
  // Verified against the published Cairo schedule for 11/10/2026 (all six times match).
  if (o.method === 'Egyptian') p.methodAdjustments = { ...p.methodAdjustments, dhuhr: 0 };
  if (o.method === 'UmmAlQura' && o.ramadan) p.ishaInterval = 120;
  p.madhab = o.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  p.highLatitudeRule = HighLatitudeRule.recommended(coords);
  // Rounded manually below: prayers → nearest minute, sunrise → floor (matches published Egyptian schedules)
  p.rounding = Rounding.None;
  p.adjustments = { ...o.adjustments };
  // adhan reads the date's local Y/M/D components, so build it from the civil date directly
  const pt = new PrayerTimes(coords, new Date(date.y, date.m - 1, date.d, 12), p);
  const M = 60_000;
  const near = (d: Date) => new Date(Math.round(d.getTime() / M) * M);
  const floor = (d: Date) => new Date(Math.floor(d.getTime() / M) * M);
  return {
    fajr: near(pt.fajr),
    sunrise: floor(pt.sunrise), // end of Fajr: the earlier minute is the safe one
    dhuhr: near(pt.dhuhr),
    asr: near(pt.asr),
    maghrib: near(pt.maghrib),
    isha: near(pt.isha),
  };
}

export interface PrayerState {
  /** next event (sunrise included, so the countdown never jumps over it) */
  next: { key: PrayerKey; at: Date; tomorrow: boolean };
  /** most recent obligatory-or-sunrise event before now */
  prev: { key: PrayerKey; at: Date };
  /** prayer whose time is current (for highlighting); null between sunrise and dhuhr */
  current: PrayerKey | null;
}

export function prayerState(now: Date, today: PrayerTimesDay, yesterday: PrayerTimesDay, tomorrow: PrayerTimesDay): PrayerState {
  const t = now.getTime();
  let next: PrayerState['next'] | null = null;
  for (const k of PRAYER_KEYS) {
    if (today[k].getTime() > t) {
      next = { key: k, at: today[k], tomorrow: false };
      break;
    }
  }
  if (!next) next = { key: 'fajr', at: tomorrow.fajr, tomorrow: true };

  let prev: PrayerState['prev'] = { key: 'isha', at: yesterday.isha };
  for (const k of PRAYER_KEYS) if (today[k].getTime() <= t) prev = { key: k, at: today[k] };

  let current: PrayerKey | null = prev.key;
  if (prev.key === 'sunrise') current = null;
  return { next, prev, current };
}

export function isObligatory(k: PrayerKey): boolean {
  return OBLIGATORY.includes(k);
}

export function threeDays(date: CivilDate, place: Pick<Place, 'lat' | 'lng'>, o: (d: CivilDate) => PrayerOptions) {
  const y = addDays(date, -1);
  const t = addDays(date, 1);
  return { yesterday: computeDay(y, place, o(y)), today: computeDay(date, place, o(date)), tomorrow: computeDay(t, place, o(t)) };
}
