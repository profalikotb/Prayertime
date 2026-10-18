'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon, Seg } from './ui';
import { AZKAR, textFor, type Session } from '@/data/azkar';
import { loadQuran, type QuranData } from '@/lib/quran';
import { addDays, key } from '@/lib/civil';

const STORE = 'pakpt.azkar.v1';

/** Morning adhkar from Fajr until Asr; evening adhkar from Asr until the next Fajr. */
export default function AzkarCard() {
  const { s, f, today, times, now } = useApp();
  const ar = s.lang === 'ar';
  const auto: Session = now >= times.today.asr || now < times.today.fajr ? 'evening' : 'morning';
  const [session, setSession] = useState<Session>(auto);
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [qd, setQd] = useState<QuranData | null>(null);
  // the evening session that starts after midnight still belongs to the previous day
  const sessionKey = `${key(now < times.today.fajr ? addDays(today, -1) : today)}-${session}`;

  useEffect(() => setSession(auto), [auto]);
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(STORE) || '{}');
      setCounts(all[sessionKey] || {});
    } catch {
      setCounts({});
    }
  }, [sessionKey]);
  useEffect(() => {
    if (open && !qd) loadQuran().then(setQd).catch(() => undefined);
  }, [open, qd]);

  const items = useMemo(() => AZKAR.filter((d) => d.sessions.includes(session)), [session]);
  const total = items.reduce((a, d) => a + d.count, 0);
  const doneN = items.reduce((a, d) => a + Math.min(d.count, counts[d.id] || 0), 0);
  const complete = doneN >= total;

  const bump = (id: string, max: number) => {
    const n = Math.min(max, (counts[id] || 0) + 1);
    const next = { ...counts, [id]: n };
    setCounts(next);
    try {
      const all = JSON.parse(localStorage.getItem(STORE) || '{}');
      all[sessionKey] = next;
      for (const k of Object.keys(all).sort().slice(0, -14)) delete all[k];
      localStorage.setItem(STORE, JSON.stringify(all));
    } catch {
      /* ignore */
    }
    try {
      navigator.vibrate?.(n === max ? [30, 40, 30] : 10);
    } catch {
      /* ignore */
    }
  };

  const title = session === 'morning' ? (ar ? 'أذكار الصباح' : 'Morning adhkar') : ar ? 'أذكار المساء' : 'Evening adhkar';

  return (
    <Card
      title={title}
      icon={session === 'morning' ? 'sunrise' : 'moon'}
      action={
        <span className={`chip ${complete ? 'bg-emerald/15 text-emerald' : 'bg-gold/15 text-gold'}`}>
          {complete ? '✓ ' : ''}
          {f.n(Math.round((doneN / total) * 100))}٪
        </span>
      }
    >
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${(doneN / total) * 100}%` }} />
      </div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 w-full rounded-xl bg-emerald/10 py-2.5 text-[14px] font-bold text-emerald">
          {complete ? (ar ? 'عرض الأذكار' : 'Show adhkar') : ar ? `ابدأ ${title}` : `Start ${title.toLowerCase()}`}
        </button>
      ) : (
        <>
          <div className="mt-3">
            <Seg
              value={session}
              onChange={setSession}
              options={[
                { v: 'morning', l: ar ? 'الصباح' : 'Morning' },
                { v: 'evening', l: ar ? 'المساء' : 'Evening' },
              ]}
            />
          </div>
          <ul className="mt-3 grid gap-2.5">
            {items.map((d) => {
              const c = counts[d.id] || 0;
              const fin = c >= d.count;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => bump(d.id, d.count)}
                    className={`w-full rounded-xl border p-3 text-start transition active:scale-[.99] ${fin ? 'border-emerald/40 bg-emerald/5 opacity-70' : 'border-line/10 bg-surface'}`}
                  >
                    <div dir="rtl" lang="ar" className="font-quran text-[20px] leading-[2]">
                      {d.surahs
                        ? qd
                          ? d.surahs.map((sn) => (
                              <p key={sn} className="mb-1">
                                <span className="text-[13px] font-sans font-bold text-gold">سورة {qd.surahs[sn - 1][0]} </span>
                                {qd.verses[sn - 1].map((v, i) => (
                                  <span key={i}>
                                    {v} <span className="text-gold">﴿{f.n(i + 1)}﴾</span>{' '}
                                  </span>
                                ))}
                              </p>
                            ))
                          : (ar ? 'جارٍ تحميل نص المصحف…' : 'Loading…')
                        : textFor(d, session)}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`tnum rounded-full px-2.5 py-0.5 text-[13px] font-extrabold ${fin ? 'bg-emerald text-white' : 'bg-gold/15 text-gold'}`}>
                        {fin ? '✓' : `${f.n(c)} / ${f.n(d.count)}`}
                      </span>
                      <span className="flex-1 text-[11.5px] leading-5 text-muted">{d.virtue}</span>
                    </div>
                    <p className="mt-1 text-[10.5px] text-muted">{d.ref}</p>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setOpen(false)} className="mt-2 flex w-full items-center justify-center gap-1 py-1.5 text-[12.5px] font-bold text-muted">
            <Icon name="x" className="h-3.5 w-3.5" />
            {ar ? 'إخفاء' : 'Hide'}
          </button>
        </>
      )}
      <p className="mt-1 text-[10.5px] text-muted">
        {ar ? 'اضغط على الذكر لعدّه. الصباح من الفجر حتى العصر، والمساء من العصر حتى الفجر.' : 'Tap a dhikr to count it. Morning: Fajr–Asr; evening: Asr–Fajr.'}
      </p>
    </Card>
  );
}
