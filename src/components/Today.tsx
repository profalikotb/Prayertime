'use client';
import { useEffect, useState } from 'react';
import { useApp } from './ctx';
import { Card, Crescent, Icon, PrayerIcon, StatusChip, refEn } from './ui';
import { PRAYER_KEYS, type PrayerKey } from '@/lib/types';
import { PRAYER_NAMES } from '@/lib/i18n';
import { methodInfo } from '@/lib/methods';
import { upcomingOccasions, type Occurrence } from '@/lib/occasions';
import { addDays, weekday } from '@/lib/civil';
import { gregorianFor, hijriFor } from '@/lib/hijri';
import { daysPhrase } from '@/lib/format';
import { significanceFor } from '@/data/significance';
import { eventsForDay, eventsForMonthOnly } from '@/data/history';
import EventCard from './EventCard';

export default function Today() {
  return (
    <div className="safe-top">
      <TopBar />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="grid gap-3 lg:sticky lg:top-4">
          <Hero />
          <LocationNotice />
          <PrayerList />
        </div>
        <div className="grid gap-3 xl:grid-cols-2 xl:items-start">
          <RamadanCard />
          <Occasions />
          <Significance />
          <History />
          <InstallHint />
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  const { s, set, t, online } = useApp();
  return (
    <header className="mb-3 flex items-center gap-2 px-1">
      <div className="flex-1 leading-tight">
        <h1 className="font-display text-[22px] font-bold text-emerald">{t.appName}</h1>
        <p className="text-[12px] font-semibold text-gold">{t.appBy}</p>
      </div>
      {!online && (
        <span className="chip bg-ink/5 text-muted" title={t.offline}>
          <Icon name="wifiOff" className="h-3.5 w-3.5" />
        </span>
      )}
      <button
        type="button"
        onClick={() => set((x) => ({ ...x, lang: x.lang === 'ar' ? 'en' : 'ar' }))}
        className="rounded-full border border-line/10 bg-surface px-3 py-1.5 text-[13px] font-bold text-ink/80 shadow-sm"
        aria-label={t.language}
      >
        {s.lang === 'ar' ? 'English' : 'العربية'}
      </button>
    </header>
  );
}

function phase(now: number, tt: Record<PrayerKey, Date>): 'night' | 'dawn' | 'day' | 'afternoon' | 'dusk' {
  if (now < tt.fajr.getTime() || now >= tt.isha.getTime()) return 'night';
  if (now < tt.sunrise.getTime()) return 'dawn';
  if (now < tt.asr.getTime()) return 'day';
  if (now < tt.maghrib.getTime()) return 'afternoon';
  return 'dusk';
}

const SKY = {
  night: 'from-[#06121a] via-[#0a2230] to-[#0b3b33]',
  dawn: 'from-[#0c2340] via-[#1d4057] to-[#6b4f58]',
  day: 'from-[#0b3b33] via-[#0e5c4a] to-[#14745c]',
  afternoon: 'from-[#0b3b33] via-[#2c5a3f] to-[#8a6a2e]',
  dusk: 'from-[#1a1b3a] via-[#3d2b45] to-[#8c4a3a]',
};

function Hero() {
  const { t, f, s, place, now, today, hijri, profile, times, ps, method, go } = useApp();
  const names = PRAYER_NAMES[s.lang];
  const remaining = ps.next.at.getTime() - now.getTime();
  const span = ps.next.at.getTime() - ps.prev.at.getTime();
  const frac = span > 0 ? Math.min(1, Math.max(0, 1 - remaining / span)) : 0;
  const ph = phase(now.getTime(), times.today);
  const isFri = weekday(today) === 5;
  const nextName = ps.next.key === 'dhuhr' && isFri && !ps.next.tomorrow ? (s.lang === 'ar' ? 'الجمعة' : 'Jumuʿa') : names[ps.next.key];
  const R = 74;
  const C = 2 * Math.PI * R;
  const nt = f.timeParts(ps.next.at);

  return (
    <section className={`hero-pattern relative overflow-hidden rounded-[1.6rem] bg-gradient-to-b ${SKY[ph]} p-4 text-[#f4ecd8] shadow-[0_18px_40px_-18px_rgba(4,30,26,.7)] transition-colors duration-1000`}>
      <Crescent className="pointer-events-none absolute -top-4 end-[-18px] h-24 w-24 opacity-80 drop-shadow-[0_0_24px_rgba(232,199,122,.35)]" />
      <button type="button" onClick={() => go('settings')} className="relative flex max-w-[78%] items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold backdrop-blur">
        <Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-[#e8c77a]" />
        <span className="truncate">
          {place.city[s.lang]}
          {place.country[s.lang] ? ` · ${place.country[s.lang]}` : ''}
        </span>
      </button>
      <div className="relative mt-3 pe-16">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-[26px] font-bold leading-tight text-[#f7e7b8]">{f.hDate(hijri)}</p>
          <StatusChip status={hijri.status} profile={profile} small onDark />
        </div>
        <p className="mt-0.5 text-[13px] text-white/75">
          {f.weekday(today)} · {f.gDate(today)} · <span className="tnum">{f.gShort(today)}</span>
        </p>
      </div>

      <div className="relative mx-auto mt-3 grid w-full max-w-[260px] place-items-center">
        <svg viewBox="0 0 180 180" className="h-auto w-full -rotate-90" aria-hidden="true">
          <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" />
          <circle
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke="url(#gold)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${C * frac} ${C}`}
            style={{ transition: 'stroke-dasharray 1s linear', transform: s.lang === 'ar' ? 'scaleY(-1)' : undefined, transformOrigin: 'center' }}
          />
          <defs>
            <linearGradient id="gold" x1="0" x2="1">
              <stop offset="0" stopColor="#b8892e" />
              <stop offset="1" stopColor="#f3d98f" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[12px] font-semibold text-white/70">
              {ps.next.key === 'sunrise' ? t.nextEvent : t.nextPrayer}
              {ps.next.tomorrow ? ` · ${t.tomorrow}` : ''}
            </p>
            <p className="font-display text-[30px] font-bold leading-tight text-[#f7e7b8]">{nextName}</p>
            <p key={Math.floor(now.getTime() / 1000)} className="tnum tick text-[34px] font-extrabold leading-none tracking-wide" dir="ltr" aria-live="off">
              {f.countdown(remaining)}
            </p>
            <p className="mt-1 text-[13px] text-white/75">
              <span className="tnum">{nt.hm}</span> {nt.ap}
            </p>
          </div>
        </div>
      </div>
      <p className="relative mt-1 text-center text-[11px] text-white/55">
        {t.method}: {methodInfo(method).name[s.lang]}
      </p>
    </section>
  );
}

function LocationNotice() {
  const { locStatus, t, refreshLocation, s, place } = useApp();
  if (s.locationMode === 'manual') return null;
  if (locStatus === 'locating')
    return (
      <p className="flex items-center justify-center gap-2 text-[12px] text-muted">
        <Icon name="refresh" className="h-3.5 w-3.5 animate-spin" />
        {t.locating}
      </p>
    );
  if (locStatus === 'denied' || locStatus === 'failed' || place.source === 'default')
    return (
      <div className="card flex items-center gap-2 p-3 text-[12px]">
        <Icon name="info" className="h-4 w-4 shrink-0 text-gold" />
        <span className="flex-1 text-ink/80">{locStatus === 'denied' ? t.locDenied : t.locFailed}</span>
        <button type="button" onClick={() => refreshLocation(true)} className="rounded-lg bg-emerald px-2.5 py-1.5 font-bold text-white">
          {t.updateLocation}
        </button>
      </div>
    );
  return null;
}

function PrayerList() {
  const { s, f, t, times, ps, now, today } = useApp();
  const names = PRAYER_NAMES[s.lang];
  const isFri = weekday(today) === 5;
  return (
    <section className="card overflow-hidden p-1.5">
      <ul className="divide-y divide-line/5">
        {PRAYER_KEYS.map((k) => {
          const at = times.today[k];
          const isNext = !ps.next.tomorrow && ps.next.key === k;
          const isCurrent = ps.current === k && !isNext;
          const passed = at.getTime() <= now.getTime() && !isCurrent;
          const sunrise = k === 'sunrise';
          const tp = f.timeParts(at);
          const label = k === 'dhuhr' && isFri ? (s.lang === 'ar' ? 'الجمعة' : 'Jumuʿa') : names[k];
          return (
            <li
              key={k}
              className={`relative flex items-center gap-3 rounded-xl px-3 ${sunrise ? 'py-2' : 'py-3'} transition-colors ${
                isNext ? 'bg-gold/10 ring-1 ring-gold/50' : isCurrent ? 'bg-emerald/10' : ''
              } ${passed ? 'opacity-45' : ''}`}
            >
              <span className={`grid shrink-0 place-items-center rounded-xl ${sunrise ? 'h-8 w-8 bg-ink/5 text-muted' : isNext ? 'h-10 w-10 bg-gold text-white' : 'h-10 w-10 bg-emerald/10 text-emerald'}`}>
                <PrayerIcon k={k} className={sunrise ? 'h-4 w-4' : 'h-5 w-5'} />
              </span>
              <div className="flex-1">
                <p className={`${sunrise ? 'text-[14px] font-semibold text-muted' : 'text-[17px] font-bold'}`}>{label}</p>
                {sunrise && <p className="text-[10.5px] leading-4 text-muted">{t.sunriseNote}</p>}
                {isNext && <p className="tnum text-[11px] font-semibold text-gold">{f.countdown(at.getTime() - now.getTime())}</p>}
                {isCurrent && <p className="text-[11px] font-semibold text-emerald">{t.now}</p>}
              </div>
              <p className={`tnum flex items-baseline gap-1 ${sunrise ? 'text-[15px] font-semibold text-muted' : 'text-[20px] font-extrabold'}`}>
                <span>{tp.hm}</span>
                {tp.ap && <span className="text-[12px] font-bold text-muted">{tp.ap}</span>}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RamadanCard() {
  const { t, f, s, today, hijri, hctx, profile, times, now } = useApp();
  if (hijri.m === 9) {
    const eid = gregorianFor({ y: hijri.y, m: 10, d: 1 }, hctx, today);
    const eidDays = eid ? Math.round((Date.UTC(eid.date.y, eid.date.m - 1, eid.date.d) - Date.UTC(today.y, today.m - 1, today.d)) / 864e5) : null;
    const fast = times.today.maghrib.getTime() - times.today.fajr.getTime();
    const toIftar = times.today.maghrib.getTime() - now.getTime();
    const toSuhoor = times.today.fajr.getTime() - now.getTime();
    return (
      <Card title={s.lang === 'ar' ? 'رمضان كريم' : 'Ramadan Kareem'} icon="moon" className="xl:col-span-2" action={<StatusChip status={hijri.status} profile={profile} small />}>
        <div className="flex items-end gap-4">
          <div>
            <p className="font-display text-[46px] font-bold leading-none text-emerald">{f.n(hijri.d)}</p>
            <p className="text-[12px] font-semibold text-muted">{t.ramadanDay}</p>
          </div>
          <div className="flex-1 text-[12.5px] text-ink/80">
            {eidDays !== null && eidDays > 0 && (
              <p>
                <b className="text-gold">{daysPhrase(eidDays, f)}</b> {t.untilEidFitr}
                {eid?.h.status !== 'official' && <span className="text-muted"> ({t.expected})</span>}
              </p>
            )}
            {toIftar > 0 && (
              <p className="mt-1">
                <b className="tnum text-emerald" dir="ltr">
                  {f.countdown(toIftar)}
                </b>{' '}
                {t.untilIftar}
              </p>
            )}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { l: t.suhoorEnds, v: f.time(times.today.fajr), sub: toSuhoor > 0 ? f.countdown(toSuhoor) : '' },
            { l: t.iftar, v: f.time(times.today.maghrib), sub: '' },
            { l: t.fastLength, v: f.duration(fast), sub: '' },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-emerald/5 p-2">
              <dt className="text-[11px] font-semibold text-muted">{x.l}</dt>
              <dd className="tnum text-[15px] font-extrabold">{x.v}</dd>
              {x.sub && <dd className="tnum text-[10.5px] text-gold">{x.sub}</dd>}
            </div>
          ))}
        </dl>
        {hijri.d >= 20 && (
          <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-gold">
              <Icon name="star" className="h-4 w-4" />
              {t.lastTen}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-ink/75">{t.lastTenNote}</p>
          </div>
        )}
      </Card>
    );
  }
  const y = hijri.m < 9 ? hijri.y : hijri.y + 1;
  const r = gregorianFor({ y, m: 9, d: 1 }, hctx, today);
  if (!r) return null;
  const days = Math.round((Date.UTC(r.date.y, r.date.m - 1, r.date.d) - Date.UTC(today.y, today.m - 1, today.d)) / 864e5);
  return (
    <Card title={t.ramadanUntil} icon="moon" action={<StatusChip status={r.h.status} profile={profile} small />}>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="font-display text-[48px] font-bold leading-none text-emerald">{f.n(days)}</p>
          <p className="text-[11px] font-semibold text-muted">{t.days}</p>
        </div>
        <div className="flex-1 text-[13px] leading-6">
          <p className="font-bold">{f.hDate({ y, m: 9, d: 1 })}</p>
          <p className="text-muted">
            {f.weekday(r.date)} {f.gDate(r.date)}
          </p>
          {r.h.status !== 'official' && <p className="text-[11px] text-muted">{t.provisionalNote}</p>}
        </div>
      </div>
    </Card>
  );
}

function Occasions() {
  const { t, f, today, hctx, profile, s } = useApp();
  const list = upcomingOccasions(today, hctx).filter((o) => o.key !== 'ramadan');
  const label = (o: Occurrence) =>
    ({ eidFitr: t.eidFitr, eidAdha: t.eidAdha, dhTen: t.dhTen, arafah: t.arafah, ashura: t.ashura, whiteDays: t.whiteDays, ramadan: '' })[o.key];
  list.sort((a, b) => a.days - b.days);
  return (
    <Card title={t.upcoming} icon="star">
      <ul className="-mx-1 divide-y divide-line/5">
        {list.map((o) => (
          <li key={o.key} className={`flex items-center gap-3 rounded-lg px-1 py-2.5 ${o.ongoing ? 'bg-gold/10' : ''}`}>
            <div className="w-14 shrink-0 text-center">
              <p className={`font-display text-[24px] font-bold leading-none ${o.ongoing ? 'text-gold' : 'text-emerald'}`}>{o.ongoing ? '●' : f.n(o.days)}</p>
              <p className="text-[10px] font-semibold text-muted">{o.ongoing ? t.today : t.days}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">
                {label(o)}
                {o.ongoing && o.dayOf && o.key !== 'arafah' && o.key !== 'ashura' && (
                  <span className="ms-1 text-[11px] font-semibold text-gold">{s.lang === 'ar' ? `· اليوم ${f.n(o.dayOf)}` : `· day ${o.dayOf}`}</span>
                )}
              </p>
              <p className="text-[11.5px] leading-5 text-muted">
                {f.hDate(o.hijri)} · {f.weekday(o.date)} <span className="tnum">{f.gShort(o.date)}</span>
              </p>
            </div>
            <StatusChip status={o.status} profile={profile} small />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10.5px] text-muted">{t.provisionalNote}</p>
    </Card>
  );
}

function Significance() {
  const { t, s, today, hijri, hctx, now, times } = useApp();
  const afterMaghrib = now.getTime() >= times.today.maghrib.getTime();
  const tomorrow = hijriFor(addDays(today, 1), hctx);
  const items = significanceFor(hijri, weekday(today), afterMaghrib, tomorrow);
  return (
    <Card title={t.significance} icon="book">
      {items.length === 0 ? (
        <p className="text-[13px] leading-6 text-muted">{t.noSignificance}</p>
      ) : (
        <ul className="grid gap-2.5">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl bg-emerald/5 p-3">
              <p className="text-[14px] font-bold text-emerald">{it.title[s.lang]}</p>
              <p className="mt-1 text-[13px] leading-6 text-ink/85">{it.body[s.lang]}</p>
              <p className="mt-1.5 text-[10.5px] leading-4 text-muted">{(s.lang === 'ar' ? it.refs : it.refs.map(refEn)).join(' · ')}</p>
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
  );
}

function History() {
  const { t, hijri, f } = useApp();
  const day = eventsForDay(hijri.m, hijri.d);
  const month = eventsForMonthOnly(hijri.m);
  const [open, setOpen] = useState(false);
  return (
    <Card title={t.history} icon="book" className="xl:col-span-2">
      <p className="-mt-1 mb-2 text-[12px] font-semibold text-gold">
        {f.n(hijri.d)} {f.hMonth(hijri.m)}
      </p>
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
        <div className="mt-3">
          <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-lg py-1.5 text-[12.5px] font-bold text-emerald">
            <span>
              {t.monthEvents} ({f.n(month.length)})
            </span>
            <Icon name={open ? 'x' : 'chevL'} className={`h-4 w-4 ${open ? '' : '-rotate-90'}`} />
          </button>
          {open && (
            <div className="mt-2 grid gap-2.5">
              {month.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function InstallHint() {
  const { t } = useApp();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = (navigator as unknown as { standalone?: boolean }).standalone || window.matchMedia('(display-mode: standalone)').matches;
      setShow(ios && !standalone && localStorage.getItem('pakpt.installHint') !== '0');
    } catch {
      setShow(false);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="card flex items-center gap-2 p-3 text-[12.5px]">
      <Icon name="download" className="h-4 w-4 shrink-0 text-emerald" />
      <span className="flex-1">{t.install}</span>
      <button
        type="button"
        aria-label={t.close}
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem('pakpt.installHint', '0');
          } catch {
            /* ignore */
          }
        }}
        className="text-muted"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}
