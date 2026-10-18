'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon, Seg } from './ui';
import { addDays } from '@/lib/civil';
import { computeDay } from '@/lib/prayer';
import { hijriFor } from '@/lib/hijri';
import { makeFmt } from '@/lib/format';
import { PRAYER_NAMES } from '@/lib/i18n';
import type { CivilDate, PrayerKey } from '@/lib/types';

type Range = 'today' | 'week';
const W = 1080;
const H = 1350;
const FONT = '"Cairo Variable", Cairo, system-ui, sans-serif';

/** Branded prayer-time image for WhatsApp / family / patients (always Arabic). */
export default function ShareCard() {
  const app = useApp();
  const { s, place, today, opts, hctx } = app;
  const ar = s.lang === 'ar';
  const [range, setRange] = useState<Range>('today');
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  const draw = async (): Promise<Blob | null> => {
    try {
      await Promise.all([document.fonts.load(`700 40px ${FONT}`), document.fonts.load(`400 40px ${FONT}`), document.fonts.load('700 40px Amiri')]);
    } catch {
      /* fonts optional */
    }
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (!g) return null;
    // Arabic formatter regardless of UI language (cards are for Arabic-speaking recipients)
    const fa = makeFmt({ ...s, lang: 'ar' }, place.tz);
    const names = PRAYER_NAMES.ar;

    // background
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0e5c4a');
    bg.addColorStop(0.55, '#0b3b33');
    bg.addColorStop(1, '#06141a');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // 8-point star lattice
    g.strokeStyle = 'rgba(232,199,122,0.08)';
    g.lineWidth = 2;
    for (let y = 0, row = 0; y < H + 80; y += 120, row++)
      for (let x = row % 2 ? 60 : 0; x < W + 80; x += 120)
        for (const a0 of [0, Math.PI / 4]) {
          g.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = a0 + Math.PI / 4 + (k * Math.PI) / 2;
            const px = x + 26 * Math.cos(a);
            const py = y + 26 * Math.sin(a);
            if (k) g.lineTo(px, py);
            else g.moveTo(px, py);
          }
          g.closePath();
          g.stroke();
        }
    // crescent
    // crescent drawn on its own layer, so the cut-out does not punch through the background
    const cr = document.createElement('canvas');
    cr.width = cr.height = 200;
    const cg = cr.getContext('2d');
    if (cg) {
      const grd = cg.createLinearGradient(30, 30, 170, 170);
      grd.addColorStop(0, '#fff0c4');
      grd.addColorStop(1, '#c79a3c');
      cg.fillStyle = grd;
      cg.beginPath();
      cg.arc(100, 100, 70, 0, Math.PI * 2);
      cg.fill();
      cg.globalCompositeOperation = 'destination-out';
      cg.beginPath();
      cg.arc(132, 72, 62, 0, Math.PI * 2);
      cg.fill();
      g.drawImage(cr, 40, 50);
    }

    g.direction = 'rtl';
    g.textAlign = 'right';
    const R = W - 70;
    const txt = (t: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = 'right', font = FONT) => {
      g.font = `${weight} ${size}px ${font}`;
      g.fillStyle = color;
      g.textAlign = align;
      g.fillText(t, x, y);
    };
    const round = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
      g.beginPath();
      g.roundRect(x, y, w, h, r);
      g.fillStyle = fill;
      g.fill();
    };

    txt('مواقيت الصلاة', R, 150, 76, '#f2cf7a', 700, 'right', 'Amiri, ' + FONT);
    txt(place.city.ar + (place.country.ar ? ' · ' + place.country.ar : ''), R, 215, 36, 'rgba(251,245,230,0.75)', 400);

    const keys: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    if (range === 'today') {
      const h = hijriFor(today, hctx);
      txt(`${fa.weekday(today)} ${fa.hDate(h)}`, R, 300, 40, '#fbf5e6');
      txt(fa.gDate(today), R, 352, 32, 'rgba(251,245,230,0.6)', 400);
      const t = computeDay(today, place, opts(today));
      let y = 420;
      for (const k of keys) {
        const sun = k === 'sunrise';
        const rowH = sun ? 112 : 138;
        round(70, y, W - 140, rowH - 18, 28, sun ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.10)');
        const mid = y + (rowH - 18) / 2 + (sun ? 15 : 20);
        txt(names[k], R - 40, mid, sun ? 44 : 58, sun ? 'rgba(251,245,230,0.6)' : '#fbf5e6');
        txt(fa.time(t[k]), 110, mid, sun ? 44 : 60, sun ? 'rgba(251,245,230,0.6)' : '#f2cf7a', 700, 'left');
        y += rowH;
      }
    } else {
      txt('مواقيت الأسبوع', R, 300, 44, '#fbf5e6');
      const cols = [R - 10, 760, 640, 520, 400, 280, 150];
      const heads = ['اليوم', ...['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((k) => names[k as PrayerKey].replace('ال', '')), ''];
      heads.forEach((hd, i) => i < 6 && txt(hd, cols[i], 385, 30, '#f2cf7a', 700, i === 0 ? 'right' : 'center'));
      let y = 410;
      for (let i = 0; i < 7; i++) {
        const d: CivilDate = addDays(today, i);
        const t = computeDay(d, place, opts(d));
        round(70, y, W - 140, 104, 22, i === 0 ? 'rgba(242,207,122,0.16)' : i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)');
        txt(fa.weekday(d), cols[0], y + 48, 32, '#fbf5e6');
        txt(fa.gShort(d).slice(0, fa.gShort(d).lastIndexOf('/')), cols[0], y + 86, 24, 'rgba(251,245,230,0.55)', 400);
        (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerKey[]).forEach((k, j) => {
          const hm = fa.timeParts(t[k]).hm;
          txt(hm, cols[j + 1], y + 66, 38, '#fbf5e6', 700, 'center');
        });
        y += 114;
      }
    }
    // footer
    g.fillStyle = 'rgba(242,207,122,0.5)';
    g.fillRect(W / 2 - 60, H - 150, 120, 3);
    txt(s.shareFooter || '', W / 2, H - 95, 30, 'rgba(251,245,230,0.85)', 700, 'center');
    txt('prayertimealikotb.vercel.app', W / 2, H - 50, 24, 'rgba(251,245,230,0.45)', 400, 'center');

    return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
  };

  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    draw().then((b) => {
      if (!alive || !b) return;
      blobRef.current = b;
      made = URL.createObjectURL(b);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, place.lat, place.lng, today.d, s.shareFooter, s.timeFormat, s.digits]);

  const share = async () => {
    const b = blobRef.current;
    if (!b) return;
    setBusy(true);
    const file = new File([b], range === 'today' ? 'مواقيت-اليوم.png' : 'مواقيت-الأسبوع.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'مواقيت الصلاة' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      }
    } catch {
      /* user cancelled */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={ar ? 'مشاركة المواقيت' : 'Share prayer times'} icon="download">
      <Seg
        value={range}
        onChange={setRange}
        options={[
          { v: 'today', l: ar ? 'اليوم' : 'Today' },
          { v: 'week', l: ar ? '٧ أيام' : '7 days' },
        ]}
      />
      <div className="mt-3 overflow-hidden rounded-xl border border-line/10 bg-ink/5">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="block w-full" />
        ) : (
          <div className="aspect-[4/5] w-full animate-pulse" />
        )}
      </div>
      <button
        type="button"
        onClick={share}
        disabled={!url || busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald py-3 text-[15px] font-bold text-white disabled:opacity-50"
      >
        <Icon name="download" className="h-4 w-4" />
        {ar ? 'مشاركة (واتساب / الصور)' : 'Share (WhatsApp / Photos)'}
      </button>
    </Card>
  );
}
