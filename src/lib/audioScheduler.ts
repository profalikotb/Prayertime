'use client';
/**
 * Foreground alert engine (web / PWA).
 *
 *  T − N min  → your voice reminder (recording, or device TTS) + notification
 *  T          → the Adhan chosen for that prayer + notification (prayer · city · time)
 *
 * Browsers cannot wake a closed page, so this runs only while the app is open (iOS included).
 * The Android app schedules the same sequence natively with AlarmManager.
 * De-duplication: an id per (day, prayer, kind) is remembered in localStorage, so a reload,
 * a second tab or a clock resync never repeats an alert.
 */
import { useEffect, useRef } from 'react';
import type { HijriResult, Place, PrayerTimesDay, Settings } from './types';
import { PRAYER_NAMES } from './i18n';
import { show } from './notify';
import { FIVE, playSound, reminderText } from './audio';
import { parseKey, weekday } from './civil';

const KEY = 'pakpt.fired.v1';
const WINDOW = 90_000; // an alert fires if the app is open within 90 s after its moment

function loadFired(day: string): Set<string> {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return new Set(o.day === day ? o.ids : []);
  } catch {
    return new Set();
  }
}
function saveFired(day: string, ids: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day, ids: [...ids] }));
  } catch {
    /* ignore */
  }
}

export function useAudioScheduler(now: Date, s: Settings | null, times: { today: PrayerTimesDay } | null, dayKey: string, hijri: HijriResult, place: Place | null, fmtTime: (d: Date) => string) {
  const fired = useRef<{ day: string; ids: Set<string> }>({ day: '', ids: new Set() });

  useEffect(() => {
    if (!s?.notify.enabled || !times || !place) return;
    if (fired.current.day !== dayKey) fired.current = { day: dayKey, ids: loadFired(dayKey) };
    const ids = fired.current.ids;
    const n = s.notify;
    const a = s.audio;
    const names = PRAYER_NAMES[s.lang];
    const namesAr = PRAYER_NAMES.ar;
    const namesEn = PRAYER_NAMES.en;
    const tNow = now.getTime();
    const city = place.city[s.lang];
    const friday = weekday(parseKey(dayKey)) === 5;

    const due = (id: string, at: number) => {
      if (ids.has(id) || tNow < at || tNow - at >= WINDOW) return false;
      ids.add(id);
      saveFired(dayKey, ids);
      return true;
    };

    for (const k of FIVE) {
      const at = times.today[k].getTime();
      const label = k === 'dhuhr' && friday ? (s.lang === 'ar' ? 'الجمعة' : 'Jumuʿa') : names[k];
      const v = a.voice.perPrayer[k];
      const voiceOn = a.voice.enabled && v.on;

      // 1) personal voice reminder N minutes before
      if (voiceOn && due(`${k}-v`, at - a.voice.minutes * 60000)) {
        const text = reminderText(namesAr[k], namesEn[k], a.voice.minutes, s.lang);
        void show(label, text, n.vibrate);
        void playSound(v.sound, { volume: a.volume, tts: text, lang: s.lang, tag: `${k}-v` });
      }
      // 2) the generic "before" chime — skipped when the voice reminder already covers this prayer
      if (!voiceOn && n.perPrayer[k].before && n.beforeMin > 0 && due(`${k}-b`, at - n.beforeMin * 60000)) {
        void show(label, s.lang === 'ar' ? `بعد ${n.beforeMin} دقيقة` : `In ${n.beforeMin} minutes`, n.vibrate);
        if (n.sound !== 'silent') void playSound('chime', { volume: a.volume });
      }
      // 3) the Adhan at the exact time
      if (n.perPrayer[k].at && due(`${k}-a`, at)) {
        const body = s.lang === 'ar' ? `حان الآن وقت صلاة ${label} · ${city} · ${fmtTime(times.today[k])}` : `Time for ${label} · ${city} · ${fmtTime(times.today[k])}`;
        void show(label, body, n.vibrate);
        void playSound(n.sound === 'silent' ? 'silent' : a.adhan[k], { volume: a.volume, tag: `${k}-a` });
      }
    }
    if (n.ramadan && hijri.m === 9 && due('suhoor', times.today.fajr.getTime() - 30 * 60000)) {
      void show(s.lang === 'ar' ? 'السحور' : 'Suhoor', s.lang === 'ar' ? 'بقي ٣٠ دقيقة على الفجر' : '30 minutes until Fajr', n.vibrate);
      if (n.sound !== 'silent') void playSound('chime', { volume: a.volume });
    }
  }, [now, s, times, dayKey, hijri.m, place, fmtTime]);
}
