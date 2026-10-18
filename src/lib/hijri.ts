import type { CivilDate, HijriDate, HijriResult, Profile } from './types';
import { addDays, dayNumber, noonUTC, parseKey } from './civil';
import { OFFICIAL_MONTH_STARTS, type OfficialMonthStart } from '../data/officialHijri';

/* ---------------- Umm al-Qura base calendar (ICU via Intl) ---------------- */

let uqFmt: Intl.DateTimeFormat | null = null;
let uqCalendar = 'islamic-umalqura';

function fmt(): Intl.DateTimeFormat {
  if (uqFmt) return uqFmt;
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' };
  for (const cal of ['islamic-umalqura', 'islamic-civil', 'islamic']) {
    try {
      const f = new Intl.DateTimeFormat(`en-u-ca-${cal}-nu-latn`, opts);
      if (f.resolvedOptions().calendar === cal) {
        uqFmt = f;
        uqCalendar = cal;
        return f;
      }
    } catch {
      /* try next */
    }
  }
  throw new Error('No Islamic calendar support in this browser');
}

/** Which ICU calendar is backing the engine (should be islamic-umalqura on all modern engines). */
export function baseCalendar(): string {
  fmt();
  return uqCalendar;
}

const uqCache = new Map<number, HijriDate>();
/** Pure Umm al-Qura conversion of a Gregorian civil date. */
export function umalqura(c: CivilDate): HijriDate {
  const dn = dayNumber(c);
  const hit = uqCache.get(dn);
  if (hit) return hit;
  const p: Record<string, string> = {};
  for (const x of fmt().formatToParts(noonUTC(c))) p[x.type] = x.value;
  const h = { y: parseInt(p.year, 10), m: parseInt(p.month, 10), d: parseInt(p.day, 10) };
  if (uqCache.size > 5000) uqCache.clear();
  uqCache.set(dn, h);
  return h;
}

/* ---------------- Country convention layer ---------------- */

export interface HijriContext {
  profile: Profile;
  /** null = automatic (official table); number = manual shift in days applied to Umm al-Qura */
  manualOffset: number | null;
}

interface Anchor extends OfficialMonthStart {
  dn: number;
  /** shift k such that umalqura(start + k) is day 1 of (y, m) */
  k: number;
}

const anchorCache = new Map<string, Anchor[]>();
function anchors(profile: Profile): Anchor[] {
  if (profile === 'OTHER') return [];
  const cached = anchorCache.get(profile);
  if (cached) return cached;
  const list: Anchor[] = [];
  for (const a of OFFICIAL_MONTH_STARTS[profile]) {
    const start = parseKey(a.start);
    let k: number | null = null;
    for (const cand of [0, -1, 1, -2, 2, -3, 3]) {
      const h = umalqura(addDays(start, cand));
      if (h.y === a.y && h.m === a.m && h.d === 1) {
        k = cand;
        break;
      }
    }
    if (k === null) {
      console.warn('Official Hijri anchor inconsistent with Umm al-Qura by >3 days, ignored', a);
      continue;
    }
    list.push({ ...a, dn: dayNumber(start), k });
  }
  list.sort((x, y) => x.dn - y.dn);
  anchorCache.set(profile, list);
  return list;
}

function latestAnchor(profile: Profile, dn: number): Anchor | null {
  const list = anchors(profile);
  let best: Anchor | null = null;
  for (const a of list) if (a.dn <= dn) best = a;
  return best;
}

/**
 * Hijri date of a Gregorian civil date under a country convention.
 * Shifting is done on the Gregorian side before conversion, so month and year
 * boundaries (29/30-day months, 1 Muharram) are always handled correctly.
 */
