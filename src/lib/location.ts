import type { Place } from './types';
import { CITIES, TZ_COUNTRY, cityById, nearestCity, type City } from '../data/cities';
import { deviceTz, isValidTz } from './civil';

export const DEFAULT_CITY = CITIES[0]; // Cairo

export function placeFromCity(c: City, source: Place['source'] = 'manual'): Place {
  return { lat: c.lat, lng: c.lng, city: { ...c.name }, country: { ...c.country }, cc: c.cc, tz: c.tz, source, at: Date.now() };
}

export function manualPlace(id: string | null): Place | null {
  const c = cityById(id);
  return c ? placeFromCity(c, 'manual') : null;
}

/**
 * Approximate place without any network call or permission: the device timezone → the bundled
 * city in that timezone (or the country's main city). Clearly labelled «approximate» in the UI.
 */
export function approxPlace(): Place | null {
  const tz = deviceTz();
  if (!isValidTz(tz)) return null;
  const c = CITIES.find((x) => x.tz === tz) ?? CITIES.find((x) => x.cc === TZ_COUNTRY[tz]);
  return c ? { ...placeFromCity(c, 'approx'), tz } : null;
}

const DENIED_KEY = 'pakpt.geoDenied';
/** Remember a denial so the app never re-prompts on its own; only the user's ↻ tap asks again. */
export function geoDeniedBefore(): boolean {
  try {
    return localStorage.getItem(DENIED_KEY) === '1';
  } catch {
    return false;
  }
}
export function setGeoDenied(v: boolean) {
  try {
    if (v) localStorage.setItem(DENIED_KEY, '1');
    else localStorage.removeItem(DENIED_KEY);
  } catch {
    /* ignore */
  }
}

export type GpsError = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export function getPosition(timeoutMs = 12000): Promise<{ lat: number; lng: number; acc: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return reject('unsupported' as GpsError);
    let done = false;
    const guard = setTimeout(() => {
      if (!done) {
        done = true;
        reject('timeout' as GpsError);
      }
    }, timeoutMs + 1500);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (done) return;
        done = true;
        clearTimeout(guard);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy });
      },
      (e) => {
        if (done) return;
        done = true;
        clearTimeout(guard);
        reject((e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable') as GpsError);
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: timeoutMs },
    );
  });
}

/** 'granted' | 'denied' | 'prompt' | 'unknown' — used to avoid surprise permission prompts on foreground refresh. */
export async function geoPermission(): Promise<string> {
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    return p?.state ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

interface RevGeo {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryCode?: string;
  countryName?: string;
}

async function reverse(lat: number, lng: number, lang: 'ar' | 'en', signal: AbortSignal): Promise<RevGeo> {
  const u = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${lang}`;
  const r = await fetch(u, { signal, cache: 'no-store' });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/**
 * Builds a Place from coordinates. Layers:
 *  1. Online reverse geocoding (free, key-less, client-side) for city + country names in both languages.
 *  2. Offline nearest bundled city (≤ 40 km uses its name; ≤ 400 km uses its country).
 *  3. Device timezone → country.
 * Timezone = device timezone (the phone auto-updates it when travelling).
 */
export async function placeFromCoords(lat: number, lng: number): Promise<Place> {
  const tz = deviceTz();
  const near = nearestCity(lat, lng);
  const base: Place = {
    lat,
    lng,
    tz: isValidTz(tz) ? tz : near.city.tz,
    city: near.km <= 40 ? { ...near.city.name } : { ar: `${lat.toFixed(3)}°، ${lng.toFixed(3)}°`, en: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°` },
    country: near.km <= 400 ? { ...near.city.country } : { ar: '', en: '' },
    cc: near.km <= 400 ? near.city.cc : TZ_COUNTRY[tz] ?? '',
    source: 'gps',
    at: Date.now(),
  };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const [ar, en] = await Promise.all([reverse(lat, lng, 'ar', ctl.signal), reverse(lat, lng, 'en', ctl.signal)]);
    const cityAr = ar.city || ar.locality || ar.principalSubdivision;
    const cityEn = en.city || en.locality || en.principalSubdivision;
    if (cityAr || cityEn) base.city = { ar: cityAr || cityEn || base.city.ar, en: cityEn || cityAr || base.city.en };
    if (en.countryCode) {
      base.cc = en.countryCode.toUpperCase();
      base.country = { ar: ar.countryName || en.countryName || '', en: en.countryName || '' };
    }
  } catch {
    /* offline or blocked — keep offline inference */
  } finally {
    clearTimeout(t);
  }
  if (!base.cc) base.cc = TZ_COUNTRY[tz] ?? '';
  return base;
}

/** Significant move → recompute (prayer times shift ~1 min per ~15–25 km). */
export function movedEnough(a: Place, b: Place): boolean {
  return Math.abs(a.lat - b.lat) > 0.05 || Math.abs(a.lng - b.lng) > 0.05 || a.cc !== b.cc || a.tz !== b.tz;
}

/** Location precision shown next to the city name. */
export function precisionLabel(p: Place, lang: 'ar' | 'en'): { text: string; tone: 'ok' | 'warn' | 'info' } {
  if (p.source === 'gps') return { text: lang === 'ar' ? 'دقيق' : 'precise', tone: 'ok' };
  if (p.source === 'manual') return { text: lang === 'ar' ? 'يدوي' : 'manual', tone: 'info' };
  if (p.source === 'approx') return { text: lang === 'ar' ? 'تقريبي' : 'approximate', tone: 'warn' };
  return { text: lang === 'ar' ? 'افتراضي' : 'default', tone: 'warn' };
}
