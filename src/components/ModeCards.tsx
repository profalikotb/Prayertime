'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon, Row, Seg, Toggle } from './ui';
import { wallClock } from '@/lib/civil';
import { activeSurgery, distanceKm, surgeryWindows, travelState, type Home } from '@/lib/modes';
import { PRAYER_NAMES } from '@/lib/i18n';

/* ───────────────────────── Surgery mode ───────────────────────── */
export function SurgeryCard() {
  const { s, set, f, now, today, times, place } = useApp();
  const ar = s.lang === 'ar';
  const windows = useMemo(() => {
    const w = wallClock(times.today.dhuhr, place.tz);
    return surgeryWindows(s, today, times.today, w.h * 60 + w.min);
  }, [s, today, times, place.tz]);
  const active = activeSurgery(windows, now.getTime());
  const names = PRAYER_NAMES[s.lang];

  const start = (h: number) => set((x) => ({ ...x, surgery: { from: Date.now(), until: Date.now() + h * 3600_000 } }));
  const stop = () =>
    set((x) => ({ ...x, surgery: x.surgery ? { ...x.surgery, until: Math.min(x.surgery.until, Date.now()) } : null }));

  if (active) {
    const inside = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).filter((k) => {
      const t = times.today[k].getTime();
      return t >= active.start && t < active.end;
    });
    return (
      <section className="card border-2 border-[#c2523b]/40 bg-[#c2523b]/5 p-4">
        <div className="flex items-center gap-2">
          <span className="text-[22px]">🏥</span>
          <div className="flex-1">
            <p className="text-[15px] font-extrabold">{ar ? 'وضع العمليات — التنبيهات صامتة' : 'Surgery mode — alerts are silent'}</p>
            <p className="text-[12.5px] text-muted">
              {active.name} · {ar ? 'حتى' : 'until'} <span className="tnum">{f.time(new Date(active.end))}</span>
            </p>
          </div>
          {active.manual && (
            <button type="button" onClick={stop} className="rounded-lg bg-[#c2523b] px-3 py-2 text-[13px] font-bold text-white">
              {ar ? 'إنهاء' : 'End'}
            </button>
          )}
        </div>
        {inside.length > 0 && (
          <p className="mt-2 rounded-lg bg-surface/70 px-3 py-2 text-[12.5px] leading-6">
            {ar ? 'يقع خلال العمليات: ' : 'Falls during surgery: '}
            <b>{inside.map((k) => `${names[k]} ${f.time(times.today[k])}`).join(' · ')}</b>
            <br />
            <span className="text-muted">{ar ? 'ستصلك تذكرة واحدة عند انتهاء العمليات.' : 'You will get one reminder when surgery ends.'}</span>
          </p>
        )}
      </section>
    );
  }
  return (
    <section className="card flex flex-wrap items-center gap-2 p-3">
      <span className="text-[13px] font-bold">🏥 {ar ? 'في العمليات؟ أسكِت التنبيهات لمدة:' : 'In theatre? Silence alerts for:'}</span>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 6].map((h) => (
          <button key={h} type="button" onClick={() => start(h)} className="tnum rounded-lg bg-[#c2523b]/10 px-2.5 py-1.5 text-[12.5px] font-bold text-[#c2523b]">
            {f.n(h)} {ar ? 'س' : 'h'}
          </button>
        ))}
      </div>
      {windows.some((w) => !w.manual && w.end > now.getTime()) && (
        <span className="w-full text-[11.5px] text-muted">
          {ar ? 'يُفعَّل تلقائيًا أثناء مواعيد «عمليات» في جدولي.' : 'Turns on automatically during «Surgery» entries of your schedule.'}
        </span>
      )}
    </section>
  );
}

