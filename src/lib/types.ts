/**
 * Domain models. Gregorian civil dates, Hijri dates, prayer times and location
 * are deliberately separate types: a civil date is a calendar label in a given
 * timezone (no instant), a prayer time is an absolute instant (Date), and a
 * Hijri date is a label derived from a civil date + a country convention.
 */

export type Lang = 'ar' | 'en';
export type Bi = { ar: string; en: string };

/** Gregorian civil date (calendar label, no time, no timezone). m = 1..12 */
export interface CivilDate {
  y: number;
  m: number;
  d: number;
}

/** Hijri date label. m = 1..12 */
export interface HijriDate {
  y: number;
  m: number;
  d: number;
}

/**
 * official   – inside a month whose start was announced by the national authority (see data/officialHijri.ts)
 * user       – derived from the user's manual correction
 * calculated – Umm al-Qura astronomical calendar (+ carried-forward official shift), provisional
 */
export type HijriStatus = 'official' | 'user' | 'calculated';

export interface HijriResult extends HijriDate {
  status: HijriStatus;
  sourceUrl?: string;
}

/** Hijri convention profile. Prayer-time adjustments and Hijri offsets are stored per profile. */
export type Profile = 'EG' | 'SA' | 'OTHER';

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const OBLIGATORY: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export type MethodKey =
  | 'Egyptian'
  | 'UmmAlQura'
  | 'MuslimWorldLeague'
  | 'Karachi'
  | 'NorthAmerica'
  | 'Dubai'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Tehran'
  | 'Turkey'
  | 'MoonsightingCommittee';

export interface Place {
  lat: number;
  lng: number;
  city: Bi;
  country: Bi;
  /** ISO 3166-1 alpha-2, upper case; '' if unknown */
  cc: string;
  /** IANA timezone used for all civil-date and display computations */
  tz: string;
  source: 'gps' | 'manual' | 'default';
  /** epoch ms of the fix */
  at: number;
}

export type PrayerTimesDay = Record<PrayerKey, Date>;

export type Adjustments = Record<PrayerKey, number>;

export interface NotifyPrefs {
  enabled: boolean;
  beforeMin: number;
  perPrayer: Record<Exclude<PrayerKey, 'sunrise'>, { before: boolean; at: boolean }>;
  sound: 'chime' | 'adhan' | 'silent';
  vibrate: boolean;
  ramadan: boolean;
}

export interface Settings {
  v: 1;
  lang: Lang;
  theme: 'auto' | 'light' | 'dark';
  timeFormat: '12' | '24';
  digits: 'arab' | 'latn';
  locationMode: 'auto' | 'manual';
  manualCityId: string | null;
  method: 'auto' | MethodKey;
  madhab: 'shafi' | 'hanafi';
  adjustments: Record<Profile, Adjustments>;
  hijriCountry: 'auto' | 'EG' | 'SA';
  /** null = automatic (official table + Umm al-Qura); number = manual day shift applied to Umm al-Qura */
  hijriOffset: Record<Profile, number | null>;
  /** ISO timestamp of when the user confirmed a date via "set confirmed date" */
  hijriConfirmedAt: Record<Profile, string | null>;
  notify: NotifyPrefs;
  clinics: import('./clinics').Clinic[];
  /** footer line printed on shared prayer-time cards */
  shareFooter: string;
}
