'use client';
/**
 * "On this Hijri day" from Arabic Wikipedia — every Hijri day has an article (e.g. «21 جمادى الأولى»)
 * with أحداث / مواليد / وفيات lists. Fetched live (MediaWiki API, CORS origin=*), parsed to plain text,
 * cached per day for a week. Shown separately from the curated, verified list and labelled as Wikipedia.
 */
import { useEffect, useState } from 'react';

export interface WikiItem {
  year: string;
  text: string;
}
export interface WikiDay {
  title: string;
  url: string;
  events: WikiItem[];
  births: WikiItem[];
  deaths: WikiItem[];
}

// title variants per month (Arabic Wikipedia uses redirects for alternative spellings)
const MONTHS: string[][] = [
  ['محرم'],
  ['صفر'],
  ['ربيع الأول'],
  ['ربيع الآخر', 'ربيع الثاني'],
  ['جمادى الأولى'],
  ['جمادى الآخرة', 'جمادى الثانية'],
  ['رجب'],
  ['شعبان'],
  ['رمضان'],
  ['شوال'],
  ['ذو القعدة'],
  ['ذو الحجة'],
];

const API = 'https://ar.wikipedia.org/w/api.php';
const CACHE = 'pakpt.wikiday.v1:';
const TTL = 7 * 86400_000;

/** wikitext → plain text */
export function clean(s: string): string {
  return s
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:ملف|File|صورة|Image):[^\]]*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:[^\s\]]+\s?([^\]]*)\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits "* 479 هـ: text" / "* 479 هـ - text" into year + text. */
function item(line: string): WikiItem | null {
  const t = clean(line.replace(/^\*+\s*/, ''));
  if (t.length < 4) return null;
  const m = t.match(/^(\d{1,4}\s*(?:هـ|ق\.?\s*هـ)?)\s*[:\-–—،]\s*(.+)$/);
  return m ? { year: m[1].replace(/\s+/g, ' '), text: m[2] } : { year: '', text: t };
}

/** Parses the أحداث / مواليد / وفيات sections of a Hijri-day article. */
export function parseWikiDay(wikitext: string): Pick<WikiDay, 'events' | 'births' | 'deaths'> {
  const out = { events: [] as WikiItem[], births: [] as WikiItem[], deaths: [] as WikiItem[] };
  let cur: keyof typeof out | null = null;
  for (const raw of wikitext.split('\n')) {
    const line = raw.trim();
    const h = line.match(/^==+\s*([^=]+?)\s*==+$/);
    if (h) {
      const name = h[1];
      cur = /أحداث|حوادث/.test(name) ? 'events' : /مواليد|ولادات/.test(name) ? 'births' : /وفيات/.test(name) ? 'deaths' : null;
      continue;
    }
    if (cur && line.startsWith('*')) {
      const it = item(line);
      if (it) out[cur].push(it);
    }
  }
  return out;
}

async function fetchTitle(title: string, signal: AbortSignal): Promise<WikiDay | null> {
  const u = `${API}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&redirects=1&format=json&formatversion=2&origin=*`;
  const r = await fetch(u, { signal });
  if (!r.ok) return null;
  const j = await r.json();
  const wt: string | undefined = j?.parse?.wikitext;
  if (!wt) return null;
  const real: string = j.parse.title ?? title;
  return { title: real, url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(real.replace(/ /g, '_'))}`, ...parseWikiDay(wt) };
}

export async function loadWikiDay(m: number, d: number, signal: AbortSignal): Promise<WikiDay | null> {
  const key = `${CACHE}${m}-${d}`;
  try {
    const c = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (c && Date.now() - c.at < TTL) return c.v;
  } catch {
    /* ignore */
  }
  for (const name of MONTHS[m - 1]) {
    const v = await fetchTitle(`${d} ${name}`, signal).catch(() => null);
    if (v) {
      try {
        localStorage.setItem(key, JSON.stringify({ at: Date.now(), v }));
      } catch {
        /* quota */
      }
      return v;
    }
  }
  return null;
}

export function wikiDayUrl(m: number, d: number) {
  return `https://ar.wikipedia.org/wiki/${encodeURIComponent(`${d}_${MONTHS[m - 1][0].replace(/ /g, '_')}`)}`;
}

export function useWikiDay(m: number, d: number) {
  const [state, setState] = useState<{ loading: boolean; data: WikiDay | null; failed: boolean }>({ loading: true, data: null, failed: false });
  useEffect(() => {
    const ctl = new AbortController();
    setState({ loading: true, data: null, failed: false });
    loadWikiDay(m, d, ctl.signal)
      .then((v) => setState({ loading: false, data: v, failed: !v }))
      .catch(() => !ctl.signal.aborted && setState({ loading: false, data: null, failed: true }));
    return () => ctl.abort();
  }, [m, d]);
  return state;
}
