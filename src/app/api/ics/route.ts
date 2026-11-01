/**
 * Live calendar subscription: webcal://<host>/api/ics?lat=..&lng=..&cc=EG&tz=Africa/Cairo&city=..&lang=ar
 * The phone's / computer's Calendar app re-downloads this feed by itself, so prayer alarms
 * (5 min before + at the Adhan) keep coming for months with the app CLOSED — no reinstall, no re-export.
 * Same engine and conventions as the app (Egyptian / Umm al-Qura, Ramadan Isha, Hijri official dates).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { buildIcs } from '@/lib/ics';
import { civilToday, isValidTz } from '@/lib/civil';
import { hijriFor } from '@/lib/hijri';
import { autoMethod } from '@/lib/methods';
import { profileFor, type PrayerOptions } from '@/lib/prayer';
import type { CivilDate, MethodKey, NotifyPrefs, Place } from '@/lib/types';

export const dynamic = 'force-dynamic';

const num = (v: string | null, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
};

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const lat = num(q.get('lat'), -66, 66) ?? 30.0444;
  const lng = num(q.get('lng'), -180, 180) ?? 31.2357;
  const cc = (q.get('cc') ?? 'EG').toUpperCase().slice(0, 2);
  const tzIn = q.get('tz') ?? 'Africa/Cairo';
  const tz = isValidTz(tzIn) ? tzIn : 'Africa/Cairo';
  const lang = q.get('lang') === 'en' ? 'en' : 'ar';
  const city = (q.get('city') ?? (lang === 'ar' ? 'القاهرة' : 'Cairo')).slice(0, 40);
  const method = (q.get('m') as MethodKey | null) || autoMethod(cc);
  const madhab = q.get('asr') === 'hanafi' ? 'hanafi' : 'shafi';
  const before = num(q.get('before'), 0, 30) ?? 5;
  const days = num(q.get('days'), 7, 90) ?? 60;

  const place: Place = { lat, lng, cc, tz, city: { ar: city, en: city }, country: { ar: '', en: '' }, source: 'manual', at: Date.now() };
  const p = profileFor(cc);
  const hctx = { profile: p, manualOffset: null };
  const zero = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
  const opts = (d: CivilDate): PrayerOptions => ({ method, madhab, adjustments: zero, ramadan: hijriFor(d, hctx).m === 9 });
  const all = { before: before > 0, at: true };
  const notify: NotifyPrefs = {
    enabled: true,
    beforeMin: before,
    perPrayer: { fajr: all, dhuhr: all, asr: all, maghrib: all, isha: all },
    sound: 'chime',
    vibrate: true,
    ramadan: false,
  };
  const body = buildIcs(civilToday(tz), days, place, opts, notify, lang, true);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="prayer-times.ics"',
      'Cache-Control': 'public, max-age=21600, s-maxage=21600',
    },
  });
}
