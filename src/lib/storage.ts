import type { Adjustments, Place, Settings } from './types';
import { DEFAULT_CLINICS, LEGACY_SAMPLE_IDS } from './clinics';

const KEY = 'pakpt.settings.v1';
const PLACE_KEY = 'pakpt.place.v1';

const zero = (): Adjustments => ({ fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });

export function defaultSettings(): Settings {
  return {
    v: 1,
    lang: 'ar',
    theme: 'auto',
    timeFormat: '12',
    digits: 'arab',
    locationMode: 'auto',
    manualCityId: null,
    method: 'auto',
    madhab: 'shafi',
    highLat: 'auto',
    customAngles: { fajr: 18, isha: 17, ishaInterval: 0 },
    adjustments: { EG: zero(), SA: zero(), OTHER: zero() },
    hijriCountry: 'auto',
    hijriOffset: { EG: null, SA: null, OTHER: null },
    hijriConfirmedAt: { EG: null, SA: null, OTHER: null },
    clinics: DEFAULT_CLINICS.map((c) => ({ ...c, days: [...c.days] })),
    scheduleClean: true,
    audio: {
      v: 2,
      voice: {
        enabled: true,
        minutes: 5,
        perPrayer: {
          fajr: { on: true, sound: 'builtin' },
          dhuhr: { on: true, sound: 'builtin' },
          asr: { on: true, sound: 'builtin' },
          maghrib: { on: true, sound: 'builtin' },
          isha: { on: true, sound: 'builtin' },
        },
      },
      adhan: { fajr: 'chime', dhuhr: 'chime', asr: 'chime', maghrib: 'chime', isha: 'chime' },
      volume: 1,
    },
    shareFooter: 'أ.د. على قطب على · أستاذ جراحة المخ والأعصاب – جامعة عين شمس',
    notify: {
      enabled: false,
      beforeMin: 10,
      perPrayer: {
        fajr: { before: true, at: true },
        dhuhr: { before: false, at: true },
        asr: { before: false, at: true },
        maghrib: { before: true, at: true },
        isha: { before: false, at: true },
      },
      sound: 'chime',
      vibrate: true,
      ramadan: true,
    },
  };
}

function safeGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode / quota — settings stay in memory for this session */
  }
}

/** Deep-merges stored settings over defaults so new fields added in later versions get defaults. */
function merge<T>(base: T, over: unknown): T {
  if (over === null || typeof over !== 'object' || Array.isArray(over)) return (over === undefined ? base : (over as T)) ?? base;
  if (base === null || typeof base !== 'object') return over as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b !== null && typeof b === 'object' && v !== null && typeof v === 'object' ? merge(b, v) : v;
  }
  return out as T;
}

export function loadSettings(): Settings {
  const raw = safeGet(KEY);
  if (!raw) return defaultSettings();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1) return defaultSettings();
    const st = merge(defaultSettings(), parsed);
    if ((parsed.audio?.v ?? 0) < 2) {
      // 2.1: the built-in 5-minute recording becomes the default voice reminder
      st.audio.voice.enabled = true;
      for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) if (st.audio.voice.perPrayer[k].sound === 'tts') st.audio.voice.perPrayer[k].sound = 'builtin';
      st.audio.v = 2;
      saveSettings(st);
    }
    if (!parsed.audio && parsed.notify?.sound === 'adhan') {
      // carry the old single "Adhan" choice into the new per-prayer selection
      for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) st.audio.adhan[k] = 'legacy';
    }
    if (!parsed.scheduleClean) {
      // one-time upgrade: drop the sample clinics that earlier versions pre-filled
      st.clinics = (Array.isArray(parsed.clinics) ? parsed.clinics : []).filter((c: { id?: string }) => !LEGACY_SAMPLE_IDS.includes(c?.id ?? ''));
      st.scheduleClean = true;
      saveSettings(st);
    }
    return st;
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings) {
  safeSet(KEY, JSON.stringify(s));
}

export function loadPlace(): Place | null {
  const raw = safeGet(PLACE_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Place;
    return typeof p?.lat === 'number' && typeof p?.lng === 'number' && p.tz ? p : null;
  } catch {
    return null;
  }
}

export function savePlace(p: Place) {
  safeSet(PLACE_KEY, JSON.stringify(p));
}

export function resetAll() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(PLACE_KEY);
  } catch {
    /* ignore */
  }
}
