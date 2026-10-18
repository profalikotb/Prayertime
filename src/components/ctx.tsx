'use client';
import { createContext, useContext } from 'react';
import type { CivilDate, HijriResult, Place, PrayerTimesDay, Profile, Settings, MethodKey } from '@/lib/types';
import type { Fmt } from '@/lib/format';
import type { HijriContext } from '@/lib/hijri';
import type { PrayerState, PrayerOptions } from '@/lib/prayer';
import type { T } from '@/lib/i18n';

export type LocStatus = 'idle' | 'locating' | 'denied' | 'failed' | 'ok';

export interface AppState {
  s: Settings;
  set: (fn: (s: Settings) => Settings) => void;
  t: T;
  f: Fmt;
  place: Place;
  locStatus: LocStatus;
  refreshLocation: (prompt: boolean) => void;
  now: Date;
  today: CivilDate;
  profile: Profile;
  hctx: HijriContext;
  hijri: HijriResult;
  method: MethodKey;
  times: { yesterday: PrayerTimesDay; today: PrayerTimesDay; tomorrow: PrayerTimesDay };
  ps: PrayerState;
  opts: (d: CivilDate) => PrayerOptions;
  online: boolean;
  go: (tab: Tab) => void;
}

export type Tab = 'today' | 'calendar' | 'qibla' | 'settings';

export const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}
