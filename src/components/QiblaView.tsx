'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon } from './ui';
import { compassPoint, distanceToKaabaKm, qiblaBearing } from '@/lib/qibla';
import { angleDelta, declination, sunQiblaTimes } from '@/lib/compass';
import { wallClock } from '@/lib/civil';

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type Mode = 'probing' | 'idle' | 'live' | 'unavailable' | 'denied';

const GRANT_KEY = 'pakpt.compass';

/**
 * Qibla compass.
 * Accuracy: magnetic → true north via WMM-2025 declination; great-circle bearing; accuracy-aware tolerance.
 * Stability: vector (sin/cos) low-pass filter with adaptive gain, 0.4° dead-band, rAF-driven rendering,
 *            unwrapped rotation (no 359°→0° spin), tilt warning.
 * Direct start: listens silently first — if iOS already granted motion access, it goes live with no tap.
 */
export default function QiblaView() {
  const { t, f, s, place, now } = useApp();
  const ar = s.lang === 'ar';
  const bearing = qiblaBearing(place.lat, place.lng);
  const km = distanceToKaabaKm(place.lat, place.lng);
  const decl = useMemo(() => declination(place.lat, place.lng), [place.lat, place.lng]);

  const [mode, setMode] = useState<Mode>('probing');
  const [heading, setHeading] = useState<number | null>(null); // true heading, filtered
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [tilted, setTilted] = useState(false);

  const vec = useRef<{ x: number; y: number } | null>(null);
  const shown = useRef<number | null>(null);
  const unwrapped = useRef(0);
  const raf = useRef(0);
  const lastEvent = useRef(0);
  const buzzed = useRef(false);
  const needsPermission =
    typeof window !== 'undefined' && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })?.requestPermission === 'function';

  const onEvt = useCallback(
    (e: Event) => {
      const ev = e as OrientationEvt;
      let mag: number | null = null;
      if (typeof ev.webkitCompassHeading === 'number' && ev.webkitCompassHeading >= 0) {
        mag = ev.webkitCompassHeading; // iOS: degrees from magnetic north
        if (typeof ev.webkitCompassAccuracy === 'number') setAccuracy(ev.webkitCompassAccuracy);
      } else if ((ev.absolute || e.type === 'deviceorientationabsolute') && typeof ev.alpha === 'number') {
        const screenAngle = (screen.orientation?.angle ?? 0) as number;
        mag = (360 - ev.alpha + screenAngle) % 360; // Android: absolute frame (magnetic)
      }
      if (mag === null) return;
      lastEvent.current = Date.now();
      setTilted(typeof ev.beta === 'number' && typeof ev.gamma === 'number' && (Math.abs(ev.beta) > 50 || Math.abs(ev.gamma) > 50));

      const trueH = (mag + decl + 360) % 360;
      const x = Math.cos(trueH * (Math.PI / 180));
      const y = Math.sin(trueH * (Math.PI / 180));
      const v = vec.current;
      if (!v) vec.current = { x, y };
      else {
        const cur = (Math.atan2(v.y, v.x) * 180) / Math.PI;
        const jump = Math.abs(angleDelta(cur, trueH));
        // adaptive gain: heavy smoothing when holding still, responsive when turning
        const k = Math.min(0.5, Math.max(0.06, jump / 40));
        v.x += (x - v.x) * k;
        v.y += (y - v.y) * k;
      }
    },
    [decl],
  );

  // render loop: publish heading at display rate, skipping sub-0.4° noise
  useEffect(() => {
    if (mode !== 'live' && mode !== 'probing') return;
    const tick = () => {
      const v = vec.current;
      if (v) {
        const h = ((Math.atan2(v.y, v.x) * 180) / Math.PI + 360) % 360;
        const prev = shown.current;
        if (prev === null || Math.abs(angleDelta(prev, h)) >= 0.4) {
          if (prev !== null) unwrapped.current += angleDelta(prev, h);
          else unwrapped.current = h;
          shown.current = h;
          setHeading(h);
        }
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [mode]);

  // attach listeners; in 'probing' we listen without asking — iOS delivers events if access was granted before
  useEffect(() => {
    if (mode !== 'live' && mode !== 'probing') return;
    window.addEventListener('deviceorientationabsolute', onEvt as EventListener, true);
    window.addEventListener('deviceorientation', onEvt as EventListener, true);
    const probe = setTimeout(
      () => {
        if (lastEvent.current) setMode('live');
        else if (mode === 'probing') setMode(needsPermission ? 'idle' : 'unavailable');
        else setMode('unavailable');
      },
      mode === 'probing' ? 900 : 3000,
    );
    return () => {
      clearTimeout(probe);
      window.removeEventListener('deviceorientationabsolute', onEvt as EventListener, true);
      window.removeEventListener('deviceorientation', onEvt as EventListener, true);
    };
  }, [mode, onEvt, needsPermission]);

  const enable = async () => {
    try {
      if (needsPermission) {
        const r = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (r !== 'granted') return setMode('denied');
        try {
          localStorage.setItem(GRANT_KEY, '1');
        } catch {
          /* ignore */
        }
      }
      lastEvent.current = 0;
      setMode('live');
    } catch {
      setMode('unavailable');
    }
  };

  const live = mode === 'live' && heading !== null;
  const rel = live ? (bearing - (heading as number) + 360) % 360 : bearing; // Qibla relative to phone top
  const off = live ? Math.abs(angleDelta(heading as number, bearing)) : 999;
  const poor = accuracy !== null && (accuracy < 0 || accuracy > 15);
  const tol = accuracy !== null && accuracy >= 0 && accuracy <= 8 ? 3 : 5;
  const facing = live && off <= tol;

  useEffect(() => {
    if (facing && !buzzed.current) {
      buzzed.current = true;
      try {
        navigator.vibrate?.(40);
      } catch {
        /* iOS: no vibration API */
      }
    }
    if (!facing && off > tol + 3) buzzed.current = false;
  }, [facing, off, tol]);

  // dial rotates by −heading (unwrapped so it never spins the long way round 0°/360°)
  const dialRot = live ? -unwrapped.current : 0;

  // compass-free check by the sun (today, local)
  const sun = useMemo(() => {
    const w = wallClock(now, place.tz);
    const midnight = new Date(now.getTime() - ((w.h * 60 + w.min) * 60 + w.s) * 1000);
    return sunQiblaTimes(midnight, place.lat, place.lng, bearing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.lat, place.lng, place.tz, bearing, Math.floor(now.getTime() / 3_600_000)]);

  const deg = (v: number, d = 1) => f.n(v.toFixed(d)).replace('.', ar && s.digits === 'arab' ? '٫' : '.');

  return (
    <div className="safe-top mx-auto grid max-w-lg gap-3">
      <Card title={t.qibla} icon="compass">
        <button
          type="button"
          onClick={mode === 'idle' ? enable : undefined}
          className="relative mx-auto block aspect-square w-full max-w-[330px]"
          aria-label={mode === 'idle' ? t.enableCompass : t.qibla}
        >
          {/* fixed phone-direction marker */}
          <div
            className={`absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent ${facing ? 'border-t-emerald' : 'border-t-gold'}`}
          />
          <svg
            viewBox="0 0 300 300"
            className="h-full w-full"
            style={{ transform: `rotate(${dialRot}deg)`, transition: live ? 'transform 120ms linear' : 'none', willChange: 'transform' }}
          >
            <circle cx="150" cy="150" r="140" className={facing ? 'fill-emerald/10' : 'fill-surface'} />
            <circle cx="150" cy="150" r="140" fill="none" className="stroke-line/15" strokeWidth="1.5" />
            <circle cx="150" cy="150" r="118" fill="none" className={facing ? 'stroke-emerald' : 'stroke-emerald/25'} strokeWidth={facing ? 3 : 1} />
            {Array.from({ length: 72 }, (_, i) => {
              const a = (i * 5 * Math.PI) / 180;
              const long = i % 6 === 0;
              const r1 = long ? 124 : 129;
              return (
                <line
                  key={i}
                  x1={150 + Math.sin(a) * r1}
                  y1={150 - Math.cos(a) * r1}
                  x2={150 + Math.sin(a) * 136}
                  y2={150 - Math.cos(a) * 136}
                  className="stroke-ink/30"
                  strokeWidth={long ? 1.6 : 0.8}
                />
              );
            })}
            {(['N', 'E', 'S', 'W'] as const).map((c, i) => {
              const a = (i * 90 * Math.PI) / 180;
              const cx = 150 + Math.sin(a) * 104;
              const cy = 150 - Math.cos(a) * 104;
              return (
                <text
                  key={c}
                  x={cx}
                  y={cy + 6}
                  textAnchor="middle"
                  className={i === 0 ? 'fill-[#c0392b]' : 'fill-muted'}
                  style={{ font: '700 17px "Cairo Variable", sans-serif', transform: `rotate(${-dialRot}deg)`, transformOrigin: `${cx}px ${cy}px` }}
                >
                  {ar ? ['ش', 'ق', 'ج', 'غ'][i] : c}
                </text>
              );
            })}
            {/* Qibla arrow + Kaaba */}
            <g transform={`rotate(${bearing} 150 150)`}>
              <line x1="150" y1="150" x2="150" y2="46" className={facing ? 'stroke-emerald' : 'stroke-emerald/80'} strokeWidth="6" strokeLinecap="round" />
              <path d="M150 30 l13 24 h-26z" className="fill-emerald" />
              <g transform="translate(150 27)">
                <rect x="-12" y="-30" width="24" height="24" rx="3" fill="#1d1d1d" />
                <rect x="-12" y="-23" width="24" height="3.5" fill="#d9b061" />
              </g>
            </g>
            <circle cx="150" cy="150" r="7" className="fill-gold" />
          </svg>
          {mode === 'idle' && (
            <span className="absolute inset-0 grid place-items-center">
              <span className="rounded-2xl bg-emerald px-5 py-3 text-[15px] font-bold text-white shadow-lg">{t.enableCompass}</span>
            </span>
          )}
        </button>

        <div className="mt-3 text-center">
          {live ? (
            <>
              <p className={`text-[19px] font-extrabold ${facing ? 'text-emerald' : 'text-ink'}`}>
                {facing
                  ? `✓ ${t.facingQibla}`
                  : `${ar ? 'استدر' : 'Turn'} ${deg(off, 0)}° ${rel <= 180 ? (ar ? 'يمينًا ↻' : 'right ↻') : ar ? 'يسارًا ↺' : 'left ↺'}`}
              </p>
              <p className="tnum mt-1 text-[12px] text-muted">
                {ar ? `اتجاه الهاتف ${deg(heading as number, 0)}° · القبلة ${deg(bearing)}°` : `Heading ${deg(heading as number, 0)}° · Qibla ${deg(bearing)}°`}
              </p>
            </>
          ) : (
            <>
              <p className="tnum font-display text-[38px] font-bold leading-none text-emerald" dir="ltr">
                {deg(bearing)}°
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                {t.qiblaFromNorth} · {compassPoint(bearing, s.lang)}
              </p>
            </>
          )}
        </div>

        {live && tilted && <Note>{ar ? 'أمسك الهاتف أفقيًا (موازيًا للأرض) لقراءة دقيقة.' : 'Hold the phone flat (parallel to the ground) for an accurate reading.'}</Note>}
        {live && poor && <Note>{t.compassUnreliable}</Note>}
        {(mode === 'unavailable' || mode === 'denied') && (
          <Note>
            {mode === 'denied'
              ? ar
                ? 'رُفض إذن الحركة. أغلق التطبيق وافتحه ثم اضغط «تفعيل البوصلة» واختر «السماح». أو استخدم طريقة الشمس بالأسفل.'
                : 'Motion access was denied. Reopen the app, tap Enable compass and choose Allow — or use the sun method below.'
              : t.compassUnavailable}
          </Note>
        )}

        <dl className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px]">
          <div className="rounded-lg bg-ink/[.04] p-2">
            <dt className="text-muted">{ar ? 'القبلة' : 'Qibla'}</dt>
            <dd className="tnum text-[14px] font-bold" dir="ltr">
              {deg(bearing)}°
            </dd>
          </div>
          <div className="rounded-lg bg-ink/[.04] p-2">
            <dt className="text-muted">{ar ? 'تصحيح مغناطيسي' : 'Declination'}</dt>
            <dd className="tnum text-[14px] font-bold" dir="ltr">
              {decl >= 0 ? '+' : '−'}
              {deg(Math.abs(decl))}°
            </dd>
          </div>
          <div className="rounded-lg bg-ink/[.04] p-2">
            <dt className="text-muted">{ar ? 'الدقة' : 'Accuracy'}</dt>
            <dd className="tnum text-[14px] font-bold" dir="ltr">
              {accuracy !== null && accuracy >= 0 ? `±${f.n(Math.round(accuracy))}°` : '—'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title={ar ? 'تحقق بالشمس — دون بوصلة' : 'Check by the sun — no compass'} icon="sun">
        <p className="text-[12.5px] leading-6 text-ink/80">
          {ar
            ? 'أدق طريقة: في هذا الوقت تكون الشمس في اتجاه القبلة تمامًا من موقعك، فاستقبلها.'
            : 'Most accurate method: at this time the sun stands exactly in the Qibla direction from your location — face it.'}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-gold/10 p-2.5">
            <p className="text-[11px] font-semibold text-muted">{ar ? 'استقبل الشمس' : 'Face the sun'}</p>
            <p className="tnum text-[18px] font-extrabold">{sun.face ? f.time(sun.face) : '—'}</p>
          </div>
          <div className="rounded-xl bg-ink/[.04] p-2.5">
            <p className="text-[11px] font-semibold text-muted">{ar ? 'ظلك يشير للقبلة' : 'Your shadow points to it'}</p>
            <p className="tnum text-[18px] font-extrabold">{sun.shadow ? f.time(sun.shadow) : '—'}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted">
          {ar
            ? '— يعني أن الشمس لا تمر بهذا الاتجاه اليوم. حدّد الاتجاه مرة بالشمس ثم اتخذ معلمًا ثابتًا (جدار، نافذة) مرجعًا دائمًا.'
            : '— means the sun does not pass that direction today. Fix the direction once by the sun, then use a fixed landmark (wall, window) as a permanent reference.'}
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">{t.distanceKaaba}</span>
          <b className="tnum">
            {f.n(Math.round(km).toLocaleString('en'))} {ar ? 'كم' : 'km'}
          </b>
        </div>
        <div className="mt-2 flex items-center justify-between text-[13px]">
          <span className="text-muted">{t.location}</span>
          <b>{place.city[s.lang]}</b>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted">
          {ar
            ? 'للحصول على أدق قراءة: أمسك الهاتف أفقيًا، وابتعد نصف متر على الأقل عن المعادن والأجهزة والسماعات المغناطيسية، وإن ظهرت دقة ضعيفة حرّك الهاتف على شكل رقم ٨.'
            : 'Best accuracy: hold the phone flat, at least half a metre from metal, electronics and magnetic cases; if accuracy is poor, move it in a figure-8.'}
        </p>
      </Card>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-xl bg-gold/10 p-3 text-[12.5px] leading-5">
      <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <span>{children}</span>
    </p>
  );
}
