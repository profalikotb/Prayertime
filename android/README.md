# Android widget app — مواقيت الصلاة

Native Android app whose job is the **home-screen widgets** and a **lock-screen live countdown**.
Prayer times come from `PrayerEngine.java`, a line-by-line port of adhan-js (the web app's engine),
verified identical to the web app on 30,840 times (14 cities × 366 days, incl. high latitudes).

| Piece | What it does |
|---|---|
| **Large widget** (4×4, resizable) | colour theme per prayer, city + Hijri date, next prayer 40 sp, live countdown 34 sp, progress bar, 6 times (next highlighted, past dimmed) |
| **Next-prayer widget** (4×2, resizable) | next prayer 44 sp + time + live 40 sp countdown |
| **Lock-screen notification** | ongoing notification with live countdown + all times (toggle in app) |
| Hijri date | same rules as the web app — official Dar al-Ifta dates (read from `/data/official-hijri.json` every 6 h, cached offline) over Umm al-Qura; verified identical on 4,800 days |
| Updates | exact alarms 15 min before / after each prayer and at midnight; boot, time and timezone changes; silently follows location |

## Build
Automatic: GitHub Actions (`.github/workflows/android.yml`) builds `PrayerTime.apk` on every push touching `android/`
and attaches it to the release **android-latest**.

Local (optional): Android Studio → Open `android/` → Run.

The APK is signed with `app/prayertime.keystore` (committed on purpose so updates install over the previous
version). It is for personal sideloading, not Play Store distribution.
