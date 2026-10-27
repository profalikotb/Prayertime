'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon, Row, Toggle } from './ui';
import { PRAYER_NAMES } from '@/lib/i18n';
import type { FivePrayer } from '@/lib/types';
import {
  EVT,
  FIVE,
  LIMITS,
  PLAYING_EVT,
  REGIONS,
  deleteClip,
  fetchClip,
  fmtDur,
  fmtSize,
  listClips,
  makeClip,
  nowPlaying,
  persistStorage,
  playSound,
  recordingSupported,
  renameClip,
  saveClip,
  soundLabel,
  voiceSoundFor,
  startRecording,
  stopAll,
  type AddError,
  type AdhanRegion,
  type ClipKind,
  type ClipMeta,
  type Recorder,
} from '@/lib/audio';

const selectCls = 'w-full min-w-0 rounded-lg border border-line/15 bg-surface px-2 py-2 text-[13px] font-semibold text-ink outline-none focus:border-emerald';

function useClips() {
  const [clips, setClips] = useState<ClipMeta[]>([]);
  const load = useCallback(() => void listClips().then(setClips), []);
  useEffect(() => {
    load();
    window.addEventListener(EVT, load);
    return () => window.removeEventListener(EVT, load);
  }, [load]);
  return clips;
}

function usePlaying() {
  const [p, setP] = useState<string | null>(null);
  useEffect(() => {
    const on = () => setP(nowPlaying());
    window.addEventListener(PLAYING_EVT, on);
    return () => window.removeEventListener(PLAYING_EVT, on);
  }, []);
  return p;
}

function errText(e: unknown, kind: ClipKind, ar: boolean): string {
  const lim = LIMITS[kind];
  switch (e as AddError) {
    case 'type':
      return ar ? 'صيغة غير مدعومة — استخدم MP3 أو M4A أو WAV.' : 'Unsupported format — use MP3, M4A or WAV.';
    case 'size':
      return ar ? `الملف أكبر من ${lim.bytes / 1024 / 1024} ميجابايت.` : `File is larger than ${lim.bytes / 1024 / 1024} MB.`;
    case 'long':
      return ar ? `المدة أطول من ${lim.seconds / 60} دقيقة.` : `Longer than ${lim.seconds / 60} min.`;
    case 'decode':
      return ar ? 'تعذّر تشغيل الملف على هذا الجهاز.' : 'This device cannot play the file.';
    case 'cors':
      return ar ? 'الموقع المصدر لا يسمح بالتنزيل المباشر — نزّل الملف على جهازك ثم ارفعه.' : 'The source site blocks direct download — save the file, then upload it.';
    default:
      return ar ? 'تعذّر الإضافة.' : 'Could not add.';
  }
}

