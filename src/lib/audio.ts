/**
 * Personal audio library — voice reminders and Adhan recordings.
 * Everything stays on this device (IndexedDB); nothing is uploaded anywhere.
 *
 * Playback goes through ONE shared <audio> element, so a reminder, an Adhan and a preview can never overlap.
 */
import { chime, unlockAudio } from './notify';
import type { FivePrayer } from './types';

export type ClipKind = 'voice' | 'adhan';
export type AdhanRegion = 'egypt' | 'makkah' | 'madinah' | 'turkey' | 'morocco' | 'fajr' | 'other';

export const REGIONS: { k: AdhanRegion; ar: string; en: string }[] = [
  { k: 'egypt', ar: 'مصري', en: 'Egyptian' },
  { k: 'makkah', ar: 'مكي (الحرم)', en: 'Makkah style' },
  { k: 'madinah', ar: 'مدني (المسجد النبوي)', en: 'Madinah style' },
  { k: 'turkey', ar: 'تركي', en: 'Turkish' },
  { k: 'morocco', ar: 'مغربي', en: 'Moroccan' },
  { k: 'fajr', ar: 'أذان الفجر', en: 'Fajr Adhan' },
  { k: 'other', ar: 'أخرى', en: 'Other' },
];

export interface ClipMeta {
  id: string;
  name: string;
  kind: ClipKind;
  region?: AdhanRegion;
  mime: string;
  size: number;
  /** seconds */
  duration: number;
  created: number;
  /** where it came from: 'recorded' | 'file' | the URL it was downloaded from */
  origin: string;
}
export interface Clip extends ClipMeta {
  blob: Blob;
}

export const LIMITS = { voice: { bytes: 8 * 1024 * 1024, seconds: 60 }, adhan: { bytes: 25 * 1024 * 1024, seconds: 600 } };
const OK_TYPES = /^audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac|wav|x-wav|wave|ogg|webm|opus|flac|x-flac)/i;
const OK_EXT = /\.(mp3|m4a|mp4|aac|wav|ogg|oga|opus|webm|flac)$/i;

/* ---------------- IndexedDB ---------------- */
const DB = 'pakpt-audio';
const STORE = 'clips';
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const q = fn(t.objectStore(STORE));
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}

export const EVT = 'pakpt-clips';
const changed = () => window.dispatchEvent(new Event(EVT));

export async function listClips(kind?: ClipKind): Promise<ClipMeta[]> {
  try {
    const all = (await tx('readonly', (s) => s.getAll())) as Clip[];
    return all
      .filter((c) => !kind || c.kind === kind)
      .map(({ blob: _b, ...m }) => m) // eslint-disable-line @typescript-eslint/no-unused-vars
      .sort((a, b) => b.created - a.created);
  } catch {
    return [];
  }
}
export async function getClip(id: string): Promise<Clip | null> {
  try {
    return ((await tx('readonly', (s) => s.get(id))) as Clip) ?? null;
  } catch {
    return null;
  }
}
export async function saveClip(c: Clip) {
  await tx('readwrite', (s) => s.put(c));
  changed();
}
export async function renameClip(id: string, name: string, region?: AdhanRegion) {
  const c = await getClip(id);
  if (!c) return;
  await saveClip({ ...c, name: name.trim() || c.name, region: region ?? c.region });
}
export async function deleteClip(id: string) {
  await tx('readwrite', (s) => s.delete(id));
  changed();
}

/** Asks the browser to keep IndexedDB even under storage pressure (best effort). */
export async function persistStorage() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}

/* ---------------- validation ---------------- */
function probeDuration(blob: Blob): Promise<number> {
  return new Promise((res, rej) => {
    const a = new Audio();
    const url = URL.createObjectURL(blob);
    const done = (v: number | null) => {
      URL.revokeObjectURL(url);
      clearTimeout(t);
      v === null ? rej(new Error('undecodable')) : res(v);
    };
    const t = setTimeout(() => done(0), 6000); // some browsers never report metadata for webm — accept
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => done(null);
    a.src = url;
  });
}

export type AddError = 'type' | 'size' | 'long' | 'decode' | 'cors' | 'network';

export async function makeClip(blob: Blob, name: string, kind: ClipKind, origin: string, region?: AdhanRegion): Promise<Clip> {
  const type = blob.type || '';
  if (!OK_TYPES.test(type) && !OK_EXT.test(name)) throw 'type' as AddError;
  if (blob.size > LIMITS[kind].bytes) throw 'size' as AddError;
  let duration = 0;
  try {
    duration = await probeDuration(blob);
  } catch {
    throw 'decode' as AddError;
  }
  if (duration > LIMITS[kind].seconds) throw 'long' as AddError;
  return {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || (kind === 'voice' ? 'تسجيل' : 'أذان'),
    kind,
    region,
    mime: type || 'audio/mpeg',
    size: blob.size,
    duration,
    created: Date.now(),
    origin,
    blob,
  };
}

/** Downloads a recording for offline use. Only works when the host allows cross-origin requests (CORS). */
export async function fetchClip(url: string, kind: ClipKind, region?: AdhanRegion): Promise<Clip> {
  let r: Response;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') throw 'network' as AddError;
    r = await fetch(u.href, { mode: 'cors', cache: 'no-store' });
  } catch (e) {
    throw (e === 'network' ? 'network' : 'cors') as AddError;
  }
  if (!r.ok) throw 'network' as AddError;
  const blob = await r.blob();
  return makeClip(blob, decodeURIComponent(url.split('/').pop() ?? 'adhan'), kind, url, region);
}

