'use client';
/**
 * Monthly / yearly prayer timetable («إمساكية») for the current place and settings:
 * every day with Hijri date, Fajr · Sunrise · Dhuhr · Asr · Maghrib · Isha.
 * Print / PDF (A4, one month per page) and CSV (Excel) export.
 */
import { useMemo, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon } from './ui';
import { addDays, sameDay, weekday } from '@/lib/civil';
import { hijriFor } from '@/lib/hijri';
import { computeDay } from '@/lib/prayer';
import { PRAYER_NAMES } from '@/lib/i18n';
import type { CivilDate } from '@/lib/types';

const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const GM_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const GM_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

interface Row {
  c: CivilDate;
  wd: number;
  hijri: string;
  hijriFirst: boolean;
  t: Record<(typeof KEYS)[number], string>;
}

export default function Timetable() {
  const { s, f, today, place, opts, hctx } = useApp();
  const ar = s.lang === 'ar';
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [ym, setYm] = useState({ y: today.y, m: today.m });
  const names = PRAYER_NAMES[s.lang];
  const hm = (d: Date) => {
    const p = f.timeParts(d);
    return p.hm;
  };

  const monthRows = (y: number, m: number): Row[] => {
    const out: Row[] = [];
    for (let d = 1; d <= daysIn(y, m); d++) {
      const c = { y, m, d };
      const t = computeDay(c, place, opts(c));
      const h = hijriFor(c, hctx);
      out.push({
        c,
        wd: weekday(c),
        hijri: f.n(`${h.d} ${f.hMonth(h.m)}`),
        hijriFirst: h.d === 1 || d === 1,
        t: Object.fromEntries(KEYS.map((k) => [k, hm(t[k])])) as Row['t'],
      });
    }
    return out;
  };

  const rows = useMemo(() => monthRows(ym.y, ym.m), [ym.y, ym.m, place, s, hctx]); // eslint-disable-line react-hooks/exhaustive-deps
  const gm = ar ? GM_AR : GM_EN;
  const wdn = ar ? WD_AR : WD_EN;
  const ap = ar ? ['ص', 'م'] : ['AM', 'PM'];
  const apFor = (k: (typeof KEYS)[number]) => (k === 'fajr' || k === 'sunrise' ? ap[0] : k === 'dhuhr' ? '' : ap[1]);
  const city = place.city[s.lang];

  const step = (dir: number) => {
    if (mode === 'year') return setYm({ y: ym.y + dir, m: ym.m });
    const m = ym.m + dir;
    setYm(m < 1 ? { y: ym.y - 1, m: 12 } : m > 12 ? { y: ym.y + 1, m: 1 } : { y: ym.y, m });
  };

  /* ---------- export ---------- */
  const months = () => (mode === 'year' ? Array.from({ length: 12 }, (_, i) => ({ y: ym.y, m: i + 1 })) : [ym]);

  const printHtml = () => {
    const head = KEYS.map((k) => `<th>${names[k]}<small>${apFor(k)}</small></th>`).join('');
    const pages = months()
      .map(({ y, m }) => {
        const r = monthRows(y, m)
          .map(
            (x) =>
              `<tr class="${x.wd === 5 ? 'fri' : ''}${sameDay(x.c, today) ? ' now' : ''}"><td>${f.n(`${pad(x.c.d)}/${pad(m)}`)}</td><td>${wdn[x.wd]}</td><td class="h${x.hijriFirst ? ' hf' : ''}">${x.hijri}</td>${KEYS.map((k) => `<td class="${k === 'sunrise' ? 'sr' : ''}">${x.t[k]}</td>`).join('')}</tr>`,
          )
          .join('');
        return `<section><header><h1>${ar ? 'مواقيت الصلاة' : 'Prayer Times'} — ${gm[m - 1]} ${f.n(y)}</h1><p>${city} · ${ar ? 'أ.د. على قطب' : 'Prof Ali Kotb'}</p></header><table><thead><tr><th>${ar ? 'التاريخ' : 'Date'}</th><th>${ar ? 'اليوم' : 'Day'}</th><th>${ar ? 'الهجري' : 'Hijri'}</th>${head}</tr></thead><tbody>${r}</tbody></table></section>`;
      })
      .join('');
    return `<!doctype html><html lang="${s.lang}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ar ? 'مواقيت الصلاة' : 'Prayer Times'} ${mode === 'year' ? f.n(ym.y) : `${gm[ym.m - 1]} ${f.n(ym.y)}`}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:10mm}
*{box-sizing:border-box}body{margin:0;font-family:Cairo,system-ui,sans-serif;color:#10231f;background:#fff}
section{page-break-after:always;padding:4mm 2mm}section:last-child{page-break-after:auto}
header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #0e8a6a;margin-bottom:3mm}
h1{font-size:17pt;font-weight:900;color:#0e8a6a;margin:0}header p{margin:0;font-size:9.5pt;color:#b08a2e;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:9.6pt;font-variant-numeric:tabular-nums}
th{background:#0e8a6a;color:#fff;font-weight:700;padding:3px 2px}th small{display:block;font-size:7pt;opacity:.8;font-weight:400}
td{text-align:center;padding:2.2px 2px;border-bottom:1px solid #e4ece9}
tr:nth-child(even) td{background:#f6faf8}tr.fri td{background:#fbf3df;font-weight:700}tr.now td{background:#d8f1e7;font-weight:900}
td.h{color:#6b7c78;font-size:8.6pt}td.hf{color:#b08a2e;font-weight:700}td.sr{color:#8a9894}
.bar{position:sticky;top:0;background:#0b3b33;padding:8px;text-align:center}.bar button{font:700 14px Cairo,sans-serif;background:#c89e4a;border:0;border-radius:10px;padding:8px 18px;color:#0b2a24}
@media print{.bar{display:none}}
</style></head><body><div class="bar"><button onclick="print()">${ar ? '🖨️ طباعة / حفظ PDF' : '🖨️ Print / Save PDF'}</button></div>${pages}</body></html>`;
  };

  const openPrint = () => {
    const html = printHtml();
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch {
          /* user prints from the button */
        }
      }, 700);
    } else download(html, 'text/html', 'html');
  };

  const download = (data: string, type: string, ext: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: `${type};charset=utf-8` }));
    a.download = `prayer-times-${mode === 'year' ? ym.y : `${ym.y}-${pad(ym.m)}`}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  };

  const csv = () => {
    const lines = [[ar ? 'التاريخ' : 'Date', ar ? 'اليوم' : 'Day', ar ? 'الهجري' : 'Hijri', ...KEYS.map((k) => names[k])].join(',')];
    for (const { y, m } of months())
      for (const x of monthRows(y, m)) lines.push([`${pad(x.c.d)}/${pad(m)}/${y}`, wdn[x.wd], x.hijri, ...KEYS.map((k) => `${x.t[k]} ${apFor(k)}`.trim())].join(','));
    download('﻿' + lines.join('\r\n'), 'text/csv', 'csv');
  };

  return (
    <Card title={ar ? 'جدول المواقيت (شهري / سنوي)' : 'Timetable (monthly / yearly)'} icon="calendar">
      <div className="flex items-center gap-2">
        <div className="flex rounded-xl bg-ink/5 p-0.5 text-[12.5px] font-bold">
          {(['month', 'year'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-lg px-3 py-1.5 ${mode === k ? 'bg-emerald text-white' : 'text-muted'}`}>
              {k === 'month' ? (ar ? 'شهري' : 'Month') : ar ? 'سنوي' : 'Year'}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center gap-1">
          <button type="button" aria-label="prev" onClick={() => step(-1)} className="grid h-8 w-8 place-items-center rounded-lg bg-ink/5">
            <Icon name={ar ? 'chevR' : 'chevL'} className="h-4 w-4" />
          </button>
          <p className="min-w-[110px] text-center font-display text-[16px] font-bold text-emerald">
            {mode === 'year' ? f.n(ym.y) : `${gm[ym.m - 1]} ${f.n(ym.y)}`}
          </p>
          <button type="button" aria-label="next" onClick={() => step(1)} className="grid h-8 w-8 place-items-center rounded-lg bg-ink/5">
            <Icon name={ar ? 'chevL' : 'chevR'} className="h-4 w-4" />
          </button>
        </div>
      </div>

      {mode === 'month' ? (
        <div className="-mx-1 mt-2 max-h-[60vh] overflow-auto rounded-xl border border-line/10">
          <table className="w-full border-collapse text-center text-[12px] tnum">
            <thead className="sticky top-0 bg-emerald text-white">
              <tr>
                <th className="px-1 py-1.5">{ar ? 'اليوم' : 'Day'}</th>
                {KEYS.map((k) => (
                  <th key={k} className={`px-1 py-1.5 ${k === 'sunrise' ? 'font-semibold opacity-80' : ''}`}>
                    {names[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const now = sameDay(x.c, today);
                return (
                  <tr key={x.c.d} className={`border-b border-line/5 ${now ? 'bg-emerald/15 font-black' : x.wd === 5 ? 'bg-gold/10 font-bold' : ''}`}>
                    <td className="px-1 py-1 leading-4">
                      <span className="block font-bold">
                        {f.n(x.c.d)} <span className="font-normal text-muted">{wdn[x.wd].replace('ال', '')}</span>
                      </span>
                      <span className={`block text-[10px] ${x.hijriFirst ? 'font-bold text-gold' : 'text-muted'}`}>{x.hijri}</span>
                    </td>
                    {KEYS.map((k) => (
                      <td key={k} className={`px-1 py-1 ${k === 'sunrise' ? 'text-muted' : ''}`}>
                        {x.t[k]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 rounded-xl bg-ink/[.03] p-3 text-[12.5px] leading-6 text-ink/80">
          {ar
            ? `جدول سنة ${f.n(ym.y)} كاملة: 12 شهرًا، كل شهر في صفحة A4 مع التاريخ الهجري — ${city}. اطبعه أو احفظه PDF، أو حمّله ملف Excel.`
            : `Full ${ym.y} timetable: 12 months, one A4 page each, with Hijri dates — ${city}. Print / save as PDF, or download for Excel.`}
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={openPrint} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald py-2.5 text-[13px] font-bold text-white">
          🖨️ {ar ? 'طباعة / PDF' : 'Print / PDF'}
        </button>
        <button type="button" onClick={csv} className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald/30 py-2.5 text-[13px] font-bold text-emerald">
          ⬇️ {ar ? 'Excel (CSV)' : 'Excel (CSV)'}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {ar ? 'بإعدادات الحساب والموقع الحالية · الجمعة مظللة بالذهبي واليوم بالأخضر · الأوقات بنظام 12 ساعة.' : 'Current method & location · Fridays in gold, today in green · 12-hour times.'}
      </p>
    </Card>
  );
}