/** «التنبيه بصوتي قبل الصلاة» + «مكتبة الأذان» */
export default function AudioSettings() {
  const { s, set } = useApp();
  const ar = s.lang === 'ar';
  const names = PRAYER_NAMES[s.lang];
  const clips = useClips();
  const playing = usePlaying();
  const adhans = clips.filter((c) => c.kind === 'adhan');
  const a = s.audio;

  const setVoice = (fn: (v: typeof a.voice) => typeof a.voice) => set((x) => ({ ...x, audio: { ...x.audio, voice: fn(x.audio.voice) } }));
  const setAdhan = (k: FivePrayer, v: string) => set((x) => ({ ...x, audio: { ...x.audio, adhan: { ...x.audio.adhan, [k]: v } } }));

  /** when a clip is deleted, fall back to TTS / chime wherever it was used */
  const onDeleted = (id: string) =>
    set((x) => {
      const sid = `clip:${id}`;
      const pp = { ...x.audio.voice.perPrayer };
      const ad = { ...x.audio.adhan };
      for (const k of FIVE) {
        if (pp[k].sound === sid) pp[k] = { ...pp[k], sound: 'builtin' };
        if (ad[k] === sid) ad[k] = 'chime';
      }
      return { ...x, audio: { ...x.audio, voice: { ...x.audio.voice, perPrayer: pp }, adhan: ad } };
    });

  const test = (k: FivePrayer, which: 'v' | 'a') => {
    const tag = `test-${k}-${which}`;
    if (playing === tag) return stopAll();
    if (which === 'v') {
      void playSound(voiceSoundFor(a.voice.perPrayer[k].sound), { volume: a.volume, tag });
    } else void playSound(a.adhan[k], { volume: a.volume, tag });
  };

  // only two choices: the recorded reminder, or the soft chime (no device/TTS voices)
  const voiceOptions = [
    { v: 'builtin', l: soundLabel('builtin', clips, s.lang) },
    { v: 'chime', l: soundLabel('chime', clips, s.lang) },
  ];
  const adhanOptions = [
    { v: 'chime', l: soundLabel('chime', clips, s.lang) },
    { v: 'silent', l: soundLabel('silent', clips, s.lang) },
    { v: 'legacy', l: soundLabel('legacy', clips, s.lang) },
    ...adhans.map((c) => ({ v: `clip:${c.id}`, l: `🕌 ${c.name}${c.region ? ` — ${REGIONS.find((r) => r.k === c.region)?.[s.lang === 'ar' ? 'ar' : 'en']}` : ''}` })),
  ];

  return (
    <>
      {/* ───────────── Voice reminder ───────────── */}
      <Card title={ar ? 'التنبيه بصوتي قبل الصلاة' : 'My voice prayer reminder'} icon="mic" className="md:col-span-2">
        <div id="audio" className="-mt-1 mb-2 text-[12px] leading-5 text-muted">
          {ar
            ? 'قبل كل صلاة بخمس دقائق يُشغَّل تسجيلك «باقي خمس دقائق على أذان الصلاة…» أو نغمة هادئة — اختر لكل صلاة.'
            : 'Five minutes before each prayer: your recorded reminder or a soft chime — choose per prayer.'}
        </div>
        <Toggle on={a.voice.enabled} label={ar ? 'تفعيل التنبيه الصوتي' : 'Enable voice reminder'} onChange={(v) => setVoice((x) => ({ ...x, enabled: v }))} />
        {!s.notify.enabled && a.voice.enabled && (
          <p className="mb-1 rounded-lg bg-gold/10 px-2.5 py-1.5 text-[12px] text-gold">
            {ar ? 'فعّل «التنبيهات» في بطاقة التنبيهات حتى يعمل.' : 'Turn on Notifications (card above) for it to run.'}
          </p>
        )}
        <p className="mb-1 text-[12px] text-muted">{ar ? 'قبل الأذان بـ ٥ دقائق.' : '5 minutes before the Adhan.'}</p>
        <div className="mt-2 grid gap-1.5">
          {FIVE.map((k) => {
            const p = a.voice.perPrayer[k];
            const tag = `test-${k}-v`;
            return (
              <div key={k} className={`grid grid-cols-[auto_4.2rem_minmax(0,1fr)_auto] items-center gap-2 ${p.on ? '' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  aria-label={names[k]}
                  className="h-5 w-5 accent-[rgb(var(--emerald))]"
                  checked={p.on}
                  onChange={(e) => setVoice((x) => ({ ...x, perPrayer: { ...x.perPrayer, [k]: { ...x.perPrayer[k], on: e.target.checked } } }))}
                />
                <span className="text-[13.5px] font-bold">{names[k]}</span>
                <select
                  className={selectCls}
                  value={voiceOptions.some((o) => o.v === p.sound) ? p.sound : voiceOptions[0].v}
                  onChange={(e) => setVoice((x) => ({ ...x, perPrayer: { ...x.perPrayer, [k]: { ...x.perPrayer[k], sound: e.target.value } } }))}
                >
                  {voiceOptions.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => test(k, 'v')} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald/10 text-emerald" aria-label={ar ? 'تجربة' : 'Test'}>
                  <Icon name={playing === tag ? 'stop' : 'play'} className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ───────────── Adhan library ───────────── */}
      <Card title={ar ? 'مكتبة الأذان' : 'Adhan library'} icon="bell" className="md:col-span-2">
        <p className="-mt-1 mb-2 text-[12px] leading-5 text-muted">
          {ar
            ? 'اختر أذانًا مختلفًا لكل صلاة (ومنه أذان خاص للفجر). أضف تسجيلاتك من ملفاتك أو من رابط مباشر — استخدم تسجيلات مرخّصة أو خاصة بك؛ تسمية «مكي» أو «مصري» وصف للأسلوب لا شهادة بأنه تسجيل رسمي.'
            : 'Pick a different Adhan for each prayer (including a Fajr-specific one). Add files or a direct link — use licensed or your own recordings; a style label is not a claim of an official recording.'}
        </p>
        <div className="grid gap-1.5">
          {FIVE.map((k) => {
            const tag = `test-${k}-a`;
            return (
              <div key={k} className="grid grid-cols-[4.2rem_minmax(0,1fr)_auto] items-center gap-2">
                <span className="text-[13.5px] font-bold">{names[k]}</span>
                <select className={selectCls} value={adhanOptions.some((o) => o.v === a.adhan[k]) ? a.adhan[k] : 'chime'} onChange={(e) => setAdhan(k, e.target.value)}>
                  {adhanOptions.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => test(k, 'a')} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald/10 text-emerald" aria-label={ar ? 'تجربة' : 'Preview'}>
                  <Icon name={playing === tag ? 'stop' : 'play'} className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <Row label={ar ? 'مستوى الصوت' : 'Volume'} hint={ar ? 'على iPhone يتحكم زر الصوت الجانبي فقط.' : 'On iPhone only the hardware buttons apply.'}>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={a.volume}
            onChange={(e) => set((x) => ({ ...x, audio: { ...x.audio, volume: Number(e.target.value) } }))}
            className="w-full accent-[rgb(var(--emerald))]"
            aria-label={ar ? 'مستوى الصوت' : 'Volume'}
          />
        </Row>
        <ClipManager kind="adhan" clips={adhans} onDeleted={onDeleted} playing={playing} />
        <AudioLimits />
      </Card>
    </>
  );
}

/** Add (record / file / link), preview, rename, delete. */
function ClipManager({ kind, clips, onDeleted, playing }: { kind: ClipKind; clips: ClipMeta[]; onDeleted: (id: string) => void; playing: string | null }) {
  const { s } = useApp();
  const ar = s.lang === 'ar';
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const [rec, setRec] = useState<Recorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [link, setLink] = useState('');
  const [region, setRegion] = useState<AdhanRegion>('egypt');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    rec?.cancel();
    if (timer.current) clearInterval(timer.current);
  }, [rec]);

  const add = async (p: Promise<import('@/lib/audio').Clip>) => {
    setBusy(true);
    setMsg(null);
    try {
      const c = await p;
      await saveClip(c);
      void persistStorage();
      setMsg({ t: ar ? `أُضيف «${c.name}» (${fmtDur(c.duration)})` : `Added “${c.name}” (${fmtDur(c.duration)})` });
    } catch (e) {
      setMsg({ t: errText(e, kind, ar), bad: true });
    } finally {
      setBusy(false);
    }
  };

  const startRec = async () => {
    stopAll();
    try {
      const r = await startRecording(kind === 'voice' ? LIMITS.voice.seconds : 300);
      setRec(r);
      setSecs(0);
      timer.current = setInterval(() => setSecs((x) => x + 1), 1000);
    } catch {
      setMsg({ t: ar ? 'لم يُسمح باستخدام الميكروفون. اسمح به من إعدادات المتصفح ثم أعد المحاولة.' : 'Microphone permission was not granted.', bad: true });
    }
  };
  const stopRec = async () => {
    if (!rec) return;
    if (timer.current) clearInterval(timer.current);
    const blob = await rec.stop();
    setRec(null);
    const n = new Date();
    const name = (ar ? 'تسجيلي ' : 'My recording ') + `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')} ${n.getHours()}:${String(n.getMinutes()).padStart(2, '0')}`;
    await add(makeClip(blob, name, kind, 'recorded', kind === 'adhan' ? region : undefined));
  };

  return (
    <div className="mt-4 rounded-xl border border-line/10 p-3">
      <p className="mb-2 text-[12.5px] font-extrabold">
        {kind === 'voice' ? (ar ? 'تسجيلاتي' : 'My recordings') : ar ? 'تسجيلات الأذان على الجهاز' : 'Adhan recordings on this device'}
      </p>
      {kind === 'adhan' && (
        <select className={`${selectCls} mb-2`} value={region} onChange={(e) => setRegion(e.target.value as AdhanRegion)} aria-label={ar ? 'التصنيف' : 'Category'}>
          {REGIONS.map((r) => (
            <option key={r.k} value={r.k}>
              {ar ? 'التصنيف: ' : 'Category: '}
              {ar ? r.ar : r.en}
            </option>
          ))}
        </select>
      )}
      <div className="flex flex-wrap gap-2">
        {recordingSupported() &&
          (rec ? (
            <button type="button" onClick={stopRec} className="flex items-center gap-1.5 rounded-lg bg-[#c0392b] px-3 py-2 text-[13px] font-bold text-white">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
              {ar ? 'إيقاف وحفظ' : 'Stop & save'} <span className="tnum" dir="ltr">0:{String(secs).padStart(2, '0')}</span>
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={startRec} className="flex items-center gap-1.5 rounded-lg bg-emerald px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50">
              <Icon name="mic" className="h-4 w-4" />
              {ar ? 'تسجيل' : 'Record'}
            </button>
          ))}
        <button type="button" disabled={busy || !!rec} onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg bg-emerald/10 px-3 py-2 text-[13px] font-bold text-emerald disabled:opacity-50">
          <Icon name="upload" className="h-4 w-4" />
          {ar ? 'رفع ملف (MP3 · M4A · WAV)' : 'Upload (MP3 · M4A · WAV)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void add(makeClip(file, file.name, kind, 'file', kind === 'adhan' ? region : undefined));
          }}
        />
      </div>
      {kind === 'adhan' && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (link.trim()) void add(fetchClip(link.trim(), 'adhan', region)).then(() => setLink(''));
          }}
        >
          <input
            dir="ltr"
            type="url"
            inputMode="url"
            placeholder="https://…/adhan.mp3"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-line/15 bg-surface px-2.5 py-2 text-[13px] outline-none focus:border-emerald"
          />
          <button type="submit" disabled={busy || !link.trim()} className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald/10 px-3 py-2 text-[13px] font-bold text-emerald disabled:opacity-40">
            <Icon name="download" className="h-4 w-4" />
            {ar ? 'تنزيل' : 'Download'}
          </button>
        </form>
      )}
      {msg && <p className={`mt-2 text-[12px] ${msg.bad ? 'text-[#c0392b]' : 'text-emerald'}`}>{msg.t}</p>}

      {clips.length > 0 && (
        <ul className="mt-3 grid gap-1.5">
          {clips.map((c) => (
            <ClipRow key={c.id} c={c} playing={playing} onDeleted={onDeleted} />
          ))}
        </ul>
      )}
      {clips.length === 0 && <p className="mt-2 text-[12px] text-muted">{ar ? 'لا توجد تسجيلات بعد.' : 'No recordings yet.'}</p>}
    </div>
  );
}

function ClipRow({ c, playing, onDeleted }: { c: ClipMeta; playing: string | null; onDeleted: (id: string) => void }) {
  const { s } = useApp();
  const ar = s.lang === 'ar';
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(c.name);
  const tag = `prev-${c.id}`;
  return (
    <li className="flex items-center gap-2 rounded-lg bg-ink/[.03] px-2 py-1.5">
      <button
        type="button"
        onClick={() => (playing === tag ? stopAll() : void playSound(`clip:${c.id}`, { volume: s.audio.volume, tag }))}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald text-white"
        aria-label={ar ? 'تشغيل' : 'Play'}
      >
        <Icon name={playing === tag ? 'stop' : 'play'} className="h-3.5 w-3.5" />
      </button>
      {edit ? (
        <form
          className="flex min-w-0 flex-1 gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void renameClip(c.id, name);
            setEdit(false);
          }}
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="min-w-0 flex-1 rounded-md border border-line/20 bg-surface px-2 py-1 text-[13px]" />
          <button type="submit" className="rounded-md bg-emerald px-2 text-[12px] font-bold text-white">
            {ar ? 'حفظ' : 'Save'}
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setEdit(true)} className="min-w-0 flex-1 text-start" title={ar ? 'إعادة التسمية' : 'Rename'}>
          <p className="truncate text-[13px] font-bold">{c.name}</p>
          <p className="tnum text-[11px] text-muted" dir="ltr">
            {fmtDur(c.duration)} · {fmtSize(c.size)}
            {c.origin.startsWith('http') ? ` · ${new URL(c.origin).hostname}` : ''}
          </p>
        </button>
      )}
      <button
        type="button"
        onClick={async () => {
          if (!confirm(ar ? `حذف «${c.name}»؟` : `Delete “${c.name}”?`)) return;
          if (playing === tag) stopAll();
          await deleteClip(c.id);
          onDeleted(c.id);
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#c0392b]"
        aria-label={ar ? 'حذف' : 'Delete'}
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </li>
  );
}

