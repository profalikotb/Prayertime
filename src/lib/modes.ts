/**
 * Context modes that change how alerts behave:
 *  • Surgery: during an «عمليات» entry of جدولي, or a manual "in theatre for N hours" switch,
 *    alerts are silent (notification + vibration only); when it ends, one reminder lists the prayers that fell inside.
 *  • Travel: farther than the qasr distance from every saved home → qasr / jam' guidance.
 */
import type { CivilDate, PrayerTimesDay, Settings } from './types';
import { occursOn, kindOf } from './clinics';

export interface Home {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const DEFAULT_HOMES: Home[] = [
  { id: 'heliopolis', name: 'مصر الجديدة', lat: 30.0911, lng: 31.3225 },
  { id: 'toukh', name: 'طوخ', lat: 30.3539, lng: 31.2014 },
];

/** ≈ 4 burud (16 farsakh): commonly computed as 80–89 km; 83 km is the common modern figure. */
export const DEFAULT_TRAVEL_KM = 83;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface TravelState {
  travelling: boolean;
  nearest: Home | null;
  km: number;
}

export function travelState(pos: { lat: number; lng: number }, homes: Home[], limitKm: number): TravelState {
  if (!homes.length) return { travelling: false, nearest: null, km: 0 };
  let best = homes[0];
  let km = distanceKm(pos, best);
  for (const h of homes.slice(1)) {
    const d = distanceKm(pos, h);
    if (d < km) {
      km = d;
      best = h;
    }
  }
  return { travelling: km >= limitKm, nearest: best, km };
}

export interface SurgeryWindow {
  start: number;
  end: number;
  name: string;
  manual: boolean;
}

function wallToInstant(hhmm: string, dhuhr: Date, dhuhrWallMin: number) {
  const [h, m] = hhmm.split(':').map(Number);
  return dhuhr.getTime() + (h * 60 + m - dhuhrWallMin) * 60000;
}

/** Today's surgery windows (schedule entries of kind «عمليات» + the manual switch). */
export function surgeryWindows(s: Settings, day: CivilDate, t: PrayerTimesDay, dhuhrWallMin: number): SurgeryWindow[] {
  const out: SurgeryWindow[] = [];
  for (const c of s.clinics ?? []) {
    if (kindOf(c).k !== 'surgery' || !occursOn(c, day)) continue;
    let end = wallToInstant(c.end, t.dhuhr, dhuhrWallMin);
    const start = wallToInstant(c.start, t.dhuhr, dhuhrWallMin);
    if (end <= start) end += 86400_000; // list running past midnight
    out.push({ start, end, name: c.name || 'عمليات', manual: false });
  }
  const m = s.surgery;
  if (m && m.until > Date.now() - 6 * 3600_000) out.push({ start: m.from, end: m.until, name: 'عمليات', manual: true });
  return out;
}

export function activeSurgery(windows: SurgeryWindow[], now: number): SurgeryWindow | null {
  return windows.find((w) => now >= w.start && now < w.end) ?? null;
}
