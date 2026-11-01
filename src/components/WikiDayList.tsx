'use client';
import { useState } from 'react';
import { useApp } from './ctx';
import { Icon } from './ui';
import { useWikiDay, wikiDayUrl, type WikiItem } from '@/lib/wikiDay';

/**
 * «من ويكيبيديا العربية» — all events / deaths recorded for this Hijri day.
 * Clearly separated from the curated list: external, not individually verified, linked to the source page.
 */
export default function WikiDayList({ m, d, compact = false }: { m: number; d: number; compact?: boolean }) {
  const { s, f, online } = useApp();
  const ar = s.lang === 'ar';
  const { loading, data, failed } = useWikiDay(m, d);
  const [all, setAll] = useState(false);
  const url = data?.url ?? wikiDayUrl(m, d);

  const sections: [string, WikiItem[]][] = data
    ? [
        [ar ? 'أحداث' : 'Events', data.events],
        [ar ? 'وفيات' : 'Deaths', data.deaths],
        [ar ? 'مواليد' : 'Births', data.births],
      ]
    : [];
  const total = sections.reduce((n, [, l]) => n + l.length, 0);
  const limit = compact && !all ? 4 : all ? 999 : 12;

  return (
    <div className="mt-3 rounded-xl border border-line/10 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-ink/5 text-[11px] font-black">W</span>
        <p className="flex-1 text-[13px] font-extrabold">
          {ar ? `من ويكيبيديا العربية — ${f.n(d)} ${f.hMonth(m)}` : `From Arabic Wikipedia — ${d} ${f.hMonth(m)}`}
          {total > 0 && <span className="ms-1 text-[11.5px] font-semibold text-muted">({f.n(total)})</span>}
        </p>
      </div>

      {loading && <p className="text-[12px] text-muted">{ar ? 'جارٍ التحميل…' : 'Loading…'}</p>}
      {!loading && (failed || total === 0) && (
        <p className="text-[12px] text-muted">
          {!online ? (ar ? 'يحتاج اتصالًا بالإنترنت.' : 'Needs an internet connection.') : ar ? 'لا توجد قائمة لهذا اليوم في ويكيبيديا.' : 'No list for this day on Wikipedia.'}
        </p>
      )}

      {sections.map(([name, list]) => {
        if (!list.length) return null;
        let shown = 0;
        return (
          <div key={name} className="mt-2">
            <p className="text-[12px] font-bold text-emerald">{name}</p>
            <ul className="mt-1 grid gap-1">
              {list.slice(0, limit).map((e, i) => {
                shown++;
                return (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-6">
                    {e.year && <span className="tnum shrink-0 font-bold text-gold">{f.n(e.year)}</span>}
                    <span className="text-ink/85">{e.text}</span>
                  </li>
                );
              })}
            </ul>
            {list.length > shown && !all && <p className="text-[11px] text-muted">{ar ? `+ ${f.n(list.length - shown)} أخرى` : `+ ${list.length - shown} more`}</p>}
          </div>
        );
      })}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {total > limit && !all && (
          <button type="button" onClick={() => setAll(true)} className="text-[12px] font-bold text-emerald">
            {ar ? 'عرض الكل' : 'Show all'}
          </button>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] font-bold text-emerald underline underline-offset-4">
          {ar ? 'صفحة اليوم في ويكيبيديا' : 'Open on Wikipedia'} ↗
        </a>
      </div>
      <p className="mt-1.5 flex items-start gap-1 text-[10.5px] leading-4 text-muted">
        <Icon name="info" className="mt-px h-3 w-3 shrink-0" />
        {ar
          ? 'مصدر خارجي مفتوح لم تُراجَع وقائعه واحدةً واحدة؛ القائمة المحققة بمصادرها أعلاه. قد يختلف التاريخ يومًا لاختلاف الرؤية.'
          : 'Open external source, not individually verified; the curated, sourced list is above. Dates may differ by a day.'}
      </p>
    </div>
  );
}
