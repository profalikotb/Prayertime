'use client';
import { useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon, Row, Seg, Toggle } from './ui';
import HijriAdjust from './HijriAdjust';
import WidgetCard from './WidgetCard';
import { CITIES } from '@/data/cities';
import { METHODS, autoMethod, methodInfo } from '@/lib/methods';
import { PRAYER_NAMES } from '@/lib/i18n';
import { PRAYER_KEYS, type MethodKey, type Profile } from '@/lib/types';
import { profileFor } from '@/lib/prayer';
import { buildIcs, downloadIcs } from '@/lib/ics';
import { chime, hasAdhanFile, playAdhan, requestNotify, stopAdhan } from '@/lib/notify';
import { baseCalendar } from '@/lib/hijri';
import { resetAll } from '@/lib/storage';

const selectCls =
  'w-full rounded-xl border border-line/15 bg-surface px-3 py-2.5 text-[14px] font-semibold text-ink outline-none focus:border-emerald bg-[length:14px] bg-no-repeat';

export default function SettingsView() {
  const { t, s, set, place, refreshLocation, locStatus, today, opts, f } = useApp();
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const names = PRAYER_NAMES[s.lang];
  const pp: Profile = profileFor(place.cc);
  const ppLabel = pp === 'EG' ? t.egypt : pp === 'SA' ? t.saudi : t.other;
  const autoM = methodInfo(autoMethod(place.cc));

  const adj = (k: (typeof PRAYER_KEYS)[number], d: number) =>
    set((x) => ({ ...x, adjustments: { ...x.adjustments, [pp]: { ...x.adjustments[pp], [k]: Math.max(-30, Math.min(30, x.adjustments[pp][k] + d)) } } }));

  return (
    <div className="safe-top mx-auto grid max-w-5xl gap-3 md:grid-cols-2 md:items-start">
      <h1 className="px-1 font-display text-[24px] font-bold text-emerald md:col-span-2">{t.settings}</h1>

      <Card title={t.language} icon="gear">
        <Seg value={s.lang} onChange={(v) => set((x) => ({ ...x, lang: v }))} options={[{ v: 'ar', l: 'العربية' }, { v: 'en', l: 'English' }]} />
        <Row label={t.theme}>
          <Seg
            value={s.theme}
            onChange={(v) => set((x) => ({ ...x, theme: v }))}
            options={[
              { v: 'auto', l: t.themeAuto },
              { v: 'light', l: t.themeLight },
              { v: 'dark', l: t.themeDark },
            ]}
          />
        </Row>
        <Row label={t.timeFormat}>
          <Seg value={s.timeFormat} onChange={(v) => set((x) => ({ ...x, timeFormat: v }))} options={[{ v: '12', l: t.h12 }, { v: '24', l: t.h24 }]} />
        </Row>
        {s.lang === 'ar' && (
          <Row label={t.digitsLbl}>
            <Seg value={s.digits} onChange={(v) => set((x) => ({ ...x, digits: v }))} options={[{ v: 'arab', l: t.digitsArab }, { v: 'latn', l: t.digitsLatn }]} />
          </Row>
        )}
      </Card>

      <Card title={t.location} icon="pin">
        <Seg
          value={s.locationMode}
          onChange={(v) => {
            set((x) => ({ ...x, locationMode: v, manualCityId: v === 'manual' ? (x.manualCityId ?? 'cairo') : x.manualCityId }));
            if (v === 'auto') refreshLocation(true);
          }}
          options={[
            { v: 'auto', l: t.locAuto },
            { v: 'manual', l: t.locManual },
          ]}
        />
        {s.locationMode === 'manual' ? (
          <Row label={t.city}>
            <select className={selectCls} value={s.manualCityId ?? 'cairo'} onChange={(e) => set((x) => ({ ...x, manualCityId: e.target.value }))}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[s.lang]} — {c.country[s.lang]}
                </option>
              ))}
            </select>
          </Row>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-[13px]">
            <Icon name="pin" className="h-4 w-4 text-emerald" />
            <span className="flex-1">
              <b>{place.city[s.lang]}</b> {place.country[s.lang] && `· ${place.country[s.lang]}`}
              <span className="block text-[11px] text-muted" dir="ltr">
                {place.lat.toFixed(4)}, {place.lng.toFixed(4)} · {place.tz}
              </span>
            </span>
            <button type="button" onClick={() => refreshLocation(true)} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald/10 text-emerald" aria-label={t.updateLocation}>
              <Icon name="refresh" className={`h-4 w-4 ${locStatus === 'locating' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
        {(locStatus === 'denied' || locStatus === 'failed') && s.locationMode === 'auto' && (
          <div className="mt-3 rounded-xl bg-gold/10 p-3 text-[12px] leading-6 text-ink/85">
            <p className="font-bold text-gold">
              {s.lang === 'ar' ? 'المتصفح منع تحديد الموقع' : 'The browser blocked location'}
              {place.source === 'gps' && (s.lang === 'ar' ? ' — يُستخدم آخر موقع محفوظ' : ' — using the last saved location')}
            </p>
            {s.lang === 'ar' ? (
              <ol className="mt-1 list-decimal space-y-0.5 ps-5">
                <li>الإعدادات ← الخصوصية والأمن ← <b>خدمات الموقع</b>: مفعّلة.</li>
                <li>في نفس الصفحة: <b>مواقع Safari</b> ← «أثناء استخدام التطبيق» + تفعيل «الموقع الدقيق».</li>
                <li>الإعدادات ← التطبيقات ← <b>Safari</b> ← الموقع ← «السماح» أو «اسأل».</li>
                <li>أغلق التطبيق تمامًا (اسحبه لأعلى) ثم افتحه واضغط زر التحديث ↻ واختر «السماح».</li>
              </ol>
            ) : (
              <ol className="mt-1 list-decimal space-y-0.5 ps-5">
                <li>Settings → Privacy &amp; Security → <b>Location Services</b>: on.</li>
                <li>Same page: <b>Safari Websites</b> → “While Using the App” + Precise Location on.</li>
                <li>Settings → Apps → <b>Safari</b> → Location → Allow or Ask.</li>
                <li>Close the app fully, reopen it, tap ↻ and choose Allow.</li>
              </ol>
            )}
            <p className="mt-1 text-muted">{s.lang === 'ar' ? 'أو اختر «يدوي» واختر مدينتك.' : 'Or switch to Manual and pick your city.'}</p>
          </div>
        )}
      </Card>

      <Card title={t.method} icon="sun">
        <select className={selectCls} value={s.method} onChange={(e) => set((x) => ({ ...x, method: e.target.value as MethodKey | 'auto' }))}>
          <option value="auto">
            {t.auto} — {autoM.name[s.lang]}
          </option>
          {METHODS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name[s.lang]} ({m.detail})
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-muted" dir="auto">
          AlAdhan #{methodInfo(s.method === 'auto' ? autoM.key : s.method).aladhan} · {methodInfo(s.method === 'auto' ? autoM.key : s.method).detail}
        </p>
        <Row label={t.asrSchool}>
          <Seg value={s.madhab} onChange={(v) => set((x) => ({ ...x, madhab: v }))} options={[{ v: 'shafi', l: t.shafi }, { v: 'hanafi', l: t.hanafi }]} />
        </Row>
        <Row label={t.adjustments} hint={`${t.adjFor} ${ppLabel}`}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {PRAYER_KEYS.map((k) => {
              const v = s.adjustments[pp][k];
              return (
                <div key={k} className="flex items-center justify-between rounded-xl bg-ink/[.04] px-1.5 py-1">
                  <button type="button" onClick={() => adj(k, -1)} className="h-8 w-8 rounded-lg bg-surface text-[18px] font-bold shadow-sm" aria-label="-1">
                    −
                  </button>
                  <span className="text-center text-[12px] font-semibold leading-4">
                    {names[k]}
                    <span className={`tnum block text-[13px] font-extrabold ${v ? 'text-gold' : 'text-muted'}`} dir="ltr">
                      {f.n(v > 0 ? `+${v}` : v)}
                    </span>
                  </span>
                  <button type="button" onClick={() => adj(k, 1)} className="h-8 w-8 rounded-lg bg-surface text-[18px] font-bold shadow-sm" aria-label="+1">
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </Row>
      </Card>

      <Card title={t.hijriAdjust} icon="calendar">
        <Row label={t.hijriCountry}>
          <Seg
            value={s.hijriCountry}
            onChange={(v) => set((x) => ({ ...x, hijriCountry: v }))}
            options={[
              { v: 'auto', l: t.byLocation },
              { v: 'EG', l: t.egypt },
              { v: 'SA', l: t.saudi },
            ]}
          />
        </Row>
        <HijriAdjust />
        <p className="mt-3 text-[11px] leading-5 text-muted">
          {s.lang === 'ar'
            ? 'التصحيح يغيّر التاريخ الهجري والعدّادات فقط، ولا يغيّر مواقيت الصلاة. التلقائي: إعلانات دار الإفتاء المصرية المسجلة ثم تقويم أم القرى.'
            : 'Corrections affect Hijri dates and countdowns only — never prayer times. Auto: recorded official announcements, then the Umm al-Qura calendar.'}{' '}
          <span dir="ltr">[{baseCalendar()}]</span>
        </p>
      </Card>

      <Card title={t.notifications} icon="bell">
        <Toggle
          on={s.notify.enabled}
          label={t.notifEnable}
          onChange={async (on) => {
            if (on) {
              const r = await requestNotify();
              setNotifMsg(r === 'denied' ? t.notifDenied : null);
            }
            set((x) => ({ ...x, notify: { ...x.notify, enabled: on } }));
          }}
        />
        {notifMsg && <p className="text-[12px] text-gold">{notifMsg}</p>}
        <Row label={t.notifBefore}>
          <Seg
            value={s.notify.beforeMin}
            onChange={(v) => set((x) => ({ ...x, notify: { ...x.notify, beforeMin: v } }))}
            options={[5, 10, 15, 20, 30].map((m) => ({ v: m, l: f.n(m) }))}
          />
        </Row>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 py-1 text-[13px]">
          <span />
          <span className="text-[11px] font-bold text-muted">{t.before}</span>
          <span className="text-[11px] font-bold text-muted">{t.atTime}</span>
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((k) => (
            <div key={k} className="contents">
              <span className="font-semibold">{names[k]}</span>
              {(['before', 'at'] as const).map((w) => (
                <input
                  key={w}
                  type="checkbox"
                  className="h-5 w-5 justify-self-center accent-[rgb(var(--emerald))]"
                  checked={s.notify.perPrayer[k][w]}
                  onChange={(e) =>
                    set((x) => ({ ...x, notify: { ...x.notify, perPrayer: { ...x.notify.perPrayer, [k]: { ...x.notify.perPrayer[k], [w]: e.target.checked } } } }))
                  }
                />
              ))}
            </div>
          ))}
        </div>
        <Row label={t.sound}>
          <Seg
            value={s.notify.sound}
            onChange={async (v) => {
              if (v === 'adhan' && !(await hasAdhanFile())) {
                setNotifMsg(s.lang === 'ar' ? 'ملف الأذان غير موجود (public/adhan.mp3) — ستُستخدم النغمة.' : 'No Adhan file (public/adhan.mp3) — the chime will be used.');
              }
              set((x) => ({ ...x, notify: { ...x.notify, sound: v } }));
            }}
            options={[
              { v: 'chime', l: t.chime },
              { v: 'adhan', l: t.adhan },
              { v: 'silent', l: t.silent },
            ]}
          />
        </Row>
        <button
          type="button"
          onClick={() => (s.notify.sound === 'adhan' ? (stopAdhan(), void playAdhan()) : chime())}
          className="text-[12.5px] font-bold text-emerald"
        >
          {t.testSound}
        </button>
        <Toggle on={s.notify.vibrate} label={t.vibrate} onChange={(v) => set((x) => ({ ...x, notify: { ...x.notify, vibrate: v } }))} />
        <Toggle on={s.notify.ramadan} label={t.ramadanReminders} onChange={(v) => set((x) => ({ ...x, notify: { ...x.notify, ramadan: v } }))} />
        <p className="mt-2 rounded-xl bg-gold/10 p-3 text-[12px] leading-5 text-ink/80">{t.notifIosNote}</p>
        <button
          type="button"
          onClick={() => downloadIcs(buildIcs(today, 30, place, opts, s.notify, s.lang), `prayer-times-${place.city.en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald py-3 text-[14px] font-bold text-white"
        >
          <Icon name="download" className="h-4 w-4" />
          {t.exportIcs}
        </button>
      </Card>

      <WidgetCard />

      <Card title={t.about} icon="info" className="md:col-span-2">
        <p className="text-[12.5px] leading-6 text-ink/80">
          {s.lang === 'ar'
            ? 'مواقيت الصلاة تُحسب فلكيًا على الجهاز (مكتبة adhan) وتعمل دون إنترنت. التواريخ الهجرية: إعلانات رسمية مسجّلة ثم تقويم أم القرى. الوقائع التاريخية من قاعدة بيانات منتقاة موثقة المصادر، ويُشار إلى المختلف في تاريخه.'
            : 'Prayer times are computed astronomically on-device (adhan library) and work offline. Hijri dates: recorded official announcements, then Umm al-Qura. Historical events come from a curated, sourced database with disputed dates flagged.'}
        </p>
        <p className="mt-2 text-[12px] text-muted">{t.install}</p>
        <button
          type="button"
          onClick={() => {
            if (confirm(t.resetConfirm)) {
              resetAll();
              location.reload();
            }
          }}
          className="mt-3 rounded-xl border border-[#c0392b]/40 px-4 py-2 text-[13px] font-bold text-[#c0392b]"
        >
          {t.reset}
        </button>
      </Card>
    </div>
  );
}
