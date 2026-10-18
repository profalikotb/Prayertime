import type { CivilDate, HijriDate, Lang, Settings } from './types';
import { HIJRI_MONTHS } from './hijri';
import { noonUTC, weekday } from './civil';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function digits(s: string | number, mode: Settings['digits'], lang: Lang): string {
  const str = String(s);
  if (lang !== 'ar' || mode === 'latn') return str.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
  return str.replace(/[0-9]/g, (d) => AR_DIGITS[+d]);
}

export interface Fmt {
  lang: Lang;
  n: (v: string | number) => string;
  time: (d: Date) => string;
  timeParts: (d: Date) => { hm: string; ap: string };
  gDate: (c: CivilDate) => string;
  gShort: (c: CivilDate) => string;
  hDate: (h: HijriDate) => string;
  hMonth: (m: number) => string;
  weekday: (c: CivilDate) => string;
  duration: (ms: number) => string;
  countdown: (ms: number) => string;
}

const WD = {
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const GM = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const pad = (x: number) => String(x).padStart(2, '0');

export function makeFmt(s: Settings, tz: string): Fmt {
  const lang = s.lang;
  const n = (v: string | number) => digits(v, s.digits, lang);
  const tf = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const timeParts = (d: Date) => {
    const [hh, mm] = tf.format(d).split(':').map(Number);
    if (s.timeFormat === '24') return { hm: n(`${pad(hh)}:${pad(mm)}`), ap: '' };
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    const ap = lang === 'ar' ? (hh < 12 ? 'ص' : 'م') : hh < 12 ? 'AM' : 'PM';
    return { hm: n(`${h12}:${pad(mm)}`), ap };
  };
  return {
    lang,
    n,
    timeParts,
    time: (d) => {
      const p = timeParts(d);
      return p.ap ? `${p.hm} ${p.ap}` : p.hm;
    },
    gDate: (c) => n(`${c.d} ${GM[lang][c.m - 1]} ${c.y}`),
    gShort: (c) => n(`${pad(c.d)}/${pad(c.m)}/${c.y}`),
    hDate: (h) => n(lang === 'ar' ? `${h.d} ${HIJRI_MONTHS.ar[h.m - 1]} ${h.y} هـ` : `${h.d} ${HIJRI_MONTHS.en[h.m - 1]} ${h.y} AH`),
    hMonth: (m) => HIJRI_MONTHS[lang][m - 1],
    weekday: (c) => WD[lang][weekday(c)],
    duration: (ms) => {
      const m = Math.max(0, Math.round(ms / 60000));
      const h = Math.floor(m / 60);
      const r = m % 60;
      return lang === 'ar' ? n(`${h} س ${r} د`) : `${h}h ${r}m`;
    },
    countdown: (ms) => {
      const t = Math.max(0, Math.floor(ms / 1000));
      // hours omitted when zero: Arabic-Indic "٠٠" reads like dots
      const h = Math.floor(t / 3600);
      const mm = `${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
      return n(h > 0 ? `${pad(h)}:${mm}` : mm);
    },
  };
}

/** Days-count phrase with Arabic dual/plural agreement. */
export function daysPhrase(n: number, f: Fmt): string {
  if (f.lang === 'en') return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n} days`;
  if (n === 0) return 'اليوم';
  if (n === 1) return 'غدًا';
  if (n === 2) return 'بعد يومين';
  if (n >= 3 && n <= 10) return `${f.n(n)} أيام`;
  return `${f.n(n)} يومًا`;
}

export { noonUTC };
