'use client';
import { useMemo, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon, StatusChip, refEn } from './ui';
import HijriAdjust from './HijriAdjust';
import EventCard from './EventCard';
import { addDays, key, sameDay, weekday } from '@/lib/civil';
import { fromIndex, hijriFor, hijriIndex, monthGrid } from '@/lib/hijri';
import { daysWithEvents, eventsForDay, eventsForMonthOnly } from '@/data/history';
import { significanceFor } from '@/data/significance';
import { computeDay } from '@/lib/prayer';
import { PRAYER_NAMES } from '@/lib/i18n';
import type { CivilDate } from '@/lib/types';

const WD_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SPECIAL = new Set(['9-1', '10-1', '12-9', '12-10', '1-10', '1-1']);

export default function CalendarView() {
  const { t, f, s, today, hijri, hctx, profile, place, opts } = useApp();
  const [idx, setIdx] = useState(() => hijriIndex(hijri));
  const [sel, setSel] = useState<CivilDate>(today);
  const ym = fromIndex(idx);
  const grid = useMemo(() => monthGrid(ym.y, ym.m, hctx, today), [ym.y, ym.m, hctx, today]);
  const startDow = s.lang === 'ar' ? 6 : 0; // Arabic week starts Saturday
  const evDays = daysWithEvents(ym.m);

  if (!grid) return null;
  const lead = (weekday(grid.start) - startDow + 7) % 7;
  const cells: (CivilDate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: grid.length }, (_, i) => addDays(grid.start, i))];
  while (cells.length % 7) cells.push(null);
  const wd = Array.from({ length: 7 }, (_, i) => (s.lang === 'ar' ? WD_AR : WD_EN)[(startDow + i) % 7]);
  const last = addDays(grid.start, grid.length - 1);

  const selH = hijriFor(sel, hctx);
  const selTimes = computeDay(sel, place, opts(sel));
  const selSig = significanceFor(selH, weekday(sel), false, hijriFor(addDays(sel, 1), hctx));
  const selEvents = eventsForDay(selH.m, selH.d);
  const names = PRAYER_NAMES[s.lang];

  return (
    <div className="safe-top grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
      <div className="grid gap-3">
        <Card>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t.prevMonth} onClick={() => setIdx(idx - 1)} className="grid h-10 w-10 place-items-center rounded-xl bg-ink/5">
              <Icon name={s.lang === 'ar' ? 'chevR' : 'chevL'} />
            </button>
            <div className="flex-1 text-center">
              <p className="font-display text-[24px] font-bold leading-tight text-emerald">
                {f.hMonth(ym.m)} {f.n(ym.y)} {t.ah}
              </p>
              <p className="text-[11.5px] text-muted">
                {f.gDate(grid.start)} – {f.gDate(last)}
              </p>
            </div>
            <button type="button" aria-label={t.nextMonth} onClick={() => setIdx(idx + 1)} className="grid h-10 w-10 place-items-center rounded-xl bg-ink/5">
              <Icon name={s.lang === 'ar' ? 'chevL' : 'chevR'} />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <StatusChip status={grid.status} profile={profile} small />
            {idx !== hijriIndex(hijri) && (
              <button
                type="button"
                onClick={() => {
                  setIdx(hijriIndex(hijri));
                  setSel(today);
                }}
                className="chip bg-emerald text-white"
              >
                {t.goToday}
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {wd.map((w, i) => (
              <div key={w} className={`pb-1 text-[11px] font-bold ${(startDow + i) % 7 === 5 ? 'text-gold' : 'text-muted'}`}>
                {w}
              </div>
            ))}
            {cells.map((c, i) => {
              if (!c) return <div key={`e${i}`} />;
              const hd = i - lead + 1;
              const isToday = sameDay(c, today);
              const isSel = sameDay(c, sel);
              const fri = weekday(c) === 5;
              const special = SPECIAL.has(`${ym.m}-${hd}`) || ym.m === 9 || (ym.m === 12 && hd <= 13);
              const white = hd >= 13 && hd <= 15;
              return (
                <button
                  key={key(c)}
                  type="button"
                  onClick={() => setSel(c)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-center transition ${
                    isSel ? 'bg-emerald text-white shadow' : isToday ? 'ring-2 ring-gold' : special ? 'bg-emerald/5' : fri ? 'bg-gold/5' : ''
                  }`}
                >
                  <span className={`font-display text-[19px] font-bold leading-none ${isSel ? '' : white ? 'text-gold' : ''}`}>{f.n(hd)}</span>
                  <span className={`tnum text-[9.5px] leading-3 ${isSel ? 'text-white/80' : 'text-muted'}`}>{f.n(c.d)}</span>
                  {evDays.has(hd) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSel ? 'bg-white' : 'bg-gold'}`} />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10.5px] text-muted">{t.provisionalNote}</p>
        </Card>
        <Card title={t.hijriAdjust} icon="gear">
          <HijriAdjust />
        </Card>
      </div>

      <div className="grid gap-3">
        <Card title={t.dayDetails} icon="calendar">
          <p className="font-display text-[22px] font-bold text-emerald">{f.hDate(selH)}</p>
          <p className="text-[12.5px] text-muted">
            {f.weekday(sel)} · {f.gDate(sel)} · <span className="tnum">{f.gShort(sel)}</span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center sm:grid-cols-6">
            {(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((k) => (
              <div key={k} className={`rounded-lg p-1.5 ${k === 'sunrise' ? 'bg-ink/[.03]' : 'bg-emerald/5'}`}>
                <p className="text-[10.5px] font-semibold text-muted">{names[k]}</p>
                <p className="tnum text-[13px] font-bold">{f.time(selTimes[k])}</p>
              </div>
            ))}
          </div>
          {selSig.length > 0 && (
            <ul className="mt-3 grid gap-1.5">
              {selSig.map((x) => (
                <li key={x.id} className="rounded-lg bg-gold/5 p-2 text-[12.5px] leading-5">
                  <b className="text-gold">{x.title[s.lang]}</b> — {x.body[s.lang]}
                  <span className="block text-[10.5px] text-muted">{(s.lang === 'ar' ? x.refs : x.refs.map(refEn)).join(' · ')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t.history} icon="book">
          {selEvents.length === 0 ? (
            <p className="rounded-xl bg-ink/[.03] p-3 text-[13px] text-muted">{t.noEvent}</p>
          ) : (
            <div className="grid gap-2.5">
              {selEvents.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          )}
          {eventsForMonthOnly(selH.m).length > 0 && (
            <>
              <p className="mb-2 mt-3 text-[12px] font-bold text-emerald">{t.monthEvents}</p>
              <div className="grid gap-2.5">
                {eventsForMonthOnly(selH.m).map((e) => (
                  <EventCard key={e.id} e={e} />
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
