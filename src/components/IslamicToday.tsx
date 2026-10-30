'use client';
import { useMemo, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon, StatusChip, refEn } from './ui';
import EventCard from './EventCard';
import { addDays, diffDays, weekday } from '@/lib/civil';
import { gregorianFor, hijriFor } from '@/lib/hijri';
import { upcomingOccasions } from '@/lib/occasions';
import { significanceFor } from '@/data/significance';
import { HISTORY, eventsForDay, eventsForMonthOnly } from '@/data/history';

/**
 * «حدث في مثل هذا اليوم الهجري» — Islamic Today.
 * Religious observances (significance.ts, hadith-referenced) and historical events (history.ts,
 * source-cited, disputed dates flagged) are shown in separate sections and never mixed.
 * All dates follow the user's Hijri correction (hctx).
 */
export default function IslamicToday() {
  const { s, f, t, today, hctx, profile, go } = useApp();
  const ar = s.lang === 'ar';
  const [off, setOff] = useState(0);
  const [idxMonth, setIdxMonth] = useState<number | null>(null);
  /** jump to the next occurrence of a Hijri day (this year, else next year) */
  const jump = (m: number, d: number) => {
    const th = hijriFor(today, hctx);
    for (const y of [th.y, th.y + 1]) {
      const g = gregorianFor({ y, m, d }, hctx, today);
      if (g && diffDays(g.date, today) >= 0) {
        setOff(diffDays(g.date, today));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
  };
  const date = useMemo(() => addDays(today, off), [today, off]);
  const h = useMemo(() => hijriFor(date, hctx), [date, hctx]);
  const next = useMemo(() => hijriFor(addDays(date, 1), hctx), [date, hctx]);
  const sig = significanceFor(h, weekday(date), false, next);
  const day = eventsForDay(h.m, h.d);
  const month = eventsForMonthOnly(h.m);
  const occ = upcomingOccasions(today, hctx);
  const pick = (k: 'ramadan' | 'eidFitr' | 'eidAdha') => occ.find((o) => o.key === k);

  const tiles = [
    { k: 'ramadan' as const, l: ar ? 'رمضان' : 'Ramadan' },
    { k: 'eidFitr' as const, l: t.eidFitr },
    { k: 'eidAdha' as const, l: t.eidAdha },
  ];

  return (
    <div className="safe-top mx-auto grid max-w-3xl gap-3">
      <header className="flex items-center gap-2 px-1">
        <button type="button" onClick={() => go('today')} className="grid h-9 w-9 place-items-center rounded-full bg-surface shadow-sm" aria-label={t.close}>
          <Icon name={ar ? 'chevR' : 'chevL'} className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-[22px] font-bold text-emerald">{ar ? 'حدث في مثل هذا اليوم الهجري' : 'Islamic Today'}</h1>
      </header>

      {/* date browser */}
      <section className="hero-pattern relative overflow-hidden rounded-[1.4rem] bg-gradient-to-b from-[#0b3b33] to-[#07141a] p-4 text-center text-[#f4ecd8]">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setOff((x) => x - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label={ar ? 'اليوم السابق' : 'Previous day'}>
            <Icon name={ar ? 'chevR' : 'chevL'} className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="whitespace-nowrap font-display text-[22px] font-bold leading-tight text-[#f7e7b8] min-[400px]:text-[25px]">{f.hDate(h)}</p>
            <p className="text-[13px] text-white/75">
              {f.weekday(date)} · {f.gDate(date)} · <span className="tnum">{f.gShort(date)}</span>
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#e8c77a]">
              {ar ? 'شهر ' : 'Month: '}
              {f.hMonth(h.m)}
            </p>
          </div>
          <button type="button" onClick={() => setOff((x) => x + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label={ar ? 'اليوم التالي' : 'Next day'}>
            <Icon name={ar ? 'chevL' : 'chevR'} className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <StatusChip status={h.status} profile={profile} small onDark />
          {off !== 0 && (
            <button type="button" onClick={() => setOff(0)} className="chip bg-white/15 text-white">
              {ar ? 'العودة لليوم' : 'Back to today'}
            </button>
          )}
        </div>
      </section>

      {/* countdowns */}
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(({ k, l }) => {
          const o = pick(k);
          return (
            <div key={k} className="card p-3 text-center">
              <p className="text-[11.5px] font-bold text-muted">{l}</p>
              <p className="font-display text-[26px] font-bold leading-tight text-emerald">{o ? (o.ongoing ? '●' : f.n(o.days)) : '—'}</p>
              <p className="text-[10.5px] text-muted">{o ? (o.ongoing ? (ar ? 'الآن' : 'now') : t.days) : ''}</p>
              {o && <p className="tnum mt-0.5 text-[10.5px] text-muted">{f.gShort(o.date)}</p>}
            </div>
          );
        })}
      </div>

      {/* observances */}
      <Card title={ar ? 'المناسبات والأعمال المستحبة' : 'Observances & recommended acts'} icon="star">
        {sig.length === 0 ? (
          <p className="text-[13px] text-muted">{t.noSignificance}</p>
        ) : (
          <ul className="grid gap-2.5">
            {sig.map((it) => (
              <li key={it.id} className="rounded-xl bg-emerald/5 p-3">
                <p className="text-[14px] font-bold text-emerald">{it.title[s.lang]}</p>
                <p className="mt-1 text-[13px] leading-6 text-ink/85">{it.body[s.lang]}</p>
                <p className="mt-1.5 text-[10.5px] leading-4 text-muted">{(ar ? it.refs : it.refs.map(refEn)).join(' · ')}</p>
                {it.diff && (
                  <p className="mt-2 rounded-lg border border-gold/30 bg-gold/5 p-2 text-[11.5px] leading-5 text-ink/80">
                    <b className="text-gold">{t.scholarlyDiff}: </b>
                    {it.diff[s.lang]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* historical events */}
      <Card title={ar ? `وقائع تاريخية في ${f.n(h.d)} ${f.hMonth(h.m)}` : `Historical events on ${h.d} ${f.hMonth(h.m)}`} icon="book">
        {day.length === 0 ? (
          <p className="rounded-xl bg-ink/[.03] p-3 text-[13px] text-muted">{t.noEvent}</p>
        ) : (
          <div className="grid gap-2.5">
            {day.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        )}
        {month.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-[12.5px] font-bold text-emerald">
              {t.monthEvents} ({f.n(month.length)})
            </p>
            <div className="grid gap-2.5">
              {month.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          </>
        )}
      </Card>

      {/* index: every event by Hijri month — tap one to open its day */}
      <Card title={ar ? `فهرس الأحداث — ${f.n(HISTORY.length)} حدثًا` : `Event index — ${HISTORY.length} events`} icon="calendar">
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const n = HISTORY.filter((e) => e.m === m).length;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setIdxMonth(idxMonth === m ? null : m)}
                className={`rounded-lg px-1 py-1.5 text-[12px] font-bold ${idxMonth === m ? 'bg-emerald text-white' : 'bg-emerald/5 text-ink/80'}`}
              >
                {f.hMonth(m)}
                <span className="block text-[10.5px] font-semibold opacity-70">{f.n(n)}</span>
              </button>
            );
          })}
        </div>
        {idxMonth && (
          <ul className="mt-3 divide-y divide-line/5">
            {HISTORY.filter((e) => e.m === idxMonth)
              .sort((a, b) => (a.d ?? 99) - (b.d ?? 99) || a.y - b.y)
              .map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => jump(e.m, e.d ?? 1)} className="flex w-full items-center gap-3 py-2 text-start">
                    <span className="w-16 shrink-0 text-center text-[12px] font-bold text-emerald">
                      {e.d ? `${f.n(e.d)} ${f.hMonth(e.m)}` : ar ? 'الشهر' : 'month'}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-semibold leading-5">
                      {e.title[s.lang]}
                      <span className="ms-1 text-[11px] font-normal text-muted">({f.n(e.y < 0 ? (ar ? `${-e.y} ق.هـ` : `${-e.y} BH`) : ar ? `${e.y} هـ` : `${e.y} AH`)})</span>
                    </span>
                    <Icon name={ar ? 'chevL' : 'chevR'} className="h-4 w-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <p className="px-2 pb-2 text-[11px] leading-5 text-muted">
        {ar
          ? 'الوقائع من قاعدة بيانات منتقاة مع ذكر المصدر لكل واقعة، ويُنبَّه على المختلف في تاريخه، وما لم يُحفظ يومه يُذكر في الشهر فقط. التواريخ الهجرية المحسوبة مبدئية وقد تختلف عن رؤية الهلال المعلنة محليًا؛ صحّحها من الإعدادات بيومين قبل أو بعد.'
          : 'Events come from a curated database with a source for each; disputed dates are flagged and events without a recorded day are listed under the month only. Calculated Hijri dates are provisional and may differ from local sightings — correct them in Settings by up to two days.'}{' '}
        {off !== 0 && (ar ? `(${f.n(Math.abs(diffDays(date, today)))} يوم ${off > 0 ? 'بعد' : 'قبل'} اليوم)` : `(${Math.abs(off)} day(s) ${off > 0 ? 'ahead' : 'back'})`)}
      </p>
    </div>
  );
}
