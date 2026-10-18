#!/usr/bin/env node
/**
 * Dar al-Ifta crescent-sighting watcher.
 *
 * 1. Reads the news listings on dar-alifta.org and finds statements titled
 *    «بيان دار الإفتاء المصرية حول رؤية هلال شهر … لعام …هـ» not yet processed.
 * 2. For each, extracts the first day of the month THREE independent ways:
 *      A. the stated Gregorian date  («يوم الإثنين الموافق الثاني عشر من شهر أكتوبر»)
 *      B. publication date + 1 (sighted) or + 2 (month completed to 30 days)
 *      C. stated weekday must match A
 *    and checks it is within ±2 days of the Umm al-Qura calendar.
 * 3. All checks pass  → appends to src/data/officialHijri.json (the workflow commits → Vercel redeploys).
 *    Any check fails  → writes a report to hijri-watch-report.md (the workflow opens an Issue).
 *
 * Usage:  node scripts/hijri-watch.mjs           (live)
 *         node scripts/hijri-watch.mjs --test    (offline parser tests)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DATA = new URL('../src/data/officialHijri.json', import.meta.url);
const REPORT = new URL('../hijri-watch-report.md', import.meta.url);
const BASE = 'https://www.dar-alifta.org';
const LISTINGS = [`${BASE}/ar/articles`, `${BASE}/ar/mediacenter`];

const HIJRI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const HIJRI_ALIASES = { 'ربيع الثاني': 4, 'جمادى الاولى': 5, 'جمادى الأول': 5, 'جمادى الثانية': 6, 'جمادى الآخر': 6, 'ذي القعدة': 11, 'ذى القعدة': 11, 'ذي الحجة': 12, 'ذى الحجة': 12, 'المحرم': 1 };
const G_MONTHS = { يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, ابريل: 4, إبريل: 4, مايو: 5, يونيو: 6, يونية: 6, يوليو: 7, يولية: 7, أغسطس: 8, اغسطس: 8, سبتمبر: 9, أكتوبر: 10, اكتوبر: 10, نوفمبر: 11, ديسمبر: 12 };
const WEEKDAYS = { الأحد: 0, الاحد: 0, الإثنين: 1, الاثنين: 1, الثلاثاء: 2, الأربعاء: 3, الاربعاء: 3, الخميس: 4, الجمعة: 5, السبت: 6 };
const UNITS = ['', 'الحادي', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع'];
const ORD = { الأول: 1, الاول: 1, الحادي: 1, الثاني: 2, الثالث: 3, الرابع: 4, الخامس: 5, السادس: 6, السابع: 7, الثامن: 8, التاسع: 9, العاشر: 10, العشرين: 20, الثلاثين: 30 };

const strip = (s) =>
  s
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim();

/** Arabic ordinal day words → number (1..31). */
export function ordinalDay(text) {
  const t = strip(text);
  if (/^\d{1,2}$/.test(t)) return +t;
  const words = t.split(' ').filter((w) => w !== 'و');
  let n = 0;
  for (const w0 of words) {
    const w = w0.replace(/^و/, '');
    if (w === 'عشر') n += 10;
    else if (w in ORD) n += ORD[w];
  }
  return n >= 1 && n <= 31 ? n : null;
}

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const addDays = (s, n) => new Date(Date.parse(s + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const weekdayOf = (s) => new Date(s + 'T12:00:00Z').getUTCDay();

function umalqura(s) {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
  const p = Object.fromEntries(f.formatToParts(new Date(s + 'T12:00:00Z')).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day };
}

function hijriMonthIndex(name) {
  const n = strip(name).replace(/^شهر /, '');
  if (n in HIJRI_ALIASES) return HIJRI_ALIASES[n];
  const i = HIJRI_MONTHS.findIndex((m) => strip(m) === n);
  return i >= 0 ? i + 1 : null;
}

/**
 * Parses one statement page. `html` is the raw page; returns a verdict object.
 */
export function parseStatement(html, url) {
  const text = strip(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '));
  const title = text.match(/بيان دار الإفتاء المصرية حول رؤية هلال شهر (.+?) لعام (\d{4}) ?ه/);
  if (!title) return { ok: false, reason: 'title not found' };
  const m = hijriMonthIndex(title[1]);
  const y = +title[2];
  if (!m) return { ok: false, reason: `unknown Hijri month «${title[1]}»` };

  // publication date, e.g. "11 أكتوبر 2026 م" — the first such date on the page
  const pub = text.match(/(\d{1,2}) (يناير|فبراير|مارس|أبريل|ابريل|إبريل|مايو|يونيو|يونية|يوليو|يولية|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر) (\d{4}) م/);
  const pubDate = pub ? iso(+pub[3], G_MONTHS[pub[2]], +pub[1]) : null;

  // stated first day: "يوم <weekday> الموافق <ordinal> من شهر <month> ... هو أول أيام شهر"
  const stated = text.match(/يوم (\S+) الموافق (.+?) من شهر (\S+) لعام .{0,60}?(?:هو|سيكون|يكون) (?:غرة|أول أيام|أول) شهر/);
  let A = null;
  let wd = null;
  if (stated) {
    wd = WEEKDAYS[stated[1]] ?? null;
    const d = ordinalDay(stated[2]);
    const gm = G_MONTHS[stated[3]];
    if (d && gm && pubDate) {
      let yy = +pubDate.slice(0, 4);
      if (gm === 1 && +pubDate.slice(5, 7) === 12) yy += 1; // statement on 31 Dec for a January start
      A = iso(yy, gm, d);
    }
  }

  const sighted = /ثبتت رؤية|ثبوت رؤية|ثبوت ?رؤية/.test(text) && !/عدم ثبوت|لم تثبت|تعذر/.test(text);
  const notSighted = /عدم ثبوت|لم تثبت|تعذرت رؤية|تعذر رؤية|متمم|إتمام|اتمام|استكمال/.test(text);
  const B = pubDate ? addDays(pubDate, sighted ? 1 : notSighted ? 2 : 1) : null;

  const checks = [];
  if (!A) checks.push('stated Gregorian date not parsed');
  if (A && B && A !== B) checks.push(`stated date ${A} ≠ publication-rule date ${B} (${sighted ? 'sighted' : notSighted ? 'not sighted' : 'unclear'})`);
  if (A && wd !== null && weekdayOf(A) !== wd) checks.push(`weekday mismatch: «${stated[1]}» but ${A} is weekday ${weekdayOf(A)}`);
  if (A) {
    let close = false;
    for (const k of [0, -1, 1, -2, 2]) {
      const h = umalqura(addDays(A, k));
      if (h.y === y && h.m === m && h.d === 1) close = true;
    }
    if (!close) checks.push(`${A} is more than ±2 days from Umm al-Qura 1/${m}/${y}`);
  }
  return { ok: checks.length === 0, y, m, start: A, pubDate, sighted, checks, source: url };
}

/** Extracts candidate statement links {id, url} from a listing page. */
export function findStatements(html) {
  const out = new Map();
  const re = /href="([^"]*\/ar\/articles\/details\/(\d+)\/[^"]*)"/gi;
  let mm;
  while ((mm = re.exec(html))) {
    let href = mm[1];
    let decoded = href;
    try {
      decoded = decodeURIComponent(href);
    } catch {
      /* keep raw */
    }
    if (/ر[ؤو]ي[ةه][- ]هلال/.test(decoded)) {
      if (href.startsWith('/')) href = BASE + href;
      out.set(+mm[2], href);
    }
  }
  return [...out].map(([id, url]) => ({ id, url }));
}

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (prayer-time hijri watcher; +https://prayertimealikotb.vercel.app)', 'Accept-Language': 'ar' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

async function live() {
  const data = JSON.parse(readFileSync(DATA, 'utf8'));
  data.seen ??= [];
  const found = new Map();
  for (const l of LISTINGS) {
    try {
      for (const s of findStatements(await get(l))) found.set(s.id, s.url);
    } catch (e) {
      console.warn('listing failed:', e.message);
    }
  }
  const fresh = [...found].filter(([id]) => !data.seen.includes(id)).sort((a, b) => a[0] - b[0]);
  console.log(`statements on listing: ${found.size}, new: ${fresh.length}`);
  const problems = [];
  let added = 0;
  for (const [id, url] of fresh) {
    let v;
    try {
      v = parseStatement(await get(url), url);
    } catch (e) {
      console.warn('fetch failed', url, e.message);
      continue; // retry on the next run
    }
    data.seen.push(id);
    if (!v.ok) {
      problems.push({ id, url, ...v });
      continue;
    }
    if (data.EG.some((e) => e.y === v.y && e.m === v.m)) {
      console.log(`already recorded ${v.m}/${v.y}`);
      continue;
    }
    data.EG.push({ y: v.y, m: v.m, start: v.start, source: url });
    data.EG.sort((a, b) => a.start.localeCompare(b.start));
    added++;
    console.log(`ADDED 1/${v.m}/${v.y} = ${v.start} (${v.sighted ? 'sighted' : 'completed 30'})`);
  }
  data.seen = [...new Set(data.seen)].sort((a, b) => a - b).slice(-200);
  writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
  if (problems.length) {
    const md = [
      '## Dar al-Ifta statement needs manual review',
      '',
      ...problems.map((p) =>
        [`- **${p.url}**`, `  - parsed: month ${p.m ?? '?'} / ${p.y ?? '?'}, start ${p.start ?? '?'}, published ${p.pubDate ?? '?'}`, ...(p.checks ?? [p.reason]).map((c) => `  - ⚠️ ${c}`)].join('\n'),
      ),
      '',
      'Add the correct entry to `src/data/officialHijri.json` → `EG` if needed.',
    ].join('\n');
    writeFileSync(REPORT, md);
    console.log(md);
  }
  console.log(`added: ${added}, problems: ${problems.length}`);
}

function test() {
  let fail = 0;
  const eq = (a, b, msg) => {
    const ok = JSON.stringify(a) === JSON.stringify(b);
    if (!ok) fail++;
    console.log(ok ? '  ✓' : '  ✗', msg, ok ? '' : `→ got ${JSON.stringify(a)}`);
  };
  eq(ordinalDay('الثاني عشر'), 12, 'ordinal 12');
  eq(ordinalDay('الحادي والعشرين'), 21, 'ordinal 21');
  eq(ordinalDay('الأول'), 1, 'ordinal 1');
  eq(ordinalDay('الثلاثين'), 30, 'ordinal 30');
  eq(ordinalDay('التاسع عشر'), 19, 'ordinal 19');
  eq(ordinalDay('الحادي والثلاثين'), 31, 'ordinal 31');
  const page = (title, pub, body) =>
    `<html><body><span>${pub}</span><h1>${title}</h1><div><p>${body}</p></div><script>var x="ثبتت رؤية"</script></body></html>`;
  const jumada = parseStatement(
    page(
      'بيان دار الإفتاء المصرية حول رؤية هلال شهر جمادى الأولى لعام 1448هـ',
      '11 أكتوبر 2026 م',
      'تعلن دار الإفتاء المصرية ثبوتُ رؤية هلالِ شهر جمادى الأولى، وعليه فإن يومَ الإثنين الموافق الثاني عشر من شهر أكتوبر لعام ألفين وستة وعشرين ميلاديًّا هو أول أيام شهر جمادى الأولى لعام ألف وأربعمائة وثمانية وأربعين هجريًّا.',
    ),
    'https://example/12468',
  );
  eq([jumada.ok, jumada.y, jumada.m, jumada.start], [true, 1448, 5, '2026-10-12'], 'real statement Jumada I 1448 (sighted)');
  const ramadan = parseStatement(
    page(
      'بيان دار الإفتاء المصرية حول رؤية هلال شهر رمضان لعام 1447هـ',
      '17 فبراير 2026 م',
      'وحيث إنه لم تثبت رؤية الهلال فإن يوم الخميس الموافق التاسع عشر من شهر فبراير لعام ألفين وستة وعشرين هو أول أيام شهر رمضان المعظم.',
    ),
    'x',
  );
  eq([ramadan.ok, ramadan.start, ramadan.sighted], [true, '2026-02-19', false], 'Ramadan 1447, not sighted → 30 days');
  const bad = parseStatement(
    page('بيان دار الإفتاء المصرية حول رؤية هلال شهر رمضان لعام 1447هـ', '17 فبراير 2026 م', 'فإن يوم الأربعاء الموافق التاسع عشر من شهر فبراير لعام ألفين وستة وعشرين هو أول أيام شهر رمضان.'),
    'x',
  );
  eq(bad.ok, false, 'wrong weekday is rejected');
  const links = findStatements(
    '<a href="/ar/articles/details/12468/%D8%A8%D9%8A%D8%A7%D9%86-%D8%AF%D8%A7%D8%B1-%D8%A7%D9%84%D8%A5%D9%81%D8%AA%D8%A7%D8%A1-%D8%AD%D9%88%D9%84-%D8%B1%D9%88%D9%8A%D8%A9-%D9%87%D9%84%D8%A7%D9%84">x</a><a href="https://dar-alifta.org/ar/articles/details/12486/مفتي-الجمهورية-يزور">y</a><a href="https://dar-alifta.org/ar/articles/details/12500/بيان-حول-رؤية-هلال-شهر-جمادى-الآخرة">z</a>',
  );
  eq(links.map((l) => l.id), [12468, 12500], 'listing filter: percent-encoded «روية» and Arabic «رؤية» slugs found, other news ignored');
  console.log(fail ? `${fail} FAILED` : 'all parser tests passed');
  process.exit(fail ? 1 : 0);
}

if (process.argv.includes('--test')) test();
else live().catch((e) => {
  console.error(e);
  process.exit(0); // never fail the workflow on network issues — it retries on schedule
});
