'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon, Row, Seg, Toggle } from './ui';
import { PRAYER_NAMES } from '@/lib/i18n';
import type { FivePrayer } from '@/lib/types';
import {
  EVT,
  FIVE,
  PLAYING_EVT,
  listClips,
  nowPlaying,
  playSound,
  soundLabel,
  voiceSoundFor,
  DEFAULT_ADHAN,
  hasVoiceFor,
  REMINDER_MINUTES,
  stopAll,
  type ClipMeta,
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


/** «التنبيه بصوتي قبل الصلاة» + «مكتبة الأذان» */
export default function AudioSettings() {
  const { s, set, f } = useApp();
  const ar = s.lang === 'ar';
  const names = PRAYER_NAMES[s.lang];
  const clips = useClips();
  const playing = usePlaying();
  const a = s.audio;

  const setVoice = (fn: (v: typeof a.voice) => typeof a.voice) => set((x) => ({ ...x, audio: { ...x.audio, voice: fn(x.audio.voice) } }));


  const test = (k: FivePrayer, which: 'v' | 'a') => {
    const tag = `test-${k}-${which}`;
    if (playing === tag) return stopAll();
    if (which === 'v') {
      void playSound(voiceSoundFor(a.voice.perPrayer[k].sound, a.voice.minutes || 15), { volume: 1, tag });
    } else void playSound(DEFAULT_ADHAN, { volume: 1, tag });
  };

  // only two choices: the recorded reminder, or the soft chime (no device/TTS voices)
  const voiceOptions = [
    { v: 'own', l: soundLabel('own', clips, s.lang) },
    { v: 'chime', l: soundLabel('chime', clips, s.lang) },
  ];

  return (
    <>
      {/* ───────────── Voice reminder ───────────── */}
      <Card title={ar ? 'التنبيه بصوتي قبل الصلاة' : 'My voice prayer reminder'} icon="mic" className="md:col-span-2">
        <div id="audio" className="-mt-1 mb-2 text-[12px] leading-5 text-muted">
          {ar
            ? 'صوتي (تسجيلي) قبل كل صلاة بالمدة التي تختارها (٥ إلى ٢٥ دقيقة، الافتراضي ١٥) بأعلى مستوى صوت، أو نغمة هادئة — اختر لكل صلاة.'
            : 'Before each prayer (5–25 min): your recorded reminder or a soft chime — choose per prayer.'}
        </div>
        <Toggle on={a.voice.enabled} label={ar ? 'تفعيل التنبيه الصوتي' : 'Enable voice reminder'} onChange={(v) => setVoice((x) => ({ ...x, enabled: v }))} />
        {!s.notify.enabled && a.voice.enabled && (
          <p className="mb-1 rounded-lg bg-gold/10 px-2.5 py-1.5 text-[12px] text-gold">
            {ar ? 'فعّل «التنبيهات» في بطاقة التنبيهات حتى يعمل.' : 'Turn on Notifications (card above) for it to run.'}
          </p>
        )}
        <Row label={ar ? 'قبل الأذان بـ (دقائق)' : 'Minutes before the Adhan'}>
          <Seg value={a.voice.minutes || 15} onChange={(v) => setVoice((x) => ({ ...x, minutes: v }))} options={REMINDER_MINUTES.map((m) => ({ v: m, l: f.n(m) }))} />
        </Row>
        {!hasVoiceFor(a.voice.minutes || 15) && (
          <p className="mb-1 rounded-lg bg-gold/10 px-2.5 py-1.5 text-[11.5px] text-ink/80">
            {ar
              ? `لا يوجد تسجيل بعد لـ ${f.n(a.voice.minutes)} دقيقة؛ تُشغَّل النغمة الهادئة ويظهر الإشعار بالوقت الصحيح.`
              : `No recording yet for ${a.voice.minutes} min; the soft chime plays with the correct time in the notification.`}
          </p>
        )}
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

      {/* ───────────── Adhan: Sheikh Mohamed Refaat (short) only ───────────── */}
      <Card title={ar ? 'الأذان' : 'Adhan'} icon="bell" className="md:col-span-2">
        <p className="-mt-1 mb-2 text-[12px] leading-5 text-muted">
          {ar ? 'عند دخول وقت كل صلاة يُرفع أذان الشيخ محمد رفعت (مختصر، دقيقة واحدة). أوقفه لأي صلاة من المربع بجانبها.' : 'At each prayer time: Sheikh Mohamed Refaat’s Adhan (short, one minute). Untick a prayer to turn it off.'}
        </p>
        <div className="grid gap-1.5">
          {FIVE.map((k) => {
            const tag = `test-${k}-a`;
            const on = s.notify.perPrayer[k].at;
            return (
              <div key={k} className={`grid grid-cols-[auto_4.2rem_minmax(0,1fr)_auto] items-center gap-2 ${on ? '' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  aria-label={names[k]}
                  className="h-5 w-5 accent-[rgb(var(--emerald))]"
                  checked={on}
                  onChange={(e) => set((x) => ({ ...x, notify: { ...x.notify, perPrayer: { ...x.notify.perPrayer, [k]: { ...x.notify.perPrayer[k], at: e.target.checked } } } }))}
                />
                <span className="text-[13.5px] font-bold">{names[k]}</span>
                <span className="truncate rounded-lg border border-line/15 px-2 py-2 text-[13px] font-semibold">{ar ? '🕌 الشيخ محمد رفعت – مختصر' : '🕌 Sheikh Mohamed Refaat – short'}</span>
                <button type="button" onClick={() => test(k, 'a')} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald/10 text-emerald" aria-label={ar ? 'تجربة' : 'Preview'}>
                  <Icon name={playing === tag ? 'stop' : 'play'} className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-2 rounded-lg bg-emerald/10 px-2.5 py-1.5 text-[12px] font-bold text-emerald">
          {ar ? '🔊 التنبيه والأذان يعملان دائمًا بأعلى مستوى صوت (إجباري).' : '🔊 Reminder and Adhan always play at maximum volume (mandatory).'}
        </p>
        <AudioLimits />
      </Card>
    </>
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
          <li>في تطبيق أندرويد: التنبيه إجباري — يرفع صوت المنبّه لأعلى مستوى ويعمل حتى في الوضع الصامت، ثم يعيد مستوى الصوت كما كان. في المتصفح يتبع الصوت مستوى صوت الوسائط في الجهاز.</li>
        </ul>
      ) : (
        <ul className="list-disc space-y-0.5 ps-4">
          <li>
            <b>iPhone:</b> audio plays only while the app is open — iOS does not let web apps play sound in the background or on the Lock Screen. Use the .ics export for guaranteed alerts.
          </li>
          <li>
            <b>Android:</b> the native APK plays your voice and the Adhan in the background, locked and after reboot. If installed, turn browser notifications off here to avoid duplicates.
          </li>
          <li>Android app: mandatory — raises the alarm volume to maximum, plays even in silent mode, then restores it. In the browser, the device media volume applies.</li>
        </ul>
      )}
    </div>
  );
}