/* ---------------- recording ---------------- */
export function recordingSupported(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export interface Recorder {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export async function startRecording(maxSeconds = LIMITS.voice.seconds): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported?.(m));
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const parts: BlobPart[] = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const finished = new Promise<Blob>((res) => {
    rec.onstop = () => {
      release();
      res(new Blob(parts, { type: (rec.mimeType || mime || 'audio/webm').split(';')[0] }));
    };
  });
  rec.start(250);
  const guard = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxSeconds * 1000);
  return {
    stop: () => {
      clearTimeout(guard);
      if (rec.state !== 'inactive') rec.stop();
      return finished;
    },
    cancel: () => {
      clearTimeout(guard);
      rec.onstop = null;
      if (rec.state !== 'inactive') rec.stop();
      release();
    },
  };
}

/* ---------------- playback (single channel → no overlap) ---------------- */
let el: HTMLAudioElement | null = null;
let url: string | null = null;
let playing: string | null = null;
const PEVT = 'pakpt-playing';

export function nowPlaying() {
  return playing;
}

export function stopAll() {
  try {
    el?.pause();
  } catch {
    /* ignore */
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  if (url) URL.revokeObjectURL(url);
  url = null;
  playing = null;
  window.dispatchEvent(new Event(PEVT));
}
export const PLAYING_EVT = PEVT;

async function playSrc(src: string, volume: number, tag: string) {
  el ??= new Audio();
  el.src = src;
  el.volume = Math.max(0, Math.min(1, volume));
  el.currentTime = 0;
  playing = tag;
  window.dispatchEvent(new Event(PEVT));
  el.onended = () => {
    if (playing === tag) {
      playing = null;
      window.dispatchEvent(new Event(PEVT));
    }
  };
  await el.play();
}

const MIN_AR: Record<number, string> = { 1: 'دقيقة واحدة', 2: 'دقيقتان', 3: 'ثلاث دقائق', 5: 'خمس دقائق', 10: 'عشر دقائق', 15: 'خمس عشرة دقيقة', 20: 'عشرون دقيقة' };

export function reminderText(prayerAr: string, prayerEn: string, minutes: number, lang: 'ar' | 'en') {
  return lang === 'ar'
    ? `باقي ${MIN_AR[minutes] ?? `${minutes} دقيقة`} على أذان صلاة ${prayerAr}، استعد للصلاة.`
    : `${minutes} minutes remain until the ${prayerEn} Adhan. Get ready for prayer.`;
}

export function ttsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function speak(text: string, lang: 'ar' | 'en', volume: number): Promise<void> {
  return new Promise((res) => {
    if (!ttsSupported()) return res();
    const u = new SpeechSynthesisUtterance(text);
    const want = lang === 'ar' ? /^ar/i : /^en/i;
    const v = speechSynthesis.getVoices().filter((x) => want.test(x.lang));
    u.voice = v.find((x) => /ar-EG/i.test(x.lang)) ?? v.find((x) => /ar-SA/i.test(x.lang)) ?? v[0] ?? null;
    u.lang = u.voice?.lang ?? (lang === 'ar' ? 'ar-SA' : 'en-US');
    u.rate = 0.92;
    u.volume = volume;
    u.onend = () => res();
    u.onerror = () => res();
    playing = 'tts';
    speechSynthesis.speak(u);
  });
}

/**
 * Plays a sound id. Never throws; falls back to the chime if a clip is missing or blocked
 * (e.g. iOS refusing audio without a recent tap).
 */
export async function playSound(sound: string, opts: { volume: number; tts?: string; lang?: 'ar' | 'en'; tag?: string }): Promise<boolean> {
  stopAll();
  unlockAudio();
  const tag = opts.tag ?? sound;
  try {
    if (sound === 'silent') return true;
    if (sound === 'chime') {
      chime();
      return true;
    }
    if (sound === 'tts') {
      if (!opts.tts || !ttsSupported()) {
        chime();
        return false;
      }
      await speak(opts.tts, opts.lang ?? 'ar', opts.volume);
      return true;
    }
    if (sound === 'legacy') {
      await playSrc('/adhan.mp3', opts.volume, tag);
      return true;
    }
    if (sound.startsWith('clip:')) {
      const c = await getClip(sound.slice(5));
      if (!c) throw new Error('missing');
      url = URL.createObjectURL(c.blob);
      await playSrc(url, opts.volume, tag);
      return true;
    }
  } catch {
    chime();
    return false;
  }
  chime();
  return false;
}

export function soundLabel(sound: string, clips: ClipMeta[], lang: 'ar' | 'en'): string {
  if (sound === 'chime') return lang === 'ar' ? 'نغمة هادئة' : 'Soft chime';
  if (sound === 'silent') return lang === 'ar' ? 'صامت (إشعار فقط)' : 'Silent (notification only)';
  if (sound === 'tts') return lang === 'ar' ? 'صوت الجهاز (قراءة آلية)' : 'Device voice (TTS)';
  if (sound === 'legacy') return lang === 'ar' ? 'ملف الموقع adhan.mp3' : 'Site file adhan.mp3';
  const c = clips.find((x) => `clip:${x.id}` === sound);
  return c ? c.name : lang === 'ar' ? 'تسجيل محذوف' : 'Deleted recording';
}

export const FIVE: FivePrayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export function fmtSize(b: number) {
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}
export function fmtDur(s: number) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}
