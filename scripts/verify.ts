/**
 * Verification harness for the testing matrix (run: npm run verify).
 * Exits non-zero on any failed assertion.
 */
import { computeDay } from '../src/lib/prayer';
import { autoMethod } from '../src/lib/methods';
import { addDays, parseKey, tzOffsetMin, key } from '../src/lib/civil';
import { gregorianFor, hijriFor, monthGrid, offsetForConfirmed, umalqura, type HijriContext } from '../src/lib/hijri';
import { upcomingOccasions } from '../src/lib/occasions';
import { significanceFor } from '../src/data/significance';
import { HISTORY } from '../src/data/history';
import { qiblaBearing, distanceToKaabaKm } from '../src/lib/qibla';
import { buildIcs } from '../src/lib/ics';
import { defaultSettings } from '../src/lib/storage';
import type { MethodKey, Place } from '../src/lib/types';

let pass = 0, fail = 0;
const ok = (c: boolean, msg: string) => { if (c) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg); } };
const hm = (d: Date, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
const zero = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
const opt = (method: MethodKey, ramadan = false) => ({ method, madhab: 'shafi' as const, adjustments: zero, ramadan });
const row = (label: string, lat: number, lng: number, tz: string, date: string, m: MethodKey, ramadan = false) => {
  const t = computeDay(parseKey(date), { lat, lng }, opt(m, ramadan));
  const s = (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((k) => hm(t[k], tz));
  console.log(`  ${label.padEnd(22)} ${date}  ${s.join('  ')}`);
  return s;
};

console.log('\n1. Prayer times (Fajr Sunrise Dhuhr Asr Maghrib Isha)');
const ref = row('Cairo [reference]', 30.0444, 31.2357, 'Africa/Cairo', '2026-10-11', 'Egyptian');
ok(ref.join(' ') === '05:28 06:54 12:42 16:00 18:29 19:46', 'Cairo 11/10/2026 matches published Egyptian schedule (Akhbar El-Yom) on all 6 times');
const c18 = row('Cairo', 30.0444, 31.2357, 'Africa/Cairo', '2026-10-18', 'Egyptian');
ok(c18[0] === '05:32' && c18[4] === '18:21' && c18[5] === '19:39', 'Cairo 18/10/2026 Fajr/Maghrib/Isha = AlAdhan method 5');
row('Tukh, Qalyubia', 30.3539, 31.2014, 'Africa/Cairo', '2026-10-18', 'Egyptian');
const mk = row('Makkah', 21.4225, 39.8262, 'Asia/Riyadh', '2026-10-18', 'UmmAlQura');
row('Madinah', 24.4672, 39.6111, 'Asia/Riyadh', '2026-10-18', 'UmmAlQura');
const mkR = row('Makkah (Ramadan)', 21.4225, 39.8262, 'Asia/Riyadh', '2027-02-20', 'UmmAlQura', true);
const mkRn = row('Makkah (Ramadan, off)', 21.4225, 39.8262, 'Asia/Riyadh', '2027-02-20', 'UmmAlQura', false);
const mins = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3);
ok(mins(mkR[5]) - mins(mkR[4]) === 120 && mins(mkRn[5]) - mins(mkRn[4]) === 90, 'Umm al-Qura Isha = Maghrib + 120 min in Ramadan, +90 otherwise');
ok(mins(mk[5]) - mins(mk[4]) === 90, 'Umm al-Qura Isha = Maghrib + 90 min (Makkah 18/10/2026)');
ok(autoMethod('EG') === 'Egyptian' && autoMethod('SA') === 'UmmAlQura' && autoMethod('FR') === 'MuslimWorldLeague', 'Auto method: EG→Egyptian(5), SA→Umm al-Qura(4), other→MWL');

console.log('\n2. Egypt DST (summer time ends last Thursday of October)');
const before = computeDay(parseKey('2026-10-29'), { lat: 30.0444, lng: 31.2357 }, opt('Egyptian'));
const after = computeDay(parseKey('2026-10-30'), { lat: 30.0444, lng: 31.2357 }, opt('Egyptian'));
console.log(`  29/10 Fajr ${hm(before.fajr, 'Africa/Cairo')} (UTC+${tzOffsetMin('Africa/Cairo', before.fajr) / 60})  30/10 Fajr ${hm(after.fajr, 'Africa/Cairo')} (UTC+${tzOffsetMin('Africa/Cairo', after.fajr) / 60})`);
ok(tzOffsetMin('Africa/Cairo', before.dhuhr) === 180 && tzOffsetMin('Africa/Cairo', after.dhuhr) === 120, 'Cairo offset +3 → +2 across 29–30/10/2026');
ok(mins(hm(before.fajr, 'Africa/Cairo')) - mins(hm(after.fajr, 'Africa/Cairo')) >= 59, 'Wall-clock Fajr shifts back ~1 h after DST ends');

console.log('\n3. Hijri engine');
const EG: HijriContext = { profile: 'EG', manualOffset: null };
const SA: HijriContext = { profile: 'SA', manualOffset: null };
const h = (d: string, c: HijriContext) => { const r = hijriFor(parseKey(d), c); return `${r.d}/${r.m}/${r.y} ${r.status}`; };
ok(h('2026-10-18', EG) === '7/5/1448 official', '18/10/2026 Egypt = 7 Jumada I 1448 (official, Dar al-Ifta)');
ok(h('2026-10-18', SA) === '7/5/1448 calculated', '18/10/2026 Saudi = 7 Jumada I 1448 (Umm al-Qura)');
ok(h('2026-02-18', EG) === '30/8/1447 calculated' && h('2026-02-19', EG) === '1/9/1447 official', 'Egypt Ramadan 1447 began 19/02/2026 (one day after Umm al-Qura)');
ok(h('2026-02-18', SA) === '1/9/1447 calculated', 'Umm al-Qura Ramadan 1447 = 18/02/2026');
ok(h('2026-05-18', EG) === '1/12/1447 official', 'Egypt Dhu al-Hijjah 1447 began 18/05/2026');
const g = monthGrid(1448, 5, EG, parseKey('2026-10-18'))!;
ok(key(g.start) === '2026-10-12' && g.length === 30, 'Jumada I 1448 grid: starts 12/10/2026, 30 days');
ok(h('2026-11-10', EG).startsWith('30/5/1448') && h('2026-11-11', EG).startsWith('1/6/1448'), 'Month boundary: 30 Jumada I → 1 Jumada II');
const muh = gregorianFor({ y: 1449, m: 1, d: 1 }, EG, parseKey('2026-10-18'))!;
const prev = hijriFor(addDays(muh.date, -1), EG);
ok(prev.y === 1448 && prev.m === 12 && (prev.d === 29 || prev.d === 30), `Year boundary: 1 Muharram 1449 = ${key(muh.date)}, previous day = ${prev.d} Dhu al-Hijjah 1448`);
let seq = true;
for (let i = -400; i < 400; i++) {
  const a = hijriFor(addDays(parseKey('2026-10-18'), i), EG), b = hijriFor(addDays(parseKey('2026-10-18'), i + 1), EG);
  const next = b.d === a.d + 1 && b.m === a.m && b.y === a.y;
  const roll = b.d === 1 && (a.d === 29 || a.d === 30) && ((b.m === a.m + 1 && b.y === a.y) || (a.m === 12 && b.m === 1 && b.y === a.y + 1));
  if (!next && !roll) { seq = false; console.log('   break at', key(addDays(parseKey('2026-10-18'), i)), a, b); }
}
ok(seq, 'Continuity: 800 consecutive days (Egypt profile, across official anchors) — no skipped or repeated Hijri days');

console.log('\n4. Manual correction');
const m1: HijriContext = { profile: 'EG', manualOffset: -1 };
const p1: HijriContext = { profile: 'EG', manualOffset: 1 };
ok(h('2026-11-11', m1).startsWith('30/5/1448'), '−1 day across boundary: 11/11/2026 → 30 Jumada I (not "0 Jumada II")');
ok(h('2026-11-10', p1).startsWith('1/6/1448'), '+1 day across boundary: 10/11/2026 → 1 Jumada II');
ok(offsetForConfirmed(parseKey('2026-10-18'), { y: 1448, m: 5, d: 6 }) === -1, 'Confirm "6 Jumada I" today → offset −1');
ok(offsetForConfirmed(parseKey('2026-10-18'), { y: 1448, m: 5, d: 20 }) === null, 'Confirm far-off date rejected');
const ram = gregorianFor({ y: 1448, m: 9, d: 1 }, EG, parseKey('2026-10-18'))!;
const ramM = gregorianFor({ y: 1448, m: 9, d: 1 }, m1, parseKey('2026-10-18'))!;
ok(Math.round((Date.UTC(ramM.date.y, ramM.date.m - 1, ramM.date.d) - Date.UTC(ram.date.y, ram.date.m - 1, ram.date.d)) / 864e5) === 1, 'Correction propagates to countdowns (−1 day → Ramadan one day later)');

console.log('\n5. Occasions');
const today = parseKey('2026-10-18');
for (const o of upcomingOccasions(today, EG)) console.log(`  ${o.key.padEnd(10)} ${o.hijri.d}/${o.hijri.m}/${o.hijri.y}  ${key(o.date)}  in ${o.days} d  [${o.status}]`);
const inRam = upcomingOccasions(addDays(ram.date, 5), EG).find((o) => o.key === 'ramadan')!;
ok(inRam.ongoing && inRam.dayOf === 6, 'During Ramadan: card switches to "day 6 of Ramadan"');
const eid = gregorianFor({ y: 1448, m: 10, d: 1 }, EG, today)!;
const onEid = upcomingOccasions(eid.date, EG).find((o) => o.key === 'eidFitr')!;
ok(onEid.ongoing && onEid.days === 0, 'On 1 Shawwal: Eid al-Fitr shows "today"');
const afterEid = upcomingOccasions(addDays(eid.date, 3), EG).find((o) => o.key === 'eidFitr')!;
ok(!afterEid.ongoing && afterEid.hijri.y === 1449, 'After Eid days: countdown rolls to next year');

console.log('\n6. Religious significance rules');
const ids = (m: number, d: number, wd: number) => significanceFor({ y: 1448, m, d }, wd, false, { y: 1448, m, d: d + 1 }).map((x) => x.id);
ok(!ids(12, 13, 1).includes('white') && !ids(12, 13, 1).includes('monthu') && ids(12, 13, 1).includes('tashriq'), '13 Dhu al-Hijjah: Tashriq — no White-Day or Monday fast suggested');
ok(!ids(10, 1, 4).includes('monthu'), 'Eid al-Fitr on Thursday: no Thursday fast suggested');
ok(ids(12, 9, 3).includes('arafah') && ids(1, 10, 2).includes('ashura'), 'Arafah and Ashura detected');
ok(significanceFor({ y: 1448, m: 9, d: 20 }, 2, true, { y: 1448, m: 9, d: 21 })[0].id === 'odd-night', 'After Maghrib on 20 Ramadan: "night 21" surfaced');

console.log('\n7. History database integrity');
ok(HISTORY.every((e) => e.sources.length > 0), `All ${HISTORY.length} events cite sources`);
ok(HISTORY.every((e) => e.m >= 1 && e.m <= 12 && (e.d === null || (e.d >= 1 && e.d <= 30))), 'Valid Hijri months/days');
ok(HISTORY.every((e) => !e.disputed || !!e.note), 'Every disputed event explains the dispute');
ok(new Set(HISTORY.map((e) => e.id)).size === HISTORY.length, 'Unique ids');
console.log(`  day-precise: ${HISTORY.filter((e) => e.d).length}, month-only: ${HISTORY.filter((e) => !e.d).length}, disputed: ${HISTORY.filter((e) => e.disputed).length}`);

console.log('\n8. Qibla');
const qc = qiblaBearing(30.0444, 31.2357);
console.log(`  Cairo ${qc.toFixed(2)}°  Tukh ${qiblaBearing(30.3539, 31.2014).toFixed(2)}°  Madinah ${qiblaBearing(24.4672, 39.6111).toFixed(2)}°  London ${qiblaBearing(51.5074, -0.1278).toFixed(2)}°`);
ok(Math.abs(qc - 136.1) < 0.3, 'Cairo Qibla ≈ 136.1° (published reference)');
ok(Math.abs(qiblaBearing(51.5074, -0.1278) - 119) < 0.5, 'London Qibla ≈ 119°');
ok(distanceToKaabaKm(21.4225, 39.8262) < 1, 'Makkah distance ≈ 0 km');

console.log('\n9. Calendar export (.ics)');
const place: Place = { lat: 30.0444, lng: 31.2357, city: { ar: 'القاهرة', en: 'Cairo' }, country: { ar: 'مصر', en: 'Egypt' }, cc: 'EG', tz: 'Africa/Cairo', source: 'manual', at: 0 };
const ics = buildIcs(today, 30, place, () => opt('Egyptian'), defaultSettings().notify, 'ar');
ok((ics.match(/BEGIN:VEVENT/g) ?? []).length === 150, '30 days × 5 prayers = 150 events');
ok(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75), 'All lines folded to ≤ 75 octets (RFC 5545)');
ok(ics.includes('DTSTART:20261018T023200Z'), 'Fajr 18/10/2026 05:32 Cairo written as 02:32Z');

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
