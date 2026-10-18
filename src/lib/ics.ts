import type { CivilDate, NotifyPrefs, Place } from './types';
import { addDays, key } from './civil';
import { computeDay, type PrayerOptions } from './prayer';
import { PRAYER_NAMES } from './i18n';
import type { Lang } from './types';

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** RFC 5545 line folding at 75 octets (UTF-8 safe). */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/**
 * iCalendar file with the next `days` days of the five prayers and VALARM reminders.
 * The iOS/Android calendar then delivers alerts reliably even when the web app is closed.
 * Times are written in UTC (…Z), so the calendar shows them correctly in any timezone.
 */
export function buildIcs(start: CivilDate, days: number, place: Place, opts: (d: CivilDate) => PrayerOptions, notify: NotifyPrefs, lang: Lang): string {
  const names = PRAYER_NAMES[lang];
  const city = place.city[lang];
  const now = stamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Prof Ali Kotb//Prayer Time//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(lang === 'ar' ? `مواقيت الصلاة – ${city}` : `Prayer Times – ${city}`)}`,
  ];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const t = computeDay(d, place, opts(d));
    for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      const at = t[k];
      const pref = notify.perPrayer[k];
      lines.push(
        'BEGIN:VEVENT',
        `UID:${key(d)}-${k}-${place.lat.toFixed(2)}-${place.lng.toFixed(2)}@prof-ali-kotb-prayer-time`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(at)}`,
        `DTEND:${stamp(new Date(at.getTime() + 10 * 60000))}`,
        `SUMMARY:${esc(`🕌 ${names[k]}`)}`,
        `LOCATION:${esc(city)}`,
        'TRANSP:TRANSPARENT',
      );
      if (pref.before && notify.beforeMin > 0) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(names[k])}`, `TRIGGER:-PT${notify.beforeMin}M`, 'END:VALARM');
      }
      if (pref.at) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(names[k])}`, 'TRIGGER:PT0M', 'END:VALARM');
      }
      lines.push('END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
