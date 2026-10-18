# Testing & verification report — 18/10/2026

Automated: `npm run verify` → **38 passed, 0 failed**. Build: `next build` clean (TypeScript strict). UI rendered headless at 393×852 (iPhone 15/16) and 1366×900 (desktop), Arabic/English, light/dark.

## Prayer times (Fajr · Sunrise · Dhuhr · Asr · Maghrib · Isha)

| Location | Date | Method | Result | Reference |
|---|---|---|---|---|
| Cairo | 11/10/2026 | Egyptian | 05:28 · 06:54 · 12:42 · 16:00 · 18:29 · 19:46 | Published Egyptian schedule (Akhbar El-Yom) — **6/6 exact** |
| Cairo | 18/10/2026 | Egyptian | 05:32 · 06:59 · 12:40 · 15:54 · 18:21 · 19:39 | AlAdhan #5: Fajr/Sunrise/Dhuhr/Maghrib/Isha equal; Asr 15:56 (AlAdhan +2 min) |
| Tukh, Qalyubia | 18/10/2026 | Egyptian | 05:32 · 06:59 · 12:40 · 15:54 · 18:21 · 19:39 | (≈35 km N of Cairo, same minutes) |
| Makkah | 18/10/2026 | Umm al-Qura | 05:01 · 06:17 · 12:06 · 15:25 · 17:54 · 19:24 | Isha = Maghrib + 90 |
| Madinah | 18/10/2026 | Umm al-Qura | 05:03 · 06:21 · 12:07 · 15:25 · 17:52 · 19:22 | |
| Makkah (Ramadan) | 20/02/2027 | Umm al-Qura | Isha 20:21 = Maghrib + 120 | |

**Known difference:** adhan.js adds +1 min to Dhuhr for the Egyptian method by default; removed, because the published Egyptian schedule uses true Dhuhr. Use the per-prayer minute adjustments (stored separately for Egypt / Saudi / other) if your mosque differs.

## Matrix

| Scenario | Result |
|---|---|
| Egypt ↔ Saudi travel | Method, Hijri profile and minute adjustments switch by detected country |
| Egypt DST end (Thu 29/10/2026) | Offset +3 → +2; Fajr 05:39 → 04:40 wall-clock |
| Month boundary | 30 Jumada I → 1 Jumada II (10–11/11/2026) |
| Year boundary | 1 Muharram 1449 = 06/06/2027; prior day 30 Dhu al-Hijjah 1448 |
| Official anchors | Egypt: 1 Ramadan 1447 = 19/02/2026; 1 Dhu al-Hijjah 1447 = 18/05/2026; 1 Jumada I 1448 = 12/10/2026 (Dar al-Ifta) |
| Continuity | 800 consecutive days — no skipped/repeated Hijri day (bug found and fixed: duplicate "1 Ramadan" on 18/02/2026) |
| Manual −1/+1 | Correct across month ends; propagates to Ramadan/Eid countdowns; never touches prayer times |
| Confirm-date picker | Offsets within ±2 accepted; distant dates rejected |
| Ramadan transition | Card switches to "day N", Eid countdown, Suhoor/Iftar, fast length, last-ten card from day 20 |
| Eid | "Today" on 1 Shawwal; rolls to next year after the Eid span |
| Rules | No fast suggested on Eid / Tashriq (incl. 13 Dhu al-Hijjah white day); odd-night notice after Maghrib in last ten |
| Location denied | Falls back to last saved place or Cairo with a visible notice + manual city picker |
| Reverse geocoding blocked/offline | Offline nearest-city name used (exercised in headless test) |
| Offline | All computation on-device; SW caches shell + hashed assets |
| Qibla | Cairo 136.14°, Tukh 137.04°, London 118.99° (match published references) |
| ICS | 150 events / 30 days, RFC 5545 line folding, UTC timestamps |

## Not testable here — do on device

- iOS Safari: location prompt, Add to Home Screen, compass permission and heading, notification permission (iOS 16.4+ installed PWA only).
- Real midnight/prayer transitions over time (logic covered by tick + state tests).
- Compass accuracy near metal; magnetic declination (~3–5° E) is not corrected — tolerance ±5°.

## Editorial review recommended

`src/data/history.ts` was compiled from classical sources (al-Tabari, Ibn Hisham, Ibn Saʿd, Ibn Kathir, al-Maqrizi, Ibn Iyas, al-Dhahabi …) with conservative dating. Before relying on it publicly, cross-check day-precise entries against التوفيقات الإلهامية and the cited works.
