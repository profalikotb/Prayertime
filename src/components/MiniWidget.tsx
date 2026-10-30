'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from './ctx';
import { Icon } from './ui';
import { PRAYER_NAMES } from '@/lib/i18n';
import { weekday } from '@/lib/civil';
import type { PrayerKey } from '@/lib/types';

/**
 * Desktop widget.
 *  • Chrome / Edge 116+: a real always-on-top floating window (Document Picture-in-Picture) that stays
 *    above every app while you work. The app tab keeps running, so the 5-minute reminder and the Adhan play too.
 *  • Other browsers: a small separate popup window showing the same compact view (#mini).
 */
type PipApi = { requestWindow: (o: { width: number; height: number; disallowReturnToOpener?: boolean }) => Promise<Window> };
const pipApi = (): PipApi | null => (typeof window !== 'undefined' && (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture) || null;

export function pipSupported() {
  return !!pipApi();
}

const KEYS: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** The compact widget body — used inside the floating window and the #mini popup. */
export function MiniBody({ onClose }: { onClose?: () => void }) {
  const { s, f, ps, now, times, today, hijri, place } = useApp();
  const ar = s.lang === 'ar';
  const names = PRAYER_NAMES[s.lang];
  const fri = weekday(today) === 5;
  const label = (k: PrayerKey) => (k === 'dhuhr' && fri ? (ar ? 'الجمعة' : 'Jumuʿa') : names[k]);
  const remaining = ps.next.at.getTime() - now.getTime();
  const soon = remaining <= 15 * 60000;
  const span = ps.next.at.getTime() - ps.prev.at.getTime();
  const frac = span > 0 ? Math.min(1, Math.max(0, 1 - remaining / span)) : 0;
  const nt = f.timeParts(ps.next.at);
  return (
    <div dir={ar ? 'rtl' : 'ltr'} lang={s.lang} className="flex h-[100dvh] flex-col bg-gradient-to-b from-[#0b3b33] to-[#06171c] p-3 font-sans text-[#f4ecd8]">
      <div className="flex items-center gap-2 text-[11.5px] text-white/70">
        <Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-[#e8c77a]" />
        <span className="min-w-0 flex-1 truncate">
          {place.city[s.lang]} · {f.hDate(hijri)}
        </span>
        {onClose && (
          <button type="button" onClick={onClose} className="grid h-6 w-6 place-items-center rounded-full bg-white/10" aria-label={ar ? 'إغلاق' : 'Close'}>
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-white/60">{ps.next.key === 'sunrise' ? (ar ? 'التالي' : 'Next') : ar ? 'الصلاة القادمة' : 'Next prayer'}</p>
          <p className={`font-display text-[30px] font-bold leading-none ${soon ? 'text-[#ff9f6b]' : 'text-[#f7e7b8]'}`}>{label(ps.next.key)}</p>
          <p className="mt-1 text-[12px] text-white/70">
            <span className="tnum">{nt.hm}</span> {nt.ap}
          </p>
        </div>
        <div className="text-end">
          <p className="text-[11px] text-white/60">{ar ? 'بعد' : 'in'}</p>
          <p className="tnum text-[30px] font-extrabold leading-none" dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {f.countdown(remaining)}
          </p>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#e8c77a]" style={{ width: `${frac * 100}%` }} />
      </div>
      <ul className="mt-2.5 grid flex-1 content-start gap-1">
        {KEYS.map((k) => {
          const t = ps.next.tomorrow ? times.tomorrow[k] : times.today[k];
          const on = k === ps.next.key;
          const passed = !ps.next.tomorrow && t.getTime() <= now.getTime();
          const tp = f.timeParts(t);
          return (
            <li
              key={k}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1 text-[14px] font-bold ${on ? 'bg-[#e8c77a]/20 text-[#f7e7b8]' : passed ? 'text-white/40' : 'text-white/90'} ${k === 'sunrise' ? 'text-[12px] font-semibold' : ''}`}
            >
              <span>{label(k)}</span>
              <span className="tnum">
                {tp.hm} <span className="text-[11px] font-semibold opacity-70">{tp.ap}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Copies the app's CSS (Tailwind, fonts) and theme attributes into the floating window. */
function cloneStyles(target: Document) {
  for (const node of Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))) target.head.appendChild(node.cloneNode(true));
  const html = target.documentElement;
  html.dataset.theme = document.documentElement.dataset.theme ?? 'dark';
  html.style.background = '#06171c';
  target.body.style.margin = '0';
  target.title = document.documentElement.lang === 'en' ? 'Prayer times' : 'مواقيت الصلاة';
}

/** Button + floating window host. */
export function DesktopWidgetButton({ className = '' }: { className?: string }) {
  const { s } = useApp();
  const ar = s.lang === 'ar';
  const [pip, setPip] = useState<Window | null>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    // computers only (no coarse touch pointer, wide screen) — phones have their own widgets
    setDesktop(!window.matchMedia('(pointer: coarse)').matches && window.innerWidth >= 900);
  }, []);
  useEffect(() => {
    if (!pip) return;
    const closed = () => setPip(null);
    pip.addEventListener('pagehide', closed);
    return () => pip.removeEventListener('pagehide', closed);
  }, [pip]);

  if (!desktop) return null;

  const open = async () => {
    if (pip) return pip.focus();
    const api = pipApi();
    if (api) {
      try {
        const w = await api.requestWindow({ width: 300, height: 380, disallowReturnToOpener: false });
        cloneStyles(w.document);
        setPip(w);
        return;
      } catch {
        /* fall through to popup */
      }
    }
    window.open(`${location.origin}/#mini`, 'pakpt-mini', 'popup=yes,width=320,height=420,left=40,top=40');
  };

  return (
    <>
      <button type="button" onClick={open} className={`flex items-center gap-1.5 rounded-full border border-line/10 bg-surface px-3 py-1.5 text-[13px] font-bold text-emerald shadow-sm ${className}`}>
        <Icon name="today" className="h-4 w-4" />
        {pip ? (ar ? 'الويدجت مفتوح' : 'Widget open') : ar ? 'ويدجت سطح المكتب' : 'Desktop widget'}
      </button>
      {pip && createPortal(<MiniBody onClose={() => pip.close()} />, pip.document.body)}
    </>
  );
}
