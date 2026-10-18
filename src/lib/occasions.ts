import type { CivilDate, HijriDate, HijriResult } from './types';
import { diffDays } from './civil';
import { gregorianFor, hijriFor, type HijriContext } from './hijri';

export type OccasionKey = 'ramadan' | 'eidFitr' | 'dhTen' | 'arafah' | 'eidAdha' | 'ashura' | 'whiteDays';

export interface Occurrence {
  key: OccasionKey;
  hijri: HijriDate;
  date: CivilDate;
  days: number;
  status: HijriResult['status'];
  /** true while today lies inside the occasion's span */
  ongoing: boolean;
  /** 1-based day within the span when ongoing */
  dayOf?: number;
}

interface Def {
  key: OccasionKey;
  m: number;
  d: number;
  /** span in days (Eid al-Adha = 4: Eid + 3 days of Tashriq; Eid al-Fitr = 3 customary days) */
  span: number;
}

const DEFS: Def[] = [
  { key: 'ramadan', m: 9, d: 1, span: 30 },
  { key: 'eidFitr', m: 10, d: 1, span: 3 },
  { key: 'dhTen', m: 12, d: 1, span: 10 },
  { key: 'arafah', m: 12, d: 9, span: 1 },
  { key: 'eidAdha', m: 12, d: 10, span: 4 },
  { key: 'ashura', m: 1, d: 10, span: 1 },
];

function nextFor(def: Def, today: CivilDate, th: HijriResult, ctx: HijriContext): Occurrence | null {
  // ongoing? (same Hijri month, day inside span)
  if (th.m === def.m && th.d >= def.d && th.d < def.d + def.span) {
    const g = gregorianFor({ y: th.y, m: def.m, d: def.d }, ctx, today);
    if (g) return { key: def.key, hijri: { y: th.y, m: def.m, d: def.d }, date: g.date, days: 0, status: th.status, ongoing: true, dayOf: th.d - def.d + 1 };
  }
  for (const y of [th.y, th.y + 1]) {
    const target = { y, m: def.m, d: def.d };
    const g = gregorianFor(target, ctx, today);
    if (!g) continue;
    const days = diffDays(g.date, today);
    if (days > 0) return { key: def.key, hijri: target, date: g.date, days, status: g.h.status, ongoing: false };
  }
  return null;
}

export function upcomingOccasions(today: CivilDate, ctx: HijriContext): Occurrence[] {
  const th = hijriFor(today, ctx);
  const out: Occurrence[] = [];
  for (const def of DEFS) {
    const o = nextFor(def, today, th, ctx);
    if (o) out.push(o);
  }
  // White days: 13–15 of the current month if not yet passed, else next month
  if (th.d >= 13 && th.d <= 15) {
    const g = gregorianFor({ y: th.y, m: th.m, d: 13 }, ctx, today);
    if (g) out.push({ key: 'whiteDays', hijri: { y: th.y, m: th.m, d: 13 }, date: g.date, days: 0, status: th.status, ongoing: true, dayOf: th.d - 12 });
  } else {
    const nm = th.d < 13 ? { y: th.y, m: th.m } : th.m === 12 ? { y: th.y + 1, m: 1 } : { y: th.y, m: th.m + 1 };
    const g = gregorianFor({ ...nm, d: 13 }, ctx, today);
    if (g) out.push({ key: 'whiteDays', hijri: { ...nm, d: 13 }, date: g.date, days: diffDays(g.date, today), status: g.h.status, ongoing: false });
  }
  return out;
}
