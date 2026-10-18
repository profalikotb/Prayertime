'use client';
import { useApp } from './ctx';
import { Card, Toggle } from './ui';
import type { Clinic } from '@/lib/clinics';

const DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = [6, 0, 1, 2, 3, 4, 5]; // Saturday-first week

export default function ClinicSettings() {
  const { s, set } = useApp();
  const ar = s.lang === 'ar';
  const clinics = s.clinics ?? [];
  const patch = (id: string, p: Partial<Clinic>) => set((x) => ({ ...x, clinics: x.clinics.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
  const input = 'rounded-lg border border-line/15 bg-surface px-2 py-1.5 text-[14px] font-semibold tnum outline-none focus:border-emerald';
  return (
    <Card title={ar ? 'العيادات' : 'Clinics'} icon="pin" className="md:col-span-2">
      <p className="-mt-1 mb-2 text-[12px] text-muted">
        {ar ? 'تظهر في الصفحة الرئيسية في أيام العيادة مع إرشاد: صلِّ قبل الخروج، أو خصّص استراحة.' : 'Shown on clinic days with guidance: pray before leaving, or plan a break.'}
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {clinics.map((c) => (
          <div key={c.id} className={`rounded-xl border border-line/10 p-3 ${c.enabled ? '' : 'opacity-60'}`}>
            <input className={`${input} w-full`} value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} />
            <div className="mt-2 flex flex-wrap gap-1">
              {ORDER.map((d) => {
                const on = c.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => patch(c.id, { days: on ? c.days.filter((x) => x !== d) : [...c.days, d] })}
                    className={`rounded-lg px-2 py-1 text-[12px] font-bold ${on ? 'bg-emerald text-white' : 'bg-ink/5 text-muted'}`}
                  >
                    {(ar ? DAYS_AR : DAYS_EN)[d]}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-muted">
              <label className="grid gap-1">
                {ar ? 'من' : 'From'}
                <input type="time" className={input} value={c.start} onChange={(e) => patch(c.id, { start: e.target.value })} />
              </label>
              <label className="grid gap-1">
                {ar ? 'إلى' : 'To'}
                <input type="time" className={input} value={c.end} onChange={(e) => patch(c.id, { end: e.target.value })} />
              </label>
              <label className="col-span-2 grid gap-1">
                {ar ? 'وقت الطريق (دقيقة)' : 'Travel time (min)'}
                <input
                  type="number"
                  min={0}
                  max={240}
                  inputMode="numeric"
                  className={input}
                  value={c.travelMin}
                  onChange={(e) => patch(c.id, { travelMin: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })}
                />
              </label>
            </div>
            <Toggle on={c.enabled} label={ar ? 'مفعّلة' : 'Enabled'} onChange={(v) => patch(c.id, { enabled: v })} />
          </div>
        ))}
      </div>
      <label className="mt-3 grid gap-1 text-[12px] text-muted">
        {ar ? 'السطر المطبوع أسفل صورة المشاركة' : 'Footer line on shared images'}
        <input className={`${input} w-full`} value={s.shareFooter} onChange={(e) => set((x) => ({ ...x, shareFooter: e.target.value }))} />
      </label>
    </Card>
  );
}
