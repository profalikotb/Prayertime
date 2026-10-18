import { useCallback, useEffect, useState } from 'react';
import type { CivilDate } from './types';
import { addDays, key } from './civil';

/** Private prayer log — stored only on this device. */
export type LogPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const LOG_PRAYERS: LogPrayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface PrayerLog {
  v: 1;
  days: Record<string, Partial<Record<LogPrayer, 1>>>;
  /** manual count of prayers still to be made up (qada) */
  qada: number;
}

const KEY = 'pakpt.log.v1';

export function loadLog(): PrayerLog {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.v === 1 && p.days) return { v: 1, days: p.days, qada: Number(p.qada) || 0 };
    }
  } catch {
    /* ignore */
  }
  return { v: 1, days: {}, qada: 0 };
}

export function saveLog(l: PrayerLog) {
  try {
    // keep one year of history
    const keys = Object.keys(l.days).sort();
    if (keys.length > 370) for (const k of keys.slice(0, keys.length - 370)) delete l.days[k];
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* ignore */
  }
}

export function toggle(l: PrayerLog, day: CivilDate, p: LogPrayer): PrayerLog {
  const k = key(day);
  const d = { ...(l.days[k] ?? {}) };
  if (d[p]) delete d[p];
  else d[p] = 1;
  const days = { ...l.days, [k]: d };
  if (Object.keys(d).length === 0) delete days[k];
  return { ...l, days };
}

export function done(l: PrayerLog, day: CivilDate, p: LogPrayer): boolean {
  return !!l.days[key(day)]?.[p];
}

export function countDay(l: PrayerLog, day: CivilDate): number {
  return Object.keys(l.days[key(day)] ?? {}).length;
}

export interface LogStats {
  week: { day: CivilDate; n: number }[];
  last30: number; // 0..1
  streak: number; // consecutive complete days ending yesterday (or today if complete)
}

export function stats(l: PrayerLog, today: CivilDate): LogStats {
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return { day: d, n: countDay(l, d) };
  });
  let total = 0;
  let tracked = 0;
  for (let i = 1; i <= 30; i++) {
    const n = countDay(l, addDays(today, -i));
    total += n;
    tracked += 5;
  }
  let streak = countDay(l, today) === 5 ? 1 : 0;
  for (let i = 1; i < 400; i++) {
    if (countDay(l, addDays(today, -i)) === 5) streak++;
    else break;
  }
  return { week, last30: tracked ? total / tracked : 0, streak };
}

/* ---------------- React hook (shared across components via a window event) ---------------- */

const EVT = 'pakpt-log';

export function usePrayerLog(): [PrayerLog, (fn: (l: PrayerLog) => PrayerLog) => void] {
  const [log, setLog] = useState<PrayerLog>({ v: 1, days: {}, qada: 0 });
  useEffect(() => {
    setLog(loadLog());
    const on = () => setLog(loadLog());
    window.addEventListener(EVT, on);
    window.addEventListener('storage', on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener('storage', on);
    };
  }, []);
  const update = useCallback((fn: (l: PrayerLog) => PrayerLog) => {
    const next = fn(loadLog());
    saveLog(next);
    setLog(next);
    window.dispatchEvent(new Event(EVT));
  }, []);
  return [log, update];
}
