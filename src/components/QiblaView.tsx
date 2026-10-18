'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon } from './ui';
import { compassPoint, distanceToKaabaKm, qiblaBearing } from '@/lib/qibla';

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type Mode = 'idle' | 'live' | 'unavailable' | 'denied';

export default function QiblaView() {
  const { t, f, s, place } = useApp();
  const bearing = qiblaBearing(place.lat, place.lng);
  const km = distanceToKaabaKm(place.lat, place.lng);
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const smooth = useRef<number | null>(null);
  const buzzed = useRef(false);
  const lastEvent = useRef(0);

  const needsPermission = typeof window !== 'undefined' && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })?.requestPermission === 'function';

  useEffect(() => {
    if (mode !== 'live') return;
    const onEvt = (e: Event) => {
      const ev = e as OrientationEvt;
      let h: number | null = null;
      if (typeof ev.webkitCompassHeading === 'number' && !Number.isNaN(ev.webkitCompassHeading)) {
        h = ev.webkitCompassHeading;
        setAccuracy(typeof ev.webkitCompassAccuracy === 'number' ? ev.webkitCompassAccuracy : null);
      } else if (ev.absolute && typeof ev.alpha === 'number') {
        const screenAngle = (screen.orientation?.angle ?? 0) as number;
        h = (360 - ev.alpha + screenAngle) % 360;
      }
      if (h === null) return;
      lastEvent.current = Date.now();
      // circular low-pass filter to calm jitter
      const prev = smooth.current;
      if (prev === null) smooth.current = h;
      else {
        let d = h - prev;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        smooth.current = (prev + d * 0.25 + 360) % 360;
      }
      setHeading(smooth.current);
    };
    window.addEventListener('deviceorientationabsolute', onEvt as EventListener, true);
    window.addEventListener('deviceorientation', onEvt as EventListener, true);
    const watchdog = setTimeout(() => {
      if (!lastEvent.current) setMode('unavailable');
    }, 3000);
    return () => {
      clearTimeout(watchdog);
      window.removeEventListener('deviceorientationabsolute', onEvt as EventListener, true);
      window.removeEventListener('deviceorientation', onEvt as EventListener, true);
    };
  }, [mode]);

  const enable = async () => {
    try {
      if (needsPermission) {
        const r = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (r !== 'granted') return setMode('denied');
      }
      if (!('DeviceOrientationEvent' in window)) return setMode('unavailable');
      setMode('live');
    } catch {
      setMode('unavailable');
    }
  };

  // auto-start where no permission prompt is required (Android / desktop)
  useEffect(() => {
    if (!needsPermission && 'DeviceOrientationEvent' in window) setMode('live');
  }, [needsPermission]);

  const live = mode === 'live' && heading !== null;
  const rel = live ? (bearing - (heading as number) + 360) % 360 : bearing;
  const off = live ? Math.min(rel, 360 - rel) : 999;
  const facing = live && off <= 5;
  const unreliable = live && accuracy !== null && (accuracy < 0 || accuracy > 20);

  useEffect(() => {
    if (facing && !buzzed.current) {
      buzzed.current = true;
      try {
        navigator.vibrate?.(60);
      } catch {
        /* ignore */
      }
    }
    if (!facing) buzzed.current = false;
  }, [facing]);

  const dialRot = live ? -(heading as number) : 0;

  return (
    <div className="safe-top mx-auto grid max-w-lg gap-3">
      <Card title={t.qibla} icon="compass">
        <div className="relative mx-auto aspect-square w-full max-w-[320px]">
          {/* fixed phone-direction marker */}
          <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[14px] border-x-transparent border-t-gold" />
          <svg viewBox="0 0 300 300" className="h-full w-full" style={{ transform: `rotate(${dialRot}deg)`, transition: live ? 'transform .15s linear' : 'none' }}>
            <circle cx="150" cy="150" r="138" className="fill-surface stroke-line/15" strokeWidth="1.5" />
            <circle cx="150" cy="150" r="118" fill="none" className={facing ? 'stroke-gold' : 'stroke-emerald/25'} strokeWidth={facing ? 3 : 1} />
            {Array.from({ length: 72 }, (_, i) => {
              const a = (i * 5 * Math.PI) / 180;
              const long = i % 6 === 0;
              const r1 = long ? 124 : 129;
              return (
                <line
                  key={i}
                  x1={150 + Math.sin(a) * r1}
                  y1={150 - Math.cos(a) * r1}
                  x2={150 + Math.sin(a) * 135}
                  y2={150 - Math.cos(a) * 135}
                  className="stroke-ink/30"
                  strokeWidth={long ? 1.6 : 0.8}
                />
              );
            })}
            {(['N', 'E', 'S', 'W'] as const).map((c, i) => {
              const a = (i * 90 * Math.PI) / 180;
              const lbl = s.lang === 'ar' ? ['ش', 'ق', 'ج', 'غ'][i] : c;
              return (
                <text
                  key={c}
                  x={150 + Math.sin(a) * 104}
                  y={150 - Math.cos(a) * 104 + 6}
                  textAnchor="middle"
                  className={i === 0 ? 'fill-[#c0392b]' : 'fill-muted'}
                  style={{ font: '700 17px Cairo Variable, sans-serif', transform: `rotate(${-dialRot}deg)`, transformOrigin: `${150 + Math.sin(a) * 104}px ${150 - Math.cos(a) * 104}px` }}
                >
                  {lbl}
                </text>
              );
            })}
            {/* Qibla arrow */}
            <g transform={`rotate(${bearing} 150 150)`}>
              <line x1="150" y1="150" x2="150" y2="44" className="stroke-emerald" strokeWidth="5" strokeLinecap="round" />
              <path d="M150 30 l12 22 h-24z" className="fill-emerald" />
              <g transform="translate(150 30)">
                <rect x="-11" y="-30" width="22" height="22" rx="3" fill="#1d1d1d" />
                <rect x="-11" y="-24" width="22" height="3" fill="#d9b061" />
              </g>
            </g>
            <circle cx="150" cy="150" r="7" className="fill-gold" />
          </svg>
        </div>

        <div className="mt-3 text-center">
          <p className="tnum font-display text-[38px] font-bold leading-none text-emerald" dir="ltr">
            {f.n(bearing.toFixed(1)).replace('.', s.lang === 'ar' && s.digits === 'arab' ? '٫' : '.')}°
          </p>
          <p className="mt-1 text-[12.5px] text-muted">
            {t.qiblaFromNorth} · {compassPoint(bearing, s.lang)}
          </p>
          {live && (
            <p className={`mt-2 text-[14px] font-bold ${facing ? 'text-gold' : 'text-ink/80'}`}>
              {facing ? t.facingQibla : `${t.turn} ${f.n(Math.round(off))}° ${rel <= 180 ? (s.lang === 'ar' ? 'يمينًا' : 'right') : s.lang === 'ar' ? 'يسارًا' : 'left'}`}
            </p>
          )}
        </div>

        {mode === 'idle' && needsPermission && (
          <button type="button" onClick={enable} className="mt-4 w-full rounded-xl bg-emerald py-3 text-[15px] font-bold text-white">
            {t.enableCompass}
          </button>
        )}
        {(mode === 'unavailable' || mode === 'denied') && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-gold/10 p-3 text-[12.5px] leading-5">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {t.compassUnavailable}
          </p>
        )}
        {unreliable && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-gold/10 p-3 text-[12.5px] leading-5">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {t.compassUnreliable}
          </p>
        )}
        <p className="mt-3 text-center text-[11px] leading-5 text-muted">
          {s.lang === 'ar'
            ? 'الزاوية محسوبة بالدائرة العظمى من الشمال الجغرافي. بوصلة الهاتف مغناطيسية؛ الانحراف المغناطيسي في مصر والسعودية نحو ٣–٥° شرقًا.'
            : 'Great-circle bearing from true north. Phone compasses are magnetic; declination in Egypt and Saudi Arabia is about 3–5° east.'}
        </p>
      </Card>
      <Card>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">{t.distanceKaaba}</span>
          <b className="tnum">{f.n(Math.round(km).toLocaleString('en'))} {s.lang === 'ar' ? 'كم' : 'km'}</b>
        </div>
        <div className="mt-2 flex items-center justify-between text-[13px]">
          <span className="text-muted">{t.location}</span>
          <b>{place.city[s.lang]}</b>
        </div>
      </Card>
    </div>
  );
}
