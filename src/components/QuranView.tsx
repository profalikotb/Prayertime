'use client';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon } from './ui';
import { goldenQuranUrl, loadQuran, searchQuran, type QuranData } from '@/lib/quran';

const SUGGEST = ['الرحمن الرحيم', 'الصبر', 'الشفاء', 'رب اشرح لي صدري', 'الجنة', 'التوبة', 'الصراط المستقيم'];
const LAST_KEY = 'pakpt.quranQuery';

export default function QuranView() {
  const { s, f } = useApp();
  const ar = s.lang === 'ar';
  const [qd, setQd] = useState<QuranData | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(60);
  const [copied, setCopied] = useState<string | null>(null);
  const dq = useDeferredValue(q);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setQ(localStorage.getItem(LAST_KEY) ?? '');
    } catch {
      /* ignore */
    }
    loadQuran()
      .then(setQd)
      .catch(() => setErr(true));
    const id = setTimeout(() => input.current?.focus(), 150);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    setLimit(60);
    try {
      localStorage.setItem(LAST_KEY, dq);
    } catch {
      /* ignore */
    }
  }, [dq]);

  const res = useMemo(() => (qd ? searchQuran(dq, limit) : null), [qd, dq, limit]);

  const copy = async (text: string, ref: string, id: string) => {
    try {
      await navigator.clipboard.writeText(`﴿${text}﴾ [${ref}]`);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="safe-top mx-auto grid max-w-3xl gap-3">
      <div className="sticky top-0 z-20 -mx-3 bg-bg/90 px-3 pb-2 pt-1 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <h1 className="mb-2 px-1 font-display text-[24px] font-bold text-emerald">{ar ? 'البحث في القرآن الكريم' : 'Search the Holy Qurʾan'}</h1>
        <div className="relative">
          <input
            ref={input}
            type="text"
            dir="rtl"
            lang="ar"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ar ? 'اكتب كلمة أو جزءًا من آية…' : 'Type an Arabic word or part of a verse…'}
            className="w-full rounded-2xl border border-line/15 bg-surface py-3.5 pe-11 ps-4 text-[17px] font-semibold shadow-sm outline-none focus:border-emerald"
          />
          {q && (
            <button
              type="button"
              aria-label={ar ? 'مسح' : 'Clear'}
              onClick={() => {
                setQ('');
                input.current?.focus();
              }}
              className="absolute end-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-ink/10 text-muted"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </div>
        {res && res.total > 0 && (
          <p className="mt-2 px-1 text-[12.5px] font-semibold text-muted">
            {ar ? (
              <>
                <b className="text-emerald">{f.n(res.total)}</b> آية
                {dq.trim().split(/\s+/).length === 1 && res.occurrences > res.total && <> · {f.n(res.occurrences)} موضعًا</>}
              </>
            ) : (
              <>
                <b className="text-emerald">{res.total}</b> verses
                {dq.trim().split(/\s+/).length === 1 && res.occurrences > res.total && <> · {res.occurrences} occurrences</>}
              </>
            )}
          </p>
        )}
      </div>

      {err && (
        <Card>
          <p className="text-[13px] text-gold">{ar ? 'تعذّر تحميل نص المصحف. تحقّق من الاتصال ثم أعد فتح الصفحة.' : 'Could not load the Qurʾan text. Check your connection and reopen.'}</p>
        </Card>
      )}
      {!qd && !err && (
        <p className="flex items-center justify-center gap-2 py-6 text-[13px] text-muted">
          <Icon name="refresh" className="h-4 w-4 animate-spin" />
          {ar ? 'جارٍ تحميل المصحف (مرة واحدة ثم يعمل دون إنترنت)…' : 'Loading the mushaf (once, then works offline)…'}
        </p>
      )}

      {qd && dq.trim().length < 2 && (
        <Card>
          <p className="mb-2 text-[13px] text-muted">{ar ? 'أمثلة:' : 'Try:'}</p>
          <div className="flex flex-wrap gap-2">
            {SUGGEST.map((x) => (
              <button key={x} type="button" onClick={() => setQ(x)} className="rounded-full bg-emerald/10 px-3 py-1.5 text-[14px] font-semibold text-emerald">
                {x}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] leading-5 text-muted">
            {ar
              ? 'يتجاهل البحث التشكيل والهمزات ويفهم الرسم العثماني (الصلوٰة = الصلاة، السمٰوٰت = السماوات). كل نتيجة تفتح الآية في المصحف الذهبي.'
              : 'Search ignores diacritics and hamza forms and understands Uthmani spelling. Each result opens the verse in Golden Quran.'}
          </p>
        </Card>
      )}

      {qd && res && dq.trim().length >= 2 && res.total === 0 && (
        <Card>
          <p className="text-[13px] text-muted">{ar ? 'لا توجد نتائج. جرّب جزءًا أقصر من الكلمة.' : 'No results. Try a shorter part of the word.'}</p>
        </Card>
      )}

      {qd && res && res.hits.length > 0 && (
        <ul className="grid gap-2.5">
          {res.hits.map((h) => {
            const id = `${h.s}:${h.a}`;
            const name = qd.surahs[h.s - 1][0];
            const ref = ar ? `${name} ${f.n(h.a)}` : `${qd.surahs[h.s - 1][1]} ${h.s}:${h.a}`;
            const marks = new Set(h.marks);
            return (
              <li key={id} className="card fade-in p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="chip bg-emerald/10 text-emerald">
                    {ar ? `سورة ${name}` : qd.surahs[h.s - 1][1]} · {ar ? `الآية ${f.n(h.a)}` : `${h.s}:${h.a}`}
                  </span>
                  {h.phrase && <span className="chip bg-gold/15 text-gold">{ar ? 'تطابق تام' : 'Exact'}</span>}
                </div>
                <p dir="rtl" lang="ar" className="text-justify font-quran text-[23px] leading-[2.15]">
                  {h.words.map((w, i) => (
                    <span key={i}>
                      {marks.has(i) ? <mark className="rounded bg-gold/25 px-0.5 text-inherit">{w}</mark> : w}{' '}
                    </span>
                  ))}
                  <span className="text-gold">﴿{f.n(h.a)}﴾</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={goldenQuranUrl(h.s, h.a)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-emerald px-3 py-1.5 text-[12.5px] font-bold text-white"
                  >
                    <Icon name="book" className="h-4 w-4" />
                    {ar ? 'المصحف الذهبي' : 'Golden Quran'}
                  </a>
                  <button type="button" onClick={() => copy(h.text, ref, id)} className="rounded-lg bg-ink/5 px-3 py-1.5 text-[12.5px] font-bold text-ink/80">
                    {copied === id ? (ar ? '✓ نُسخت' : '✓ Copied') : ar ? 'نسخ' : 'Copy'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {res && res.total > res.hits.length && (
        <button type="button" onClick={() => setLimit(limit + 100)} className="mx-auto rounded-xl bg-emerald/10 px-5 py-2.5 text-[13px] font-bold text-emerald">
          {ar ? `عرض المزيد (${f.n(res.total - res.hits.length)})` : `Show more (${res.total - res.hits.length})`}
        </button>
      )}

      <p className="px-1 pb-2 text-center text-[10.5px] leading-4 text-muted">
        {ar
          ? 'النص: مصحف المدينة النبوية – مجمع الملك فهد (QuranEnc) · البحث يتم على الجهاز ويعمل دون إنترنت'
          : 'Text: Madinah Mushaf – King Fahd Complex (QuranEnc) · search runs on-device and offline'}
      </p>
    </div>
  );
}
