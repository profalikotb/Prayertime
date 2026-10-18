# مواقيت الصلاة – أ.د. على قطب · Prof Ali Kotb Prayer Time

Installable PWA (iPhone, Android, desktop): location-based prayer times, Hijri calendar with official Egyptian announcements and manual correction, Ramadan/Eid countdowns, Qibla compass, sourced Islamic history and day-specific recommended acts. Arabic RTL (default) and English LTR.

**Stack:** Next.js 15 (static export) · React 19 · TypeScript · Tailwind 3 · `adhan` (on-device astronomy) · self-hosted Cairo + Amiri fonts. No server, no database, no API keys, no paid services.

## Architecture decisions

| Concern | Choice | Why |
|---|---|---|
| Prayer times | `adhan` library on-device (not the AlAdhan API) | Works offline, no network dependency → no loading spinners. Egyptian method verified against the published Cairo schedule for 11/10/2026 (6/6 times exact); AlAdhan API differs by 2 min on Asr. |
| Method | Auto by country: EG → Egyptian Survey (AlAdhan #5), SA → Umm al-Qura (#4, Isha +120 min in Ramadan), others mapped regionally; manual override | |
| Hijri | ICU `islamic-umalqura` + `src/data/officialHijri.ts` (Dar al-Ifta anchors) + per-country manual offset | Shift is applied on the Gregorian side, so month/year boundaries are always correct. Statuses: **official / calculated (provisional) / adjusted by you**. |
| History | Curated DB (`src/data/history.ts`, 48 events) | Every event sourced; disputed dates flagged; month-only events never assigned a fake day; no Gregorian equivalents for early-era dates. |
| Notifications | Foreground reminders + **.ics export with alarms** | iOS web apps cannot schedule background local notifications. The calendar export gives reliable alerts with the app closed. |
| Location | GPS → online reverse geocode (BigDataCloud, key-less) → offline nearest city → device timezone | Each layer degrades gracefully; GPS is re-read on foreground only if permission is already granted (no surprise prompts). |
| Theme "Auto" | Night palette from Maghrib to Sunrise at your location | |

## Folder map

```
src/lib/        civil dates · hijri engine · prayer · methods · location · qibla · ics · notify · storage · i18n · format · occasions
src/data/       officialHijri · history · significance · cities
src/components/ App (state) · Today · CalendarView · QiblaView · SettingsView · HijriAdjust · EventCard · ui
public/         manifest · sw.js · icons · iOS splash screens
scripts/        verify.ts (test matrix) · make-icons.py
```

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # 38 checks: cities, DST, Hijri boundaries, corrections, occasions, rules, Qibla, ICS
npm run build      # static export → out/
```

## Deploy (GitHub → Vercel)

1. **GitHub:** create repo `Prof-Ali-Kotb-Prayer-Time` under `profalikotb` (empty, no README).
2. **Push:**
   ```bash
   cd Prof-Ali-Kotb-Prayer-Time
   git init -b main          # skip if the zip already contains .git
   git add -A && git commit -m "Initial release"
   git remote add origin https://github.com/profalikotb/Prof-Ali-Kotb-Prayer-Time.git
   git push -u origin main
   ```
   (Or GitHub web → *uploading an existing file* → drag the folder contents, excluding `node_modules`.)
3. **Vercel:** Add New → Project → Import the repo. Framework is auto-detected (Next.js); keep defaults. Set project name `prof-ali-kotb-prayer-time` → Deploy.
4. **Environment variables:** none required.
5. **Domain:** Vercel assigns `prof-ali-kotb-prayer-time.vercel.app` if that name is free; otherwise it appends a suffix — check *Settings → Domains*. Not verified in advance.
6. Every push to `main` redeploys automatically; pushes to other branches create preview URLs.

## Install on iPhone

1. Open the Vercel URL in **Safari** (not Chrome — iOS installs PWAs only from Safari/WebKit share sheet).
2. Allow location when asked.
3. **Share → Add to Home Screen → Add.**
4. Open from the Home Screen icon. Qibla: tap **تفعيل البوصلة** once (iOS motion permission).
5. Reliable reminders: **الإعدادات → تصدير المواقيت إلى التقويم** → *Add All*. Repeat monthly (or when travelling).

## Maintenance

- **New official Hijri announcement:** add `{ y, m, start: 'yyyy-mm-dd', source }` to `src/data/officialHijri.ts`, push. Ramadan, Shawwal and Dhu al-Hijjah matter most. Until then the in-app −1/+1 correction covers it per country.
- **Adhan audio:** place a licensed `adhan.mp3` in `public/` — detected automatically; otherwise a synthesized chime plays.
- **Cache bump:** change `VERSION` in `public/sw.js` only if you change cached static assets outside `/_next/static` (icons, manifest).
