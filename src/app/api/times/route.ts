/**
 * Plain JSON prayer times for the desktop alarm helper (and any script):
 *   /api/times?lat=..&lng=..&cc=EG&tz=Africa/Cairo&days=7
 * → { days: [{ date: "2026-11-19", fajr: <epoch ms>, sunrise, dhuhr, asr, maghrib, isha }] }
 * Same engine and conventions as the app and the calendar feed.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { addDays, civilToday, isValidTz, key } from '@/lib/civil';
import { hijriFor } from '@/lib/hijri';
import { autoMethod } from '@/lib/methods';
import { computeDay, profileFor } from '@/lib/prayer';
import type { MethodKey, Place } from '@/lib/types';

export const dynamic = 'force-dynamic';

const num = (v: string | null, lo: number, hi: number) => {
  const n = Number(v);
  return v !== null && Number.isFinite(n) && n >= lo && n <= hi ? n : null;
};

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const lat = num(q.get('lat'), -66, 66) ?? 30.0911;
  const lng = num(q.get('lng'), -180, 180) ?? 31.3225;
  const cc = (q.get('cc') ?? 'EG').toUpperCase().slice(0, 2);
  const tzIn = q.get('tz') ?? 'Africa/Cairo';
  const tz = isValidTz(tzIn) ? tzIn : 'Africa/Cairo';
  const method = (q.get('m') as MethodKey | null) || autoMethod(cc);
  const madhab = q.get('asr') === 'hanafi' ? 'hanafi' : 'shafi';
  const days = num(q.get('days'), 1, 30) ?? 7;
  const place: Place = { lat, lng, cc, tz, city: { ar: '', en: '' }, country: { ar: '', en: '' }, source: 'manual', at: Date.now() };
  const hctx = { profile: profileFor(cc), manualOffset: null };
  const zero = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
  const start = civilToday(tz);
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const t = computeDay(d, place, { method, madhab, adjustments: zero, ramadan: hijriFor(d, hctx).m === 9 });
    out.push({ date: key(d), fajr: +t.fajr, sunrise: +t.sunrise, dhuhr: +t.dhuhr, asr: +t.asr, maghrib: +t.maghrib, isha: +t.isha });
  }
  return NextResponse.json({ lat, lng, tz, method, days: out }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
}