/* ───────────────────────── Travel mode ───────────────────────── */
export function TravelCard() {
  const { s, f, place, times } = useApp();
  const ar = s.lang === 'ar';
  const tr = s.travel;
  if (!tr?.enabled || place.source === 'default' || place.source === 'approx') return null;
  const st = travelState(place, tr.homes, tr.km);
  if (!st.travelling) return null;
  const t = times.today;
  return (
    <Card title={ar ? 'أنت مسافر — رخصة القصر والجمع' : 'Travelling — shortening & combining'} icon="pin" className="border border-[#4b6cb7]/30">
      <p className="-mt-1 text-[12.5px] text-muted">
        {ar
          ? `على بُعد ${f.n(Math.round(st.km))} كم من ${st.nearest?.name ?? 'منزلك'} (مسافة القصر ${f.n(tr.km)} كم).`
          : `${Math.round(st.km)} km from ${st.nearest?.name ?? 'home'} (qasr distance ${tr.km} km).`}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {(
          [
            ['dhuhr', '٤ ← ٢'],
            ['asr', '٤ ← ٢'],
            ['isha', '٤ ← ٢'],
          ] as const
        ).map(([k]) => (
          <div key={k} className="rounded-xl bg-[#4b6cb7]/10 p-2">
            <p className="text-[12px] font-bold">{PRAYER_NAMES[s.lang][k]}</p>
            <p className="text-[15px] font-extrabold text-[#4b6cb7]">{ar ? 'ركعتان' : '2 rakʿas'}</p>
            <p className="text-[10.5px] text-muted">{ar ? 'بدل أربع' : 'instead of 4'}</p>
          </div>
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 text-[12.5px] leading-6">
        <li>
          <b>{ar ? 'جمع الظهر والعصر: ' : 'Dhuhr + Asr: '}</b>
          {ar ? 'تقديمًا في وقت الظهر ' : 'at Dhuhr '}
          <span className="tnum">{f.time(t.dhuhr)}</span>
          {ar ? ' أو تأخيرًا في وقت العصر ' : ' or at Asr '}
          <span className="tnum">{f.time(t.asr)}</span>
        </li>
        <li>
          <b>{ar ? 'جمع المغرب والعشاء: ' : 'Maghrib + Isha: '}</b>
          {ar ? 'تقديمًا في وقت المغرب ' : 'at Maghrib '}
          <span className="tnum">{f.time(t.maghrib)}</span>
          {ar ? ' أو تأخيرًا في وقت العشاء ' : ' or at Isha '}
          <span className="tnum">{f.time(t.isha)}</span>
        </li>
        <li className="text-muted">{ar ? 'الفجر والمغرب لا تُقصران.' : 'Fajr and Maghrib are not shortened.'}</li>
      </ul>
      <p className="mt-2 text-[10.5px] leading-4 text-muted">
        {ar
          ? 'النساء ١٠١ · «صدقة تصدّق الله بها عليكم فاقبلوا صدقته» صحيح مسلم ٦٨٦ · جمع النبي ﷺ في السفر: صحيح البخاري ١١٠٧ · «كان ابن عمر وابن عباس يقصران ويفطران في أربعة بُرُد» البخاري تعليقًا. فيه خلاف معتبر في المسافة (الجمهور نحو ٨٠–٨٥ كم، ومن العلماء من ردّها إلى العرف)، وفي مدة الإقامة التي ينقطع بها حكم السفر (الجمهور: نية إقامة أكثر من أربعة أيام).'
          : 'Qurʾan 4:101 · Muslim 686 · Bukhari 1107 · Ibn ʿUmar & Ibn ʿAbbas: four burud (Bukhari, taʿliq). Scholars differ on the distance (majority ≈ 80–85 km; some defer to custom) and on the length of stay that ends travel (majority: intending more than four days).'}
      </p>
    </Card>
  );
}

/* ───────────────────────── Settings: travel ───────────────────────── */
export function TravelSettings() {
  const { s, set, place, f } = useApp();
  const ar = s.lang === 'ar';
  const tr = s.travel;
  const [name, setName] = useState('');
  const setTr = (fn: (t: typeof tr) => typeof tr) => set((x) => ({ ...x, travel: fn(x.travel) }));
  return (
    <Card title={ar ? 'وضع السفر (القصر والجمع)' : 'Travel mode'} icon="pin">
      <Toggle on={tr.enabled} label={ar ? 'إظهار رخصة القصر والجمع عند السفر' : 'Show shortening/combining when travelling'} onChange={(v) => setTr((t) => ({ ...t, enabled: v }))} />
      <Row label={ar ? 'مسافة القصر (كم)' : 'Qasr distance (km)'} hint={ar ? 'الشائع ٨٣ كم؛ اتبع مذهبك.' : 'Commonly 83 km; follow your school.'}>
        <Seg value={tr.km} onChange={(v) => setTr((t) => ({ ...t, km: v }))} options={[80, 83, 85, 89].map((k) => ({ v: k, l: f.n(k) }))} />
      </Row>
      <p className="mb-1 mt-2 text-[12.5px] font-bold">{ar ? 'أماكن الإقامة (لا يُعدّ فيها مسافرًا)' : 'Home places'}</p>
      <ul className="grid gap-1.5">
        {tr.homes.map((h: Home) => (
          <li key={h.id} className="flex items-center gap-2 rounded-lg bg-ink/[.03] px-2.5 py-1.5 text-[13px]">
            <Icon name="pin" className="h-4 w-4 text-emerald" />
            <span className="flex-1 font-semibold">{h.name}</span>
            <span className="tnum text-[11.5px] text-muted">{f.n(Math.round(distanceKm(place, h)))} {ar ? 'كم' : 'km'}</span>
            <button type="button" onClick={() => setTr((t) => ({ ...t, homes: t.homes.filter((x) => x.id !== h.id) }))} className="text-[#c0392b]" aria-label={ar ? 'حذف' : 'Remove'}>
              <Icon name="x" className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={ar ? 'اسم المكان (مثل: المنزل)' : 'Name (e.g. Home)'}
          className="min-w-0 flex-1 rounded-lg border border-line/15 bg-surface px-2.5 py-2 text-[13px]"
        />
        <button
          type="button"
          onClick={() => {
            setTr((t) => ({ ...t, homes: [...t.homes, { id: `h${Date.now().toString(36)}`, name: name.trim() || place.city[s.lang], lat: place.lat, lng: place.lng }] }));
            setName('');
          }}
          className="shrink-0 rounded-lg bg-emerald px-3 py-2 text-[12.5px] font-bold text-white"
        >
          {ar ? '＋ موقعي الحالي' : '＋ Current location'}
        </button>
      </div>
    </Card>
  );
}

/* ───────────────────────── Settings: move to another device ───────────────────────── */
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export function TransferSettings() {
  const { s } = useApp();
  const ar = s.lang === 'ar';
  const [msg, setMsg] = useState('');
  const [link, setLink] = useState('');
  useEffect(() => {
    // exclude per-device state (manual surgery switch)
    const { surgery: _surgery, ...rest } = s; // eslint-disable-line @typescript-eslint/no-unused-vars
    setLink(`${location.origin}/#import=${b64(JSON.stringify(rest))}`);
  }, [s]);
  return (
    <Card title={ar ? 'نقل الإعدادات إلى جهاز آخر' : 'Move settings to another device'} icon="share">
      <p className="-mt-1 mb-2 text-[12.5px] leading-6 text-muted">
        {ar
          ? 'رابط واحد يحمل كل إعداداتك (الطريقة، التنبيهات، جدولي، أماكن الإقامة…). افتحه على الجهاز الآخر فتُنسخ الإعدادات إليه. لا يُرفع شيء لأي خادم.'
          : 'One link carries all your settings. Open it on the other device to copy them. Nothing is uploaded to a server.'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: ar ? 'إعدادات مواقيت الصلاة' : 'Prayer Times settings', url: link });
              else {
                await navigator.clipboard.writeText(link);
                setMsg(ar ? '✓ نُسخ الرابط — أرسله لنفسك على واتساب' : '✓ Link copied');
              }
            } catch {
              /* cancelled */
            }
          }}
          className="flex-1 rounded-xl bg-emerald py-2.5 text-[13.5px] font-bold text-white"
        >
          {ar ? 'مشاركة الرابط' : 'Share link'}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setMsg(ar ? '✓ نُسخ الرابط' : '✓ Copied');
            } catch {
              setMsg(ar ? 'تعذّر النسخ' : 'Copy failed');
            }
          }}
          className="rounded-xl border border-emerald/30 px-4 py-2.5 text-[13px] font-bold text-emerald"
        >
          {ar ? 'نسخ' : 'Copy'}
        </button>
      </div>
      {msg && <p className="mt-1.5 text-[12px] text-emerald">{msg}</p>}
    </Card>
  );
}
