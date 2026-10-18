'use client';
import type { ReactNode } from 'react';
import type { HijriStatus, PrayerKey, Profile } from '@/lib/types';
import { useApp } from './ctx';

type IconName =
  | 'pin'
  | 'today'
  | 'calendar'
  | 'compass'
  | 'gear'
  | 'chevL'
  | 'chevR'
  | 'moon'
  | 'sun'
  | 'sunrise'
  | 'sunset'
  | 'bell'
  | 'book'
  | 'star'
  | 'refresh'
  | 'info'
  | 'download'
  | 'wifiOff'
  | 'check'
  | 'x';

const PATHS: Record<IconName, ReactNode> = {
  pin: <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  chevL: <path d="m15 18-6-6 6-6" />,
  chevR: <path d="m9 18 6-6-6-6" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  sunrise: (
    <>
      <path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 3v6M8.5 6.5 12 3l3.5 3.5" />
      <path d="M3.5 21h17" />
    </>
  ),
  sunset: (
    <>
      <path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 3v6M8.5 5.5 12 9l3.5-3.5" />
      <path d="M3.5 21h17" />
    </>
  ),
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Zm4 11a2 2 0 0 0 4 0" />,
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />,
  star: <path d="m12 2.5 2.2 4.9 5.3.6-4 3.6 1.2 5.3L12 14.2 7.3 16.9l1.2-5.3-4-3.6 5.3-.6L12 2.5Z" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.5" />
    </>
  ),
  download: <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16" />,
  wifiOff: <path d="m3 3 18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.7M19 13a10 10 0 0 0-2.6-1.8M2 9.5a15 15 0 0 1 4.5-2.9M22 9.5A15 15 0 0 0 11 5.1M12 20h.01" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Icon({ name, className = 'h-5 w-5', fill = false }: { name: IconName; className?: string; fill?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function PrayerIcon({ k, className }: { k: PrayerKey; className?: string }) {
  const map: Record<PrayerKey, IconName> = { fajr: 'star', sunrise: 'sunrise', dhuhr: 'sun', asr: 'today', maghrib: 'sunset', isha: 'moon' };
  return <Icon name={map[k]} className={className} />;
}

export function Card({ children, className = '', title, icon, action }: { children: ReactNode; className?: string; title?: string; icon?: IconName; action?: ReactNode }) {
  return (
    <section className={`card fade-in p-4 ${className}`}>
      {title && (
        <header className="mb-3 flex items-center gap-2">
          {icon && (
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald/10 text-emerald">
              <Icon name={icon} className="h-4 w-4" />
            </span>
          )}
          <h2 className="flex-1 text-[15px] font-bold leading-6">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusChip({ status, profile, small = false, onDark = false }: { status: HijriStatus; profile: Profile; small?: boolean; onDark?: boolean }) {
  const { t } = useApp();
  const label = status === 'official' ? t.official : status === 'user' ? t.userAdjusted : profile === 'SA' ? t.umalqura : t.calculated;
  const cls = onDark
    ? 'bg-white/15 text-[#f7e7b8]'
    : status === 'official'
      ? 'bg-emerald/10 text-emerald'
      : status === 'user'
        ? 'bg-gold/15 text-gold'
        : 'bg-ink/5 text-muted';
  return (
    <span className={`chip ${cls} ${small ? '!px-1.5 !text-[10px] !leading-4' : ''}`}>
      {status === 'official' && <Icon name="check" className="h-3 w-3" />}
      {label}
    </span>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink/80">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-2.5 text-start">
      <span className="text-[13px] font-semibold text-ink/80">{label}</span>
      <span className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-emerald' : 'bg-ink/15'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'start-6' : 'start-1'}`} />
      </span>
    </button>
  );
}

/** Crescent + star mark used in the hero and icons. */
export function Crescent({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="cg" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff3cf" />
          <stop offset=".55" stopColor="#e8c77a" />
          <stop offset="1" stopColor="#b8892e" />
        </radialGradient>
        <mask id="cm">
          <rect width="120" height="120" fill="#fff" />
          <circle cx="74" cy="48" r="38" fill="#000" />
        </mask>
      </defs>
      <circle cx="58" cy="60" r="44" fill="url(#cg)" mask="url(#cm)" />
      <path d="M92 70l2.6 5.6 6 .7-4.5 4 1.2 6L92 83.4 86.7 86.3l1.2-6-4.5-4 6-.7z" fill="#e8c77a" opacity=".9" />
    </svg>
  );
}

export function refEn(r: string): string {
  const books: [RegExp, string][] = [
    [/صحيح البخاري/g, 'Sahih al-Bukhari'],
    [/صحيح مسلم/g, 'Sahih Muslim'],
    [/سنن أبي داود/g, 'Sunan Abi Dawud'],
    [/جامع الترمذي/g, "Jami' al-Tirmidhi"],
    [/سنن النسائي/g, "Sunan al-Nasa'i"],
    [/سنن ابن ماجه/g, 'Sunan Ibn Majah'],
    [/^الجمعة/, "Qur'an 62:"],
    [/^البقرة/, "Qur'an 2:"],
    [/^الحج/, "Qur'an 22:"],
    [/^الكوثر/, "Qur'an 108:"],
    [/^القدر/, "Qur'an 97:"],
    [/^التوبة/, "Qur'an 9:"],
    [/^الإسراء/, "Qur'an 17:"],
    [/\(حسن\)/g, '(hasan)'],
    [/متفق عليه/g, 'Agreed upon'],
  ];
  let s = r;
  for (const [re, v] of books) s = s.replace(re, v);
  s = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/–/g, '–').replace(/،/g, ',');
  s = s.replace(/:\s+/g, ':');
  s = s.replace(/\s*\([^)]*[؀-ۿ][^)]*\)/g, '');
  const cut = s.search(/,\s*[^,]*[؀-ۿ]/);
  if (cut > 0) s = s.slice(0, cut);
  return s.trim();
}
