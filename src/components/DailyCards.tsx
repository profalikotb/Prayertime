'use client';
import { useMemo } from 'react';
import { useApp } from './ctx';
import { Card, Icon } from './ui';
import { clinicPlans } from '@/lib/clinics';
import { wallClock, sameDay, weekday } from '@/lib/civil';
import { PRAYER_NAMES } from '@/lib/i18n';
import { LOG_PRAYERS, done, stats, toggle, usePrayerLog, type LogPrayer } from '@/lib/prayerLog';
import type { PrayerKey } from '@/lib/types';

/* ---------------- Clinic day planner ---------------- */
export function ClinicCard() {
  const { s, f, today, times, now, place } = useApp();
  const ar = s.lang === 'ar';
  const names = PRAYER_NAMES[s.lang];
  const plans = useMemo(() => {
    const w = wallClock(times.today.dhuhr, place.tz);
    return clinicPlans(today, times.today, w.h * 60 + w.min, s.clinics ?? []);
  }, [today, times, place.tz, s.clinics]);
  if (!plans.length) return null;
  const t = now.getTime();
  return (
    <Card title={ar ? 'اليوم في العيادة' : 'Clinic today'} icon="pin" className="xl:col-span-2">
      <div className="grid gap-3">
        {plans.map((p) => {
          const over = t > p.endAt.getTime();
          const inSession = t >= p.startAt.getTime() && !over;
          const mustLeave = !inSession && !over && t >= p.leaveAt.getTime() - 20 * 60000;
          return (
            <div key={p.clinic.id} className={`rounded-xl border p-3 ${inSession ? 'border-emerald/50 bg-emerald/5' : 'border-line/10'} ${over ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[15px] font-bold">{p.clinic.name}</p>
                <a
                  href={p.clinic.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-emerald/10 text-emerald"
                  aria-label={ar ? 'الخريطة' : 'Map'}
                >
                  <Icon name="pin" className="h-4 w-4" />
                </a>
              </div>
              <p className="tnum mt-0.5 text-[12.5px] text-muted">
                {f.time(p.startAt)} – {f.time(p.endAt)} · {ar ? 'التحرك' : 'leave'} {f.time(p.leaveAt)}
                {inSession && <b className="ms-1 text-emerald">· {ar ? 'الجلسة الآن' : 'in session'}</b>}
                {mustLeave && <b className="ms-1 text-gold">· {ar ? 'اقترب موعد التحرك' : 'leave soon'}</b>}
              </p>
              {p.advice.length > 0 && (
                <ul className="mt-2 grid gap-1.5">
                  {p.advice.map((a) => {
                    const passed = a.at.getTime() < t;
                    const text =
                      a.kind === 'jumuah'
                        ? ar
                          ? `صلاة الجمعة ${f.time(a.at)} قبل التحرك إلى العيادة`
                          : `Jumuʿa at ${f.time(a.at)} before leaving`
                        : a.kind === 'before'
                          ? ar
                            ? `صلِّ ${names[a.prayer]} (${f.time(a.at)}) قبل الخروج`
                            : `Pray ${names[a.prayer]} (${f.time(a.at)}) before leaving`
                          : ar
                            ? `${names[a.prayer]} ${f.time(a.at)} أثناء العيادة — خصّص استراحة قصيرة`
                            : `${names[a.prayer]} at ${f.time(a.at)} during clinic — plan a short break`;
                    return (
                      <li
                        key={a.prayer}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ${
                          passed ? 'text-muted line-through decoration-1' : a.kind === 'during' ? 'bg-gold/10 font-semibold' : 'bg-emerald/10 font-semibold'
                        }`}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${a.kind === 'during' ? 'bg-gold' : 'bg-emerald'}`} />
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] text-muted">{ar ? 'المواعيد ووقت الطريق قابلة للتعديل من الإعدادات ← العيادات.' : 'Hours and travel time are editable in Settings → Clinics.'}</p>
    </Card>
  );
}

/* ---------------- Prayer log ---------------- */
export function LogCheck({ k }: { k: PrayerKey }) {
  const { today, times, now, s } = useApp();
  const [log, update] = usePrayerLog();
  if (k === 'sunrise') return null;
  const p = k as LogPrayer;
  const due = times.today[k].getTime() <= now.getTime();
  const on = done(log, today, p);
  if (!due && !on) return <span className="w-8" />;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={s.lang === 'ar' ? 'صلّيت' : 'Prayed'}
      onClick={(e) => {
        e.stopPropagation();
        update((l) => toggle(l, today, p));
        try {
          navigator.vibrate?.(15);
        } catch {
          /* ignore */
        }
      }}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition ${
        on ? 'border-emerald bg-emerald text-white' : 'border-gold/70 text-transparent'
      }`}
    >
      <Icon name="check" className="h-4 w-4" />
    </button>
  );
}

export function LogCard() {
  const { s, f, today } = useApp();
  const ar = s.lang === 'ar';
  const [log, update] = usePrayerLog();
  const st = stats(log, today);
  const names = PRAYER_NAMES[s.lang];
  const WD = ar ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <Card title={ar ? 'سجل الصلوات' : 'Prayer log'} icon="check">
      <div className="grid grid-cols-7 gap-1.5 text-center" dir={ar ? 'rtl' : 'ltr'}>
        {st.week.map(({ day, n }) => {
          const isToday = sameDay(day, today);
          return (
            <div key={day.d} className="grid gap-1">
              <span className={`text-[11px] font-bold ${isToday ? 'text-gold' : 'text-muted'}`}>{WD[weekday(day)]}</span>
              <div className="mx-auto grid gap-[3px]">
                {LOG_PRAYERS.map((p) => (
                  <span
                    key={p}
                    title={names[p]}
                    className={`block h-2.5 w-6 rounded-full ${done(log, day, p) ? 'bg-emerald' : isToday ? 'bg-ink/10' : 'bg-ink/[.06]'}`}
                  />
                ))}
              </div>
              <span className="tnum text-[11px] font-bold">{f.n(n)}/{f.n(5)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald/5 p-2">
          <p className="text-[11px] text-muted">{ar ? 'آخر ٣٠ يومًا' : 'Last 30 days'}</p>
          <p className="tnum text-[18px] font-extrabold text-emerald">{f.n(Math.round(st.last30 * 100))}٪</p>
        </div>
        <div className="rounded-xl bg-gold/10 p-2">
          <p className="text-[11px] text-muted">{ar ? 'أيام متتالية كاملة' : 'Full-day streak'}</p>
          <p className="tnum text-[18px] font-extrabold text-gold">{f.n(st.streak)}</p>
        </div>
        <div className="rounded-xl bg-ink/[.04] p-2">
          <p className="text-[11px] text-muted">{ar ? 'قضاء' : 'Qada'}</p>
          <div className="flex items-center justify-center gap-1.5">
            <button type="button" className="h-7 w-7 rounded-lg bg-surface text-[16px] font-bold shadow-sm" onClick={() => update((l) => ({ ...l, qada: Math.max(0, l.qada - 1) }))}>
              −
            </button>
            <span className="tnum min-w-[2ch] text-[17px] font-extrabold">{f.n(log.qada)}</span>
            <button type="button" className="h-7 w-7 rounded-lg bg-surface text-[16px] font-bold shadow-sm" onClick={() => update((l) => ({ ...l, qada: l.qada + 1 }))}>
              +
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10.5px] text-muted">
        {ar ? 'اضغط الدائرة بجوار كل صلاة بعد أدائها. السجل محفوظ على هذا الجهاز فقط.' : 'Tap the circle next to each prayer once prayed. Stored on this device only.'}
      </p>
    </Card>
  );
}
