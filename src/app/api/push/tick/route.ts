/**
 * Called every minute by the n8n workflow «Prayer Push» with all stored subscriptions.
 * For each subscriber computes today's times (same engine as the app) and sends a Web Push for any
 * reminder (T − lead) or Adhan (T) that falls in the last minute. Works with the app CLOSED, incl. iPhone
 * (home-screen app, iOS 16.4+). Returns the endpoints that no longer exist so n8n can drop them.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createECDH } from 'node:crypto';
import webpush from 'web-push';
import { VAPID_PUBLIC } from '@/lib/pushKey';
import { civilToday, isValidTz, weekday } from '@/lib/civil';
import { hijriFor } from '@/lib/hijri';
import { autoMethod } from '@/lib/methods';
import { computeDay, profileFor } from '@/lib/prayer';
import type { MethodKey } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Five = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
const FIVE: Five[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const AR: Record<Five, string> = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const EN: Record<Five, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
const MIN_AR: Record<number, string> = { 5: 'خمس دقائق', 10: 'عشر دقائق', 15: 'خمس عشرة دقيقة', 20: 'عشرون دقيقة', 25: 'خمس وعشرون دقيقة' };

interface Sub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  lat: number;
  lng: number;
  tz: string;
  cc: string;
  method?: MethodKey;
  asr?: 'shafi' | 'hanafi';
  lead?: number;
  voice?: boolean;
  adhan?: boolean;
  prayers?: Five[];
  lang?: 'ar' | 'en';
  city?: string;
  /** epoch ms until which alerts are silent (surgery mode) */
  silentUntil?: number;
}

export async function POST(req: NextRequest) {
  // Two ways to authorise (no Vercel setup needed for the second):
  //  1) env PUSH_SECRET + VAPID_PRIVATE_KEY on Vercel, n8n sends x-push-secret
  //  2) n8n sends the VAPID private key itself (x-vapid-private); accepted only if it derives the public key
  const pub = process.env.VAPID_PUBLIC_KEY || VAPID_PUBLIC;
  const envOk = !!process.env.PUSH_SECRET && req.headers.get('x-push-secret') === process.env.PUSH_SECRET && !!process.env.VAPID_PRIVATE_KEY;
  const hdr = req.headers.get('x-vapid-private') ?? '';
  const priv = envOk ? process.env.VAPID_PRIVATE_KEY! : matches(hdr, pub) ? hdr : '';
  if (!priv) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  webpush.setVapidDetails('mailto:prayer-times@prayertimealikotb.vercel.app', pub, priv);

  const body = await req.json().catch(() => ({}));
  const subs: Sub[] = Array.isArray(body?.subs) ? body.subs : [];
  const now = Date.now();
  const from = now - 60_000; // window (now − 60 s, now] — n8n ticks every minute
  const expired: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      if (!s?.endpoint || !s.keys || typeof s.lat !== 'number' || typeof s.lng !== 'number') return;
      const tz = isValidTz(s.tz) ? s.tz : 'Africa/Cairo';
      const cc = (s.cc || 'EG').toUpperCase();
      const day = civilToday(tz, new Date(now));
      const hctx = { profile: profileFor(cc), manualOffset: null };
      const t = computeDay(day, { lat: s.lat, lng: s.lng }, {
        method: s.method || autoMethod(cc),
        madhab: s.asr === 'hanafi' ? 'hanafi' : 'shafi',
        adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        ramadan: hijriFor(day, hctx).m === 9,
      });
      const lead = [5, 10, 15, 20, 25].includes(s.lead ?? 15) ? (s.lead ?? 15) : 15;
      const ar = s.lang !== 'en';
      const fri = weekday(day) === 5;
      const silent = (s.silentUntil ?? 0) > now;
      const msgs: { title: string; body: string; tag: string }[] = [];
      for (const k of s.prayers?.length ? s.prayers : FIVE) {
        const at = t[k].getTime();
        const name = k === 'dhuhr' && fri ? (ar ? 'الجمعة' : 'Jumuʿa') : ar ? AR[k] : EN[k];
        if (s.voice !== false && at - lead * 60_000 > from && at - lead * 60_000 <= now) {
          msgs.push({
            title: ar ? `⏳ ${name} بعد ${lead} ${lead <= 10 ? 'دقائق' : 'دقيقة'}` : `⏳ ${name} in ${lead} min`,
            body: ar ? `باقي ${MIN_AR[lead]} على أذان صلاة ${AR[k]}، استعد للصلاة.` : `${lead} minutes until ${EN[k]}. Get ready for prayer.`,
            tag: `${k}-v`,
          });
        }
        if (s.adhan !== false && at > from && at <= now) {
          msgs.push({
            title: ar ? `🕌 حان الآن وقت صلاة ${name}` : `🕌 Time for ${name}`,
            body: `${s.city ?? ''}`.trim() || (ar ? 'مواقيت الصلاة' : 'Prayer Times'),
            tag: `${k}-a`,
          });
        }
      }
      for (const m of msgs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys },
            JSON.stringify({ ...m, silent }),
            { TTL: 600, urgency: 'high', topic: m.tag.replace(/[^a-z0-9-]/gi, '').slice(0, 32) },
          );
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) expired.push(s.endpoint);
        }
      }
    }),
  );
  return NextResponse.json({ ok: true, checked: subs.length, sent, expired: [...new Set(expired)] });
}

/** true if the base64url P-256 private key belongs to the base64url public key */
function matches(priv: string, pub: string): boolean {
  try {
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(priv)) return false;
    const e = createECDH('prime256v1');
    e.setPrivateKey(Buffer.from(priv, 'base64url'));
    return e.getPublicKey().toString('base64url') === pub;
  } catch {
    return false;
  }
}
