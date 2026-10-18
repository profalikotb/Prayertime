'use client';
import { useState } from 'react';
import type { HistEvent } from '@/data/history';
import { useApp } from './ctx';

export default function EventCard({ e }: { e: HistEvent }) {
  const { s, t, f } = useApp();
  const [open, setOpen] = useState(false);
  const L = s.lang;
  const year = e.yLabel ? e.yLabel[L] : e.y < 0 ? f.n(L === 'ar' ? `${-e.y} ق.هـ` : `${-e.y} BH`) : f.n(L === 'ar' ? `${e.y} هـ` : `${e.y} AH`);
  const hijri = e.d ? `${f.n(e.d)} ${f.hMonth(e.m)} ${year}` : `${f.hMonth(e.m)} ${year}`;
  const wiki = `https://${L}.wikipedia.org/w/index.php?search=${encodeURIComponent(e.title[L].replace(/\(.*?\)/g, ''))}`;
  return (
    <article className="rounded-xl border border-line/10 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip bg-emerald/10 text-emerald">{hijri}</span>
        {e.gregorian && <span className="chip bg-ink/5 text-muted">{e.gregorian[L]}</span>}
        {e.disputed && <span className="chip bg-gold/15 text-gold">{t.disputed}</span>}
      </div>
      <h3 className="mt-2 text-[14.5px] font-bold leading-6">{e.title[L]}</h3>
      <p className="mt-1 text-[13px] leading-6 text-ink/80">{e.summary[L]}</p>
      {open && (
        <div className="fade-in mt-2 grid gap-2 text-[12.5px] leading-6">
          <p>
            <b className="text-emerald">{t.significanceLbl}: </b>
            {e.significance[L]}
          </p>
          {e.note && (
            <p className="rounded-lg border border-gold/30 bg-gold/5 p-2">
              <b className="text-gold">{t.disputed}: </b>
              {e.note[L]}
            </p>
          )}
          <p className="text-[11.5px] text-muted">
            <b>{t.source}: </b>
            {e.sources.join(' · ')}
          </p>
          <a href={wiki} target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold text-emerald underline underline-offset-4">
            Wikipedia ↗
          </a>
        </div>
      )}
      <button type="button" onClick={() => setOpen(!open)} className="mt-1.5 text-[12px] font-bold text-gold">
        {open ? t.less : t.readMore}
      </button>
    </article>
  );
}
