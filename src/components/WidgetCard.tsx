'use client';
import { useState } from 'react';
import { useApp } from './ctx';
import { Card, Icon } from './ui';

const SCRIPTABLE = 'https://apps.apple.com/app/scriptable/id1405459188';

/** Installs the iPhone Lock Screen / Home Screen widget via the free Scriptable app. */
export default function WidgetCard() {
  const { s } = useApp();
  const ar = s.lang === 'ar';
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  const copy = async () => {
    try {
      // fetch first, then copy inside a ClipboardItem promise so iOS keeps the user-gesture
      const text = fetch('/widget/PrayerWidget.js', { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      });
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })) })]);
      } else {
        await navigator.clipboard.writeText(await text);
      }
      setState('copied');
    } catch {
      setState('error');
    }
  };

  const steps = ar
    ? [
        'ثبّت تطبيق Scriptable المجاني من App Store.',
        'اضغط «نسخ كود الودجت» بالأسفل.',
        'افتح Scriptable ← زر + ← الصق الكود ← سمِّه «مواقيت الصلاة» ← Done. شغّله مرة واحدة واسمح بالموقع.',
        'شاشة القفل: اضغط مطولًا على شاشة القفل ← تخصيص ← شاشة القفل ← أضف أداة ← Scriptable ← اختر الحجم المستطيل.',
        'اضغط على الأداة ← Script ← «مواقيت الصلاة» (واختر When Interacting: Run Script لفتح التطبيق).',
        'للشاشة الرئيسية: أضف أداة Scriptable صغيرة أو متوسطة واختر نفس السكربت.',
      ]
    : [
        'Install the free Scriptable app from the App Store.',
        'Tap “Copy widget code” below.',
        'Open Scriptable → + → paste → name it “Prayer Times” → Done. Run it once and allow location.',
        'Lock Screen: long-press the Lock Screen → Customize → Lock Screen → Add Widgets → Scriptable → rectangular size.',
        'Tap the widget → Script → “Prayer Times”.',
        'Home Screen: add a small or medium Scriptable widget and pick the same script.',
      ];

  return (
    <Card title={ar ? 'ودجت شاشة القفل (iPhone)' : 'Lock Screen widget (iPhone)'} icon="today">
      <p className="text-[12.5px] leading-6 text-ink/80">
        {ar
          ? 'الصلاة القادمة مع عدّاد تنازلي حيّ، ومواقيت اليوم كلها على شاشة القفل — بنفس حسابات التطبيق تمامًا، ودون إنترنت.'
          : 'Next prayer with a live countdown and all of today’s times on the Lock Screen — identical calculations to the app, offline.'}
      </p>
      <ol className="mt-2 list-decimal space-y-1 ps-5 text-[12.5px] leading-6 text-ink/80">
        {steps.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={SCRIPTABLE} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-ink/5 py-3 text-[13px] font-bold">
          <Icon name="download" className="h-4 w-4" />
          Scriptable
        </a>
        <button type="button" onClick={copy} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald py-3 text-[13px] font-bold text-white">
          <Icon name={state === 'copied' ? 'check' : 'book'} className="h-4 w-4" />
          {state === 'copied' ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ كود الودجت' : 'Copy widget code'}
        </button>
      </div>
      {state === 'error' && (
        <p className="mt-2 text-[12px] text-gold">
          {ar ? 'تعذّر النسخ — افتح الرابط التالي وانسخ النص يدويًا: ' : 'Copy failed — open this link and copy manually: '}
          <a className="underline" href="/widget/PrayerWidget.js" target="_blank" rel="noopener noreferrer">
            /widget/PrayerWidget.js
          </a>
        </p>
      )}
      <p className="mt-2 text-[11px] leading-5 text-muted">
        {ar
          ? 'يتحدّث الودجت تلقائيًا بعد كل صلاة، والعدّاد يتحرك وحده كل ثانية. تعديلات الدقائق في إعدادات التطبيق لا تنتقل للودجت.'
          : 'The widget refreshes after each prayer; the countdown ticks on its own. Minute adjustments from app settings are not applied to the widget.'}
      </p>
    </Card>
  );
}