function AudioLimits() {
  const { s } = useApp();
  const ar = s.lang === 'ar';
  return (
    <div className="mt-3 rounded-xl bg-gold/10 p-3 text-[11.5px] leading-5 text-ink/80">
      {ar ? (
        <ul className="list-disc space-y-0.5 ps-4">
          <li>
            <b>iPhone:</b> الصوت يعمل والتطبيق مفتوح فقط؛ نظام iOS لا يسمح لتطبيقات الويب بتشغيل صوت في الخلفية أو والقفل مغلق. للتنبيه المضمون استخدم تصدير التقويم (.ics).
          </li>
          <li>
            <b>أندرويد:</b> تطبيق «مواقيت الصلاة» الأصلي (APK) يشغّل تسجيلك والأذان في الخلفية والهاتف مقفول وبعد إعادة التشغيل. إذا ثبّتّه فأوقف تنبيهات المتصفح هنا لتجنّب التكرار.
          </li>
          <li>في التطبيق الأصلي يُحترم الوضع الصامت وعدم الإزعاج تلقائيًا؛ في المتصفح يتبع الصوت مستوى صوت الوسائط.</li>
        </ul>
      ) : (
        <ul className="list-disc space-y-0.5 ps-4">
          <li>
            <b>iPhone:</b> audio plays only while the app is open — iOS does not let web apps play sound in the background or on the Lock Screen. Use the .ics export for guaranteed alerts.
          </li>
          <li>
            <b>Android:</b> the native APK plays your voice and the Adhan in the background, locked and after reboot. If installed, turn browser notifications off here to avoid duplicates.
          </li>
          <li>The native app respects silent mode and Do Not Disturb; in the browser, media volume applies.</li>
        </ul>
      )}
    </div>
  );
}
