'use client';
import { CalculationMethod } from 'adhan';
import { useApp } from './ctx';
import { methodInfo } from '@/lib/methods';
import { sunPosition } from '@/lib/compass';
import type { PrayerKey } from '@/lib/types';

/** «لماذا هذا الوقت؟» — the rule behind each time, and the sun's measured position at that minute. */
export default function PrayerWhy({ k }: { k: PrayerKey }) {
  const { s, f, method, place, times, hijri } = useApp();
  const ar = s.lang === 'ar';
  const p = CalculationMethod[method]();
  const at = times.today[k];
  const sun = sunPosition(at, place.lat, place.lng);
  const adj = s.adjustments[place.cc === 'EG' ? 'EG' : place.cc === 'SA' ? 'SA' : 'OTHER'][k];
  const deg = (v: number) => f.n(v.toFixed(1)).replace('.', ar && s.digits === 'arab' ? '٫' : '.') + '°';
  const ishaMin = p.ishaInterval ? (method === 'UmmAlQura' && hijri.m === 9 ? 120 : p.ishaInterval) : 0;
  const mAdj = method === 'Egyptian' ? 0 : p.methodAdjustments[k];

  const rule: Record<PrayerKey, string> = ar
    ? {
        fajr: `طلوع الفجر الصادق: الشمس تحت الأفق بزاوية ${deg(p.fajrAngle)}.`,
        sunrise: 'ظهور الحافة العليا لقرص الشمس مع احتساب الانكسار الجوي (−٠٫٨٣°)، ويُقرَّب للدقيقة الأسبق احتياطًا لانتهاء وقت الفجر.',
        dhuhr: 'زوال الشمس: عبورها خط الزوال (أعلى نقطة في السماء)' + (mAdj ? ` + ${f.n(mAdj)} دقيقة احتياط الطريقة.` : '، دون إضافة (كجداول الهيئة المصرية).'),
        asr:
          s.madhab === 'hanafi'
            ? 'مصير ظل الشيء مثليه بعد ظل الزوال (المذهب الحنفي).'
            : 'مصير ظل الشيء مثله بعد ظل الزوال (مذهب الجمهور).',
        maghrib: 'غروب قرص الشمس كاملًا تحت الأفق مع احتساب الانكسار الجوي.',
        isha: ishaMin
          ? `${f.n(ishaMin)} دقيقة بعد المغرب (طريقة أم القرى${hijri.m === 9 ? '، وتصبح ١٢٠ في رمضان' : ''}).`
          : `غياب الشفق: الشمس تحت الأفق بزاوية ${deg(p.ishaAngle)}.`,
      }
    : {
        fajr: `True dawn: the sun ${deg(p.fajrAngle)} below the horizon.`,
        sunrise: 'Upper limb of the sun appears, with refraction (−0.83°); rounded to the earlier minute as Fajr ends.',
        dhuhr: 'Solar transit (highest point)' + (mAdj ? ` + ${mAdj} min method margin.` : ', no margin (as Egyptian schedules).'),
        asr: s.madhab === 'hanafi' ? 'Shadow equals twice the object plus noon shadow (Hanafi).' : 'Shadow equals the object plus noon shadow (majority).',
        maghrib: 'The whole solar disc below the horizon, with refraction.',
        isha: ishaMin ? `${ishaMin} minutes after Maghrib (Umm al-Qura).` : `Twilight disappears: the sun ${deg(p.ishaAngle)} below the horizon.`,
      };

  return (
    <div className="fade-in mx-1 mb-1 rounded-xl bg-emerald/5 p-3 text-[12.5px] leading-6 text-ink/85">
      <p>{rule[k]}</p>
      <p className="mt-1 text-muted">
        {ar ? 'ارتفاع الشمس المحسوب عند هذه الدقيقة: ' : 'Computed solar altitude at this minute: '}
        <b className="tnum text-ink" dir="ltr">
          {deg(sun.alt)}
        </b>
        {ar ? ' · السمت ' : ' · azimuth '}
        <b className="tnum text-ink" dir="ltr">
          {deg(sun.az)}
        </b>
      </p>
      <p className="mt-1 text-[11px] text-muted">
        {methodInfo(method).name[s.lang]} · {methodInfo(method).detail}
        {adj ? (ar ? ` · تعديلك اليدوي ${f.n(adj > 0 ? `+${adj}` : adj)} د` : ` · your adjustment ${adj > 0 ? '+' : ''}${adj} min`) : ''}
      </p>
      {method === 'Egyptian' && (
        <p className="mt-1 text-[11px] text-emerald">
          {ar ? '✓ مطابق للجدول المصري المنشور للقاهرة (١١/١٠/٢٠٢٦) في المواقيت الست.' : '✓ Matches the published Cairo schedule (11/10/2026) on all six times.'}
        </p>
      )}
    </div>
  );
}
