'use client';
import { useState } from 'react';
import { useApp } from './ctx';
import { Seg, StatusChip } from './ui';
import { addDays } from '@/lib/civil';
import { offsetForConfirmed, umalqura } from '@/lib/hijri';

/** Hijri correction control: Auto / −1 / 0 / +1, plus "confirm today's announced date". */
export default function HijriAdjust() {
  const { t, f, s, set, profile, today, hijri } = useApp();
  const [picking, setPicking] = useState(false);
  const cur = s.hijriOffset[profile];
  const value = cur === null ? 'auto' : String(cur);
  const label = profile === 'EG' ? t.egypt : profile === 'SA' ? t.saudi : t.other;

  const setOffset = (v: number | null, confirmed = false) =>
    set((x) => ({
      ...x,
      hijriOffset: { ...x.hijriOffset, [profile]: v },
      hijriConfirmedAt: { ...x.hijriConfirmedAt, [profile]: confirmed ? new Date().toISOString() : null },
    }));

  const candidates = [-2, -1, 0, 1, 2].map((k) => umalqura(addDays(today, k)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12px] text-muted">
          {t.adjFor} <b className="text-ink/80">{label}</b>
        </p>
        <StatusChip status={hijri.status} profile={profile} small />
      </div>
      <Seg
        value={value}
        label={t.hijriAdjust}
        onChange={(v) => setOffset(v === 'auto' ? null : Number(v))}
        options={[
          { v: 'auto', l: t.auto },
          { v: '-2', l: f.n('−2') },
          { v: '-1', l: f.n('−1') },
          { v: '0', l: f.n('0') },
          { v: '1', l: f.n('+1') },
          { v: '2', l: f.n('+2') },
        ]}
      />
      {cur !== null && Math.abs(cur) > 2 && <p className="mt-1 text-[11px] text-gold">{f.n(cur > 0 ? `+${cur}` : cur)}</p>}
      <p className="mt-1.5 text-[11px] leading-5 text-muted">
        {s.lang === 'ar'
          ? 'التصحيح يُطبّق على كل ما يعتمد على التاريخ الهجري: الأحداث، العدّادات، عشاء رمضان في أم القرى. التواريخ المحسوبة قد تختلف عن رؤية الهلال المعلنة محليًا.'
          : 'Applied everywhere Hijri-dependent: events, countdowns, the Ramadan Isha rule. Calculated dates may differ from locally announced sightings.'}
      </p>
      <button type="button" onClick={() => setPicking(!picking)} className="mt-2 text-[12.5px] font-bold text-emerald">
        {t.confirmDate}
      </button>
      {picking && (
        <div className="fade-in mt-2 rounded-xl bg-emerald/5 p-3">
          <p className="mb-2 text-[12px] leading-5 text-muted">{t.confirmHint}</p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((h) => {
              const sel = h.y === hijri.y && h.m === hijri.m && h.d === hijri.d;
              return (
                <button
                  key={`${h.y}-${h.m}-${h.d}`}
                  type="button"
                  onClick={() => {
                    const k = offsetForConfirmed(today, h);
                    if (k === null) return alert(t.outOfRange);
                    setOffset(k, true);
                    setPicking(false);
                  }}
                  className={`rounded-lg border px-2.5 py-2 text-[13px] font-bold ${sel ? 'border-emerald bg-emerald text-white' : 'border-line/15 bg-surface'}`}
                >
                  {f.hDate(h)}
                </button>
              );
            })}
          </div>
          {s.hijriConfirmedAt[profile] && (
            <p className="mt-2 text-[11px] text-muted">
              ✓ {f.gShort(todayFromIso(s.hijriConfirmedAt[profile] as string))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function todayFromIso(iso: string) {
  const d = new Date(iso);
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}
