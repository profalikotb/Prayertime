'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CivilDate, Place, Settings } from '@/lib/types';
import { addDays, civilToday, key } from '@/lib/civil';
import { hijriFor, type HijriContext } from '@/lib/hijri';
import { computeDay, effectiveMethod, prayerState, profileFor, type PrayerOptions } from '@/lib/prayer';
import { DICT } from '@/lib/i18n';
import { makeFmt } from '@/lib/format';
import { loadPlace, loadSettings, savePlace, saveSettings } from '@/lib/storage';
import { DEFAULT_CITY, approxPlace, geoDeniedBefore, geoPermission, getPosition, manualPlace, movedEnough, placeFromCity, placeFromCoords, setGeoDenied } from '@/lib/location';
import { unlockAudio } from '@/lib/notify';
import { Ctx, type AppState, type LocStatus, type Tab } from './ctx';
import { Icon } from './ui';
import Today from './Today';
import CalendarView from './CalendarView';
import QiblaView from './QiblaView';
import SettingsView from './SettingsView';
import QuranView from './QuranView';
import IslamicToday from './IslamicToday';
import { useAudioScheduler } from '@/lib/audioScheduler';

const LOCATION_TTL = 30 * 60 * 1000;

export default function App() {
  const [ready, setReady] = useState(false);
  const [s, setS] = useState<Settings | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>('idle');
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<Tab>('today');
  const [online, setOnline] = useState(true);
  const locBusy = useRef(false);

  /* ---------- boot: settings + last known place (synchronous, never blocks) ---------- */
  useEffect(() => {
    const st = loadSettings();
    setS(st);
    const p = st.locationMode === 'manual' ? manualPlace(st.manualCityId) : null;
    // order: manual → saved fix → timezone-approximate → Cairo
    setPlace(p ?? loadPlace() ?? approxPlace() ?? placeFromCity(DEFAULT_CITY, 'default'));
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    setReady(true);
  }, []);

  const set = useCallback((fn: (s: Settings) => Settings) => {
    setS((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveSettings(next);
      return next;
    });
  }, []);

  /* ---------- location ---------- */
  const refreshLocation = useCallback(async (prompt: boolean) => {
    if (locBusy.current) return;
    const perm = await geoPermission();
    if (perm === 'denied') {
      setGeoDenied(true);
      setLocStatus('denied');
      return; // the browser will not show a prompt anyway — never loop on a denied permission
    }
    if (!prompt && perm !== 'granted') return; // never surprise the user with a prompt on resume
    locBusy.current = true;
    setLocStatus('locating');
    try {
      const pos = await getPosition();
      const p = await placeFromCoords(pos.lat, pos.lng);
      setPlace((prev) => (prev && !movedEnough(prev, p) && prev.source === 'gps' && prev.city.ar === p.city.ar ? { ...prev, at: p.at } : p));
      savePlace(p);
      setGeoDenied(false);
      setLocStatus('ok');
    } catch (e) {
      if (e === 'denied') setGeoDenied(true);
      setLocStatus(e === 'denied' ? 'denied' : 'failed');
    } finally {
      locBusy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!ready || !s) return;
    if (s.locationMode === 'manual') {
      const p = manualPlace(s.manualCityId);
      if (p) setPlace(p);
      return;
    }
    const cached = loadPlace();
    // ask once; after a denial only the user's own tap asks again
    if (!cached || cached.source !== 'gps' || Date.now() - cached.at > LOCATION_TTL) void refreshLocation(!geoDeniedBefore());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, s?.locationMode, s?.manualCityId]);

  /* ---------- clock: aligned 1 s tick, resync on foreground ---------- */
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const loop = () => {
      setNow(new Date());
      id = setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
    };
    loop();
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
        if (s?.locationMode === 'auto') {
          const c = loadPlace();
          if (!c || Date.now() - c.at > LOCATION_TTL) void refreshLocation(false);
        }
      }
    };
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('pageshow', onVis);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('pageshow', onVis);
    };
  }, [refreshLocation, s?.locationMode]);

  /* ---------- deep links (#qibla, #islamic, #settings …) — used by the Android widget shortcuts ---------- */
  useEffect(() => {
    const read = () => {
      const h = location.hash.replace('#', '') as Tab;
      if (['today', 'calendar', 'quran', 'qibla', 'settings', 'islamic'].includes(h)) setTab(h);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  /* ---------- service worker ---------- */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  }, []);

  /* ---------- unlock audio on first interaction (iOS) ---------- */
  useEffect(() => {
    const u = () => unlockAudio();
    window.addEventListener('pointerdown', u, { once: true });
    return () => window.removeEventListener('pointerdown', u);
  }, []);

  /* ---------- derived state ---------- */
  const tz = place?.tz ?? 'Africa/Cairo';
  const today = useMemo(() => civilToday(tz, now), [tz, now]);
  const dayKey = key(today);

  const profile = useMemo(() => {
    if (!s || !place) return 'EG' as const;
    if (s.hijriCountry !== 'auto') return s.hijriCountry;
    return profileFor(place.cc);
  }, [s, place]);
  const prayerProfile = place ? profileFor(place.cc) : 'EG';

  const hctx: HijriContext = useMemo(() => ({ profile, manualOffset: s ? s.hijriOffset[profile] : null }), [profile, s]);

  const method = s && place ? effectiveMethod(s, place) : 'Egyptian';

  const opts = useCallback(
    (d: CivilDate): PrayerOptions => ({
      method,
      madhab: s?.madhab ?? 'shafi',
      adjustments: s?.adjustments[prayerProfile] ?? { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      ramadan: hijriFor(d, hctx).m === 9,
      highLat: s?.highLat ?? 'auto',
      custom: s?.customAngles,
    }),
    [method, s, prayerProfile, hctx],
  );

  const times = useMemo(() => {
    if (!place) return null;
    const y = addDays(today, -1);
    const tm = addDays(today, 1);
    return { yesterday: computeDay(y, place, opts(y)), today: computeDay(today, place, opts(today)), tomorrow: computeDay(tm, place, opts(tm)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, place?.lat, place?.lng, place?.tz, opts]);

  const hijri = useMemo(() => hijriFor(today, hctx), [dayKey, hctx]); // eslint-disable-line react-hooks/exhaustive-deps
  const ps = times ? prayerState(now, times.today, times.yesterday, times.tomorrow) : null;

  /* ---------- theme & direction ---------- */
  useEffect(() => {
    if (!s) return;
    const d = document.documentElement;
    d.lang = s.lang;
    d.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    // "Auto" is sun-aware: night palette from Maghrib until Sunrise at the current location
    let theme: 'light' | 'dark';
    if (s.theme !== 'auto') theme = s.theme;
    else if (times) {
      const t = now.getTime();
      theme = t >= times.today.maghrib.getTime() || t < times.today.sunrise.getTime() ? 'dark' : 'light';
    } else theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (d.dataset.theme !== theme) d.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]:not([media])') ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
    meta.setAttribute('content', theme === 'dark' ? '#07141a' : '#0b3b33');
    document.title = s.lang === 'ar' ? 'مواقيت الصلاة – أ.د. على قطب' : 'Prof Ali Kotb Prayer Time';
  }, [s, times, now]);

  /* ---------- foreground alerts: voice reminder → Adhan (see lib/audioScheduler) ---------- */
  const fmtTime = useMemo(() => (s && place ? makeFmt(s, place.tz).time : (d: Date) => d.toISOString()), [s, place]);
  useAudioScheduler(now, s, times, dayKey, hijri, place, fmtTime);

  if (!ready || !s || !place || !times || !ps) return <Splash />;

  const t = DICT[s.lang];
  const f = makeFmt(s, place.tz);
  const value: AppState = {
    s,
    set,
    t,
    f,
    place,
    locStatus,
    refreshLocation: (p) => void refreshLocation(p),
    now,
    today,
    profile,
    hctx,
    hijri,
    method,
    times,
    ps,
    opts,
    online,
    go: setTab,
  };

  const tabs: { k: Tab; l: string; i: Parameters<typeof Icon>[0]['name'] }[] = [
    { k: 'today', l: t.tabToday, i: 'today' },
    { k: 'calendar', l: t.tabCalendar, i: 'calendar' },
    { k: 'quran', l: s.lang === 'ar' ? 'القرآن' : 'Qurʾan', i: 'book' },
    { k: 'qibla', l: t.tabQibla, i: 'compass' },
    { k: 'settings', l: t.tabSettings, i: 'gear' },
  ];

  return (
    <Ctx.Provider value={value}>
      <div className="pattern min-h-[100dvh]">
        <main className="mx-auto w-full max-w-6xl px-3 pb-28 sm:px-5 lg:pb-10">
          {tab === 'today' && <Today />}
          {tab === 'calendar' && <CalendarView />}
          {tab === 'quran' && <QuranView />}
          {tab === 'qibla' && <QiblaView />}
          {tab === 'settings' && <SettingsView />}
          {tab === 'islamic' && <IslamicToday />}
        </main>
        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line/10 bg-surface/85 backdrop-blur-xl lg:static lg:mx-auto lg:mb-6 lg:max-w-md lg:rounded-2xl lg:border"
          aria-label="Tabs"
        >
          <ul className="mx-auto flex max-w-md">
            {tabs.map((x) => (
              <li key={x.k} className="flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab(x.k);
                    window.scrollTo({ top: 0 });
                  }}
                  aria-current={tab === x.k ? 'page' : undefined}
                  className={`flex w-full flex-col items-center gap-0.5 pb-1 pt-2 text-[11px] font-bold transition-colors ${tab === x.k ? 'text-emerald' : 'text-muted'}`}
                >
                  <Icon name={x.i} className="h-6 w-6" />
                  {x.l}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Ctx.Provider>
  );
}

function Splash() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#0b3b33]">
      <div className="text-center text-[#e8c77a]">
        <svg viewBox="0 0 120 120" className="mx-auto h-20 w-20 animate-pulse" aria-hidden="true">
          <mask id="sm">
            <rect width="120" height="120" fill="#fff" />
            <circle cx="74" cy="48" r="38" fill="#000" />
          </mask>
          <circle cx="58" cy="60" r="44" fill="currentColor" mask="url(#sm)" />
        </svg>
        <p className="mt-3 font-display text-xl">مواقيت الصلاة</p>
      </div>
    </div>
  );
}
