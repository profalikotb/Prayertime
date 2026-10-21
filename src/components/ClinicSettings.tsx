'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from './ctx';
import { Card, Icon, Seg, Toggle } from './ui';
import { KINDS, kindOf, newEntry, type Clinic, type ScheduleKind } from '@/lib/clinics';
import { key } from '@/lib/civil';

const DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = [6, 0, 1, 2, 3, 4, 5]; // Saturday-first week

/** «جدولي» — user-managed schedule: clinics, surgeries, lectures, study, work… weekly or on a date. */
export default function ClinicSettings() {
  const { s, set, f, today } = useApp();
  const ar = s.lang === 'ar';
  const list = s.clinics ?? [];
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = (c: Clinic) => {
    set((x) => ({ ...x, clinics: isNew ? [...x.clinics, c] : x.clinics.map((e) => (e.id === c.id ? c : e)) }));
    setEditing(null);
  };
  const remove = (id: string) => {
    if (!confirm(ar ? 'حذف هذا الموعد؟' : 'Delete this entry?')) return;
    set((x) => ({ ...x, clinics: x.clinics.filter((e) => e.id !== id) }));
    setEditing(null);
  };
  const toggle = (id: string, on: boolean) => set((x) => ({ ...x, clinics: x.clinics.map((e) => (e.id === id ? { ...e, enabled: on } : e)) }));

  /** "19:00" → "٧:٠٠ م" (12-hour, Arabic digits) — avoids RTL reordering of 24-h ranges */
  const clock = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    if (s.timeFormat === '24') return f.n(hhmm);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return f.n(`${h12}:${String(m).padStart(2, '0')}`) + (ar ? (h < 12 ? ' ص' : ' م') : h < 12 ? ' AM' : ' PM');
  };
  const summary = (c: Clinic) => {
    const when =
      (c.repeat ?? 'weekly') === 'once'
        ? c.date
          ? f.gShort({ y: +c.date.slice(0, 4), m: +c.date.slice(5, 7), d: +c.date.slice(8, 10) })
          : '—'
        : ORDER.filter((d) => c.days.includes(d))
            .map((d) => (ar ? DAYS_AR : DAYS_EN)[d])
            .join(ar ? '، ' : ', ') || (ar ? 'لا أيام' : 'no days');
    return `${when} · ${clock(c.start)} – ${clock(c.end)}`;
  };

  return (
    <Card title={ar ? 'جدولي: العيادات والعمل والدراسة' : 'My schedule'} icon="calendar" className="md:col-span-2">
      <div id="schedule" className="-mt-1 mb-3 text-[12px] leading-5 text-muted">
        {ar
          ? 'أضف أي موعد أسبوعي أو بتاريخ محدد. في يومه تظهر بطاقة «جدول اليوم» مع إرشاد الصلاة: صلِّ قبل الخروج، أو خصّص استراحة.'
          : 'Add any weekly or one-off entry. On its day, a “Today’s schedule” card shows prayer guidance.'}
      </div>

      <ul className="grid gap-2">
        {list.map((c) => {
          const k = kindOf(c);
          return (
            <li key={c.id} className={`flex items-center gap-2 rounded-xl border border-line/10 p-2.5 ${c.enabled ? '' : 'opacity-50'}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[20px]" style={{ background: k.color + '22' }}>
                {k.emoji}
              </span>
              <button type="button" onClick={() => (setIsNew(false), setEditing({ ...c, days: [...c.days] }))} className="min-w-0 flex-1 text-start">
                <p className="truncate text-[14.5px] font-bold">{c.name || (ar ? k.ar : k.en)}</p>
                <p className="tnum truncate text-[12px] text-muted">
                  {(c.repeat ?? 'weekly') === 'once' ? (ar ? 'مرة واحدة · ' : 'Once · ') : ar ? 'أسبوعيًا · ' : 'Weekly · '}
                  {summary(c)}
                </p>
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={c.enabled}
                onClick={() => toggle(c.id, !c.enabled)}
                className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${c.enabled ? 'bg-emerald' : 'bg-ink/15'}`}
                aria-label={ar ? 'تفعيل' : 'Enabled'}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${c.enabled ? 'start-[18px]' : 'start-0.5'}`} />
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="rounded-xl bg-ink/[.03] p-3 text-center text-[13px] text-muted">{ar ? 'لا توجد مواعيد بعد' : 'No entries yet'}</li>}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => (setIsNew(true), setEditing(newEntry('clinic')))}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald py-3 text-[14px] font-bold text-white"
        >
          ＋ {ar ? 'موعد أسبوعي' : 'Weekly entry'}
        </button>
        <button
          type="button"
          onClick={() => (setIsNew(true), setEditing(newEntry('other', key(today))))}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald/10 py-3 text-[14px] font-bold text-emerald"
        >
          ＋ {ar ? 'موعد بتاريخ محدد' : 'One-off entry'}
        </button>
      </div>

      <label className="mt-4 grid gap-1 text-[12px] text-muted">
        {ar ? 'السطر المطبوع أسفل صورة المشاركة' : 'Footer line on shared images'}
        <input
          className="w-full rounded-lg border border-line/15 bg-surface px-2 py-1.5 text-[14px] font-semibold outline-none focus:border-emerald"
          value={s.shareFooter}
          onChange={(e) => set((x) => ({ ...x, shareFooter: e.target.value }))}
        />
      </label>

      {editing && <Editor entry={editing} isNew={isNew} onSave={save} onCancel={() => setEditing(null)} onDelete={() => remove(editing.id)} />}
    </Card>
  );
}

function Editor({ entry, isNew, onSave, onCancel, onDelete }: { entry: Clinic; isNew: boolean; onSave: (c: Clinic) => void; onCancel: () => void; onDelete: () => void }) {
  const { s, today } = useApp();
  const ar = s.lang === 'ar';
  const [c, setC] = useState<Clinic>({ kind: 'clinic', repeat: 'weekly', ...entry });
  const p = (x: Partial<Clinic>) => setC((o) => ({ ...o, ...x }));
  const input = 'w-full rounded-lg border border-line/15 bg-surface px-3 py-2 text-[15px] font-semibold outline-none focus:border-emerald';
  const once = c.repeat === 'once';
  const valid = c.start < c.end && (once ? !!c.date : c.days.length > 0);
  const kind = kindOf(c);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center" onClick={onCancel}>
      <div
        className="safe-bottom max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-4 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        dir={ar ? 'rtl' : 'ltr'}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[24px]">{kind.emoji}</span>
          <h3 className="flex-1 text-[18px] font-bold">{isNew ? (ar ? 'موعد جديد' : 'New entry') : ar ? 'تعديل الموعد' : 'Edit entry'}</h3>
          <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full bg-ink/5" aria-label={ar ? 'إغلاق' : 'Close'}>
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.k}
              type="button"
              onClick={() => p({ kind: k.k as ScheduleKind })}
              className={`rounded-xl border px-2 py-2 text-[13px] font-bold ${c.kind === k.k ? 'border-transparent text-white' : 'border-line/10'}`}
              style={c.kind === k.k ? { background: k.color } : undefined}
            >
              {k.emoji} {ar ? k.ar : k.en}
            </button>
          ))}
        </div>

        <label className="mt-3 grid gap-1 text-[12px] font-semibold text-muted">
          {ar ? 'الاسم' : 'Name'}
          <input className={input} value={c.name} placeholder={ar ? `مثال: ${kind.ar} مستشفى عين شمس` : `e.g. ${kind.en} at Ain Shams`} onChange={(e) => p({ name: e.target.value })} />
        </label>

        <div className="mt-3">
          <Seg
            value={once ? 'once' : 'weekly'}
            onChange={(v) => p(v === 'once' ? { repeat: 'once', date: c.date || key(today) } : { repeat: 'weekly' })}
            options={[
              { v: 'weekly', l: ar ? 'يتكرر أسبوعيًا' : 'Weekly' },
              { v: 'once', l: ar ? 'تاريخ محدد' : 'On a date' },
            ]}
          />
        </div>

        {once ? (
          <label className="mt-3 grid gap-1 text-[12px] font-semibold text-muted">
            {ar ? 'التاريخ' : 'Date'}
            <input type="date" className={input} value={c.date ?? ''} onChange={(e) => p({ date: e.target.value })} />
          </label>
        ) : (
          <>
            <p className="mt-3 text-[12px] font-semibold text-muted">{ar ? 'الأيام' : 'Days'}</p>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {ORDER.map((d) => {
                const on = c.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => p({ days: on ? c.days.filter((x) => x !== d) : [...c.days, d] })}
                    className={`rounded-lg py-2 text-[12px] font-bold ${on ? 'bg-emerald text-white' : 'bg-ink/5 text-muted'}`}
                  >
                    {(ar ? DAYS_AR : DAYS_EN)[d]}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-[12px] font-semibold text-muted">
                {ar ? 'يبدأ من (اختياري)' : 'From (optional)'}
                <input type="date" className={input} value={c.from ?? ''} onChange={(e) => p({ from: e.target.value || undefined })} />
              </label>
              <label className="grid gap-1 text-[12px] font-semibold text-muted">
                {ar ? 'ينتهي في (اختياري)' : 'Until (optional)'}
                <input type="date" className={input} value={c.until ?? ''} onChange={(e) => p({ until: e.target.value || undefined })} />
              </label>
            </div>
          </>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-[12px] font-semibold text-muted">
            {ar ? 'من الساعة' : 'Start'}
            <input type="time" className={input} value={c.start} onChange={(e) => p({ start: e.target.value })} />
          </label>
          <label className="grid gap-1 text-[12px] font-semibold text-muted">
            {ar ? 'إلى الساعة' : 'End'}
            <input type="time" className={input} value={c.end} onChange={(e) => p({ end: e.target.value })} />
          </label>
        </div>

        <label className="mt-3 grid gap-1 text-[12px] font-semibold text-muted">
          {ar ? 'وقت الطريق (دقيقة) — لحساب موعد الخروج' : 'Travel time (min)'}
          <div className="flex gap-1.5">
            {[0, 15, 30, 45, 60, 90].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => p({ travelMin: m })}
                className={`flex-1 rounded-lg py-2 text-[13px] font-bold ${c.travelMin === m ? 'bg-emerald text-white' : 'bg-ink/5 text-muted'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </label>

        <label className="mt-3 grid gap-1 text-[12px] font-semibold text-muted">
          {ar ? 'رابط الموقع على الخريطة (اختياري)' : 'Map link (optional)'}
          <input className={input} dir="ltr" inputMode="url" placeholder="https://maps.app.goo.gl/…" value={c.mapUrl} onChange={(e) => p({ mapUrl: e.target.value.trim() })} />
        </label>

        <Toggle on={c.enabled} label={ar ? 'مفعّل' : 'Enabled'} onChange={(v) => p({ enabled: v })} />

        {!valid && (
          <p className="text-[12px] text-gold">
            {c.start >= c.end ? (ar ? 'وقت النهاية يجب أن يكون بعد البداية.' : 'End must be after start.') : ar ? 'اختر يومًا واحدًا على الأقل أو تاريخًا.' : 'Pick at least one day or a date.'}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button type="button" disabled={!valid} onClick={() => onSave({ ...c, name: c.name.trim() || (ar ? kind.ar : kind.en) })} className="flex-1 rounded-xl bg-emerald py-3 text-[15px] font-bold text-white disabled:opacity-40">
            {ar ? 'حفظ' : 'Save'}
          </button>
          {!isNew && (
            <button type="button" onClick={onDelete} className="rounded-xl border border-[#c0392b]/40 px-4 py-3 text-[14px] font-bold text-[#c0392b]">
              {ar ? 'حذف' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
