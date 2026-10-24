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
  | 'MoonsightingCommittee'
  | 'FCNA'
  | 'UOIF'
  | 'Custom';

/** Twilight rule used when Fajr/Isha angles are unreachable or extreme (high latitudes). auto = adhan's recommendation (1/7 night above 48°, else middle of night) */
export type HighLat = 'auto' | 'middle' | 'seventh' | 'twilight';

export interface CustomAngles {
  fajr: number;
  isha: number;
  /** minutes after Maghrib; 0 = use the Isha angle */
  ishaInterval: number;
}

export interface Place {
  lat: number;
  lng: number;
  city: Bi;
  country: Bi;
  /** ISO 3166-1 alpha-2, upper case; '' if unknown */
  cc: string;
  /** IANA timezone used for all civil-date and display computations */
  tz: string;
  /** gps = device fix (precise) · approx = inferred from the device timezone · manual · default (Cairo) */
  source: 'gps' | 'approx' | 'manual' | 'default';
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

export type FivePrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/**
 * Personal audio. Sound ids: 'chime' (built-in synthesized bell) · 'silent' · 'legacy' (/public/adhan.mp3)
 * · 'clip:<id>' (a recording saved on this device, IndexedDB) · 'tts' (system speech, voice reminder only)
 * · 'builtin' (/audio/reminder-5min.mp3 — «باقي خمس دقائق…», used when the reminder is 5 min before).
 */
export interface AudioPrefs {
  voice: {
    enabled: boolean;
    /** minutes before the Adhan */
    minutes: number;
    perPrayer: Record<FivePrayer, { on: boolean; sound: string }>;
  };
  adhan: Record<FivePrayer, string>;
  /** 0–1 (iOS ignores page volume — use the hardware buttons) */
  volume: number;
  /** settings version (2 = built-in 5-minute reminder recording is the default) */
  v?: number;
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
  highLat: HighLat;
  customAngles: CustomAngles;
  adjustments: Record<Profile, Adjustments>;
  hijriCountry: 'auto' | 'EG' | 'SA';
  /** null = automatic (official table + Umm al-Qura); number = manual day shift applied to Umm al-Qura */
  hijriOffset: Record<Profile, number | null>;
  /** ISO timestamp of when the user confirmed a date via "set confirmed date" */
  hijriConfirmedAt: Record<Profile, string | null>;
  notify: NotifyPrefs;
  audio: AudioPrefs;
  clinics: import('./clinics').Clinic[];
  /** set once the legacy sample clinics have been removed */
  scheduleClean?: boolean;
  /** footer line printed on shared prayer-time cards */
  shareFooter: string;
}
