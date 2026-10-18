/**
 * Instant Quran word search over the Uthmani (Madani mushaf) text — fully on-device.
 *
 * Uthmani orthography differs from everyday spelling (الرحمٰن، الصلوٰة، السمٰوٰت، إبرٰهـۧم، ءامنوا …),
 * so every word is indexed in three spellings and a query word matches if it is contained in any:
 *   A: dagger-alef removed            ٱلرَّحۡمَٰنِ → الرحمن
 *   B: dagger-alef → ا, small ya → ي   ٱلۡعَٰلَمِينَ → العالمين · إِبۡرَٰهِـۧمَ → ابراهيم
 *   C: وٰ → ا, then as B               ٱلصَّلَوٰةَ → الصلاه
 * Both sides are normalised: diacritics/Quranic marks removed, alef forms unified, hamza dropped,
 * ة→ه, ى→ي, tatweel removed.
 */

export interface QuranData {
  source: string;
  surahs: [string, string, number][]; // [arabic name, transliteration, verse count]
  verses: string[][]; // verses[surah-1][ayah-1] = Uthmani text
}

interface Row {
  s: number;
  a: number;
  text: string;
  words: string[];
  /** per-word variant keys, joined: "A|B|C" */
  keys: string[];
  /** whole-verse strings for phrase matching */
  A: string;
  B: string;
  C: string;
}

const MARKS = /[ؐ-ًؚ-ٟۖ-ۜ۟-ۤۥ۪ۨ-ۭـ]/g;

function base(s: string): string {
  return s
    .replace(MARKS, '')
    .replace(/[ٱأإآٲٳ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/[ءئ]/g, '')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^ء-ي\s]/g, '');
}

/** Normalises user input (modern spelling). */
export function normQuery(q: string): string {
  return base(q.replace(/ٰ/g, 'ا')).replace(/\s+/g, ' ').trim();
}

function variants(word: string): [string, string, string] {
  const sy = word.replace(/[ۦۧ]/g, 'ي');
  const A = base(word.replace(/ٰ/g, '').replace(/[ۦۧ]/g, ''));
  const B = base(sy.replace(/ٰ/g, 'ا'));
  const C = base(sy.replace(/وٰ/g, 'ا').replace(/ٰ/g, 'ا'));
  return [A, B, C];
}

let index: Row[] | null = null;
let data: QuranData | null = null;
let loading: Promise<QuranData> | null = null;

export function loadQuran(): Promise<QuranData> {
  if (data) return Promise.resolve(data);
  loading ??= fetch('/data/quran.json')
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<QuranData>;
    })
    .then((d) => {
      data = d;
      buildIndex(d);
      return d;
    })
    .catch((e) => {
      loading = null;
      throw e;
    });
  return loading;
}

export function buildIndex(d: QuranData): Row[] {
  const rows: Row[] = [];
  d.verses.forEach((vs, si) =>
    vs.forEach((text, ai) => {
      const words = text.split(/\s+/).filter(Boolean);
      const vv = words.map(variants);
      rows.push({
        s: si + 1,
        a: ai + 1,
        text,
        words,
        keys: vv.map((v) => v.join('|')),
        A: vv.map((v) => v[0]).join(' '),
        B: vv.map((v) => v[1]).join(' '),
        C: vv.map((v) => v[2]).join(' '),
      });
    }),
  );
  index = rows;
  return rows;
}

export interface Hit {
  s: number;
  a: number;
  text: string;
  words: string[];
  /** indices of words that matched a query term (for highlighting) */
  marks: number[];
  phrase: boolean;
}

export interface SearchResult {
  hits: Hit[];
  total: number;
  occurrences: number;
}

/**
 * Every query word must appear (as a substring) in the verse; exact phrase matches rank first,
 * then mushaf order. `limit` caps returned hits (total is always exact).
 */
export function searchQuran(q: string, limit = 150, rows: Row[] | null = index): SearchResult {
  const nq = normQuery(q);
  if (!rows || nq.replace(/\s/g, '').length < 2) return { hits: [], total: 0, occurrences: 0 };
  const terms = nq.split(' ');
  const phraseHits: Hit[] = [];
  const otherHits: Hit[] = [];
  let occurrences = 0;
  for (const r of rows) {
    let ok = true;
    for (const t of terms) {
      if (!r.A.includes(t) && !r.B.includes(t) && !r.C.includes(t)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const marks: number[] = [];
    r.keys.forEach((k, i) => {
      if (terms.some((t) => k.includes(t))) marks.push(i);
    });
    occurrences += terms.length === 1 ? r.keys.filter((k) => k.includes(terms[0])).length : 1;
    const phrase = terms.length > 1 && (r.A.includes(nq) || r.B.includes(nq) || r.C.includes(nq));
    (phrase ? phraseHits : otherHits).push({ s: r.s, a: r.a, text: r.text, words: r.words, marks, phrase });
  }
  const all = phraseHits.concat(otherHits);
  return { hits: all.slice(0, limit), total: all.length, occurrences };
}

/** Golden Quran (المصحف الذهبي) web reader — verified URL pattern: /surah/{n}/#v{ayah} */
export function goldenQuranUrl(s: number, a: number): string {
  return `https://www.goldenquran.org/surah/${s}/#v${a}`;
}