export function hijriFor(c: CivilDate, ctx: HijriContext): HijriResult {
  if (ctx.manualOffset !== null) {
    return { ...umalqura(addDays(c, ctx.manualOffset)), status: 'user' };
  }
  const dn = dayNumber(c);
  const a = latestAnchor(ctx.profile, dn);
  if (a) {
    const diff = dn - a.dn;
    if (diff < 29) return { y: a.y, m: a.m, d: diff + 1, status: 'official', sourceUrl: a.source };
  }
  const k = a ? a.k : 0;
  const h = umalqura(addDays(c, k));
  // If the next official month starts later than the carried-forward calculation predicts,
  // the preceding month absorbs the difference (becomes day 30) instead of repeating day 1.
  const nx = nextAnchor(ctx.profile, dn);
  if (nx && h.y === nx.y && h.m === nx.m) {
    const prev = fromIndex(hijriIndex(nx) - 1);
    for (let back = 1; back <= 31; back++) {
      const p = umalqura(addDays(c, k - back));
      if (p.y === prev.y && p.m === prev.m && p.d === 1) return { y: prev.y, m: prev.m, d: back + 1, status: 'calculated' };
    }
  }
  return { ...h, status: 'calculated' };
}

function nextAnchor(profile: Profile, dn: number): Anchor | null {
  for (const a of anchors(profile)) if (a.dn > dn) return a;
  return null;
}

export function hijriIndex(h: { y: number; m: number }): number {
  return h.y * 12 + (h.m - 1);
}

export function fromIndex(i: number): { y: number; m: number } {
  return { y: Math.floor(i / 12), m: (i % 12) + 1 };
}

/**
 * Gregorian civil date on which `target` falls under ctx, searched near `ref`.
 * Returns null when the date does not exist (e.g. day 30 of a 29-day month).
 */
export function gregorianFor(target: HijriDate, ctx: HijriContext, ref: CivilDate): { date: CivilDate; h: HijriResult } | null {
  const rh = hijriFor(ref, ctx);
  const monthDelta = hijriIndex(target) - hijriIndex(rh);
  const est = addDays(ref, Math.round(monthDelta * 29.530589) + (target.d - rh.d));
  for (let i = 0; i <= 6; i++) {
    for (const s of i === 0 ? [0] : [i, -i]) {
      const g = addDays(est, s);
      const h = hijriFor(g, ctx);
      if (h.y === target.y && h.m === target.m && h.d === target.d) return { date: g, h };
    }
  }
  return null;
}

export interface HijriMonthGrid {
  y: number;
  m: number;
  start: CivilDate;
  length: number;
  status: HijriResult['status'];
}

export function monthGrid(y: number, m: number, ctx: HijriContext, ref: CivilDate): HijriMonthGrid | null {
  const s = gregorianFor({ y, m, d: 1 }, ctx, ref);
  if (!s) return null;
  const n = fromIndex(hijriIndex({ y, m }) + 1);
  const e = gregorianFor({ y: n.y, m: n.m, d: 1 }, ctx, s.date);
  const length = e ? dayNumber(e.date) - dayNumber(s.date) : 30;
  return { y, m, start: s.date, length, status: s.h.status };
}

/**
 * Offset (in days) that makes today's Hijri date equal to a user-confirmed date.
 * Returns null if the requested date is more than ±3 days from Umm al-Qura.
 */
export function offsetForConfirmed(today: CivilDate, confirmed: HijriDate): number | null {
  for (const k of [0, -1, 1, -2, 2, -3, 3]) {
    const h = umalqura(addDays(today, k));
    if (h.y === confirmed.y && h.m === confirmed.m && h.d === confirmed.d) return k;
  }
  return null;
}

/* ---------------- Names ---------------- */

export const HIJRI_MONTHS = {
  ar: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'],
  en: [
    'Muharram',
    'Safar',
    'Rabiʿ al-Awwal',
    'Rabiʿ al-Akhir',
    'Jumada al-Ula',
    'Jumada al-Akhirah',
    'Rajab',
    'Shaʿban',
    'Ramadan',
    'Shawwal',
    'Dhu al-Qaʿdah',
    'Dhu al-Hijjah',
  ],
};

export const SACRED_MONTHS = [1, 7, 11, 12];
