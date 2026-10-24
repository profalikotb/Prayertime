# Prof Ali Kotb Prayer Time — 2.0 upgrade

## What changed

The web app is Next.js 15 static export on Vercel. The Android app is native Java with RemoteViews widgets; it has no Capacitor or WebView shell. Both use the same astronomical engine: adhan-js on the web and a line-for-line Java port of it on Android.

| Area | Web (PWA) | Android (APK) |
|---|---|---|
| Regional methods | Egypt 19.5/17.5 · Saudi Umm al-Qura (Isha 120 min in Ramadan) · Europe MWL · USA ISNA · Canada FCNA 13/13 · France UOIF 12/12 · UK MWL plus offsets or Custom angles | Same |
| Method lock | Auto follows the country when you travel; a manual choice is locked 🔒 | Same |
| High latitude | Auto / middle of night / 1/7 of night / angle-based. Applied only at ≥ 48°, so Cairo is never affected | Same |
| Asr | Standard / Hanafi | Same |
| Per-prayer offsets | ±30 min per prayer | Same |
| Location | GPS (asked once) → saved → approximate from timezone → manual city → Cairo. Precision badge shown | Same, with manual city list |
| Voice reminder | Record or upload; per-prayer on/off; 3/5/10/15/20 min; TTS fallback; plays only while the app is open | Native alarms; plays with the phone locked, closed or after a reboot |
| Adhan library | Per-prayer Adhan; upload or download from a link (CORS); stored on the device | Per-prayer Adhan files, system sound, or silent |
| Widgets | — | Small, Medium (new) and Large (+ Gregorian date, method, Islamic Today, Qibla shortcut) |
| Islamic Today | New page: browse days, observances (hadith refs), sourced history, Ramadan/Eid countdowns | Widget line |
| Hijri correction | −2…+2 | −2…+2 |

## Verification

- `npm run verify`: 51/51 checks pass. For the new methods, the sun's altitude at each computed minute is checked against the method angle. Paris −12°, Toronto −13°, New York −15°, London and Berlin −18°/−17° all fall within 0.35°.
- Oslo on the summer solstice gives valid, ordered times under every rule.
- Java engine compared with the web engine: 76,956 times, 0 differences. This covers 18 cities, a full year, every high-latitude rule, Hanafi and Custom.
- Android sources compile against the `android-34` SDK.

## Deploy

1. **GitHub**: upload the `src`, `scripts`, `public` and `android` folders plus `package.json`, then Commit.
2. **Vercel**: deploys automatically. Open the app and pull to refresh once; the service worker is now v2.0.0.
3. **Android APK**: the GitHub Action builds it automatically and publishes it to Releases → `android-latest`. Install it over the old version; your settings are kept.

## Android first run

1. Open «مواقيت الصلاة» and allow **Location** and **Notifications**.
2. Under «موثوقية التنبيهات», turn all three items green:
   - Notifications
   - Exact alarms
   - Battery: set to "Unrestricted"
3. Xiaomi, Oppo, Huawei and Samsung phones have extra auto-start or sleeping-apps lists. Exclude the app from them.
4. To add widgets, use the three ➕ buttons, or long-press the home screen → Widgets → مواقيت الصلاة.

## Recording and testing your voice

1. «🎙 تسجيل تنبيه بصوتي». Say: «باقي خمس دقائق على أذان صلاة العصر، استعد للصلاة». The first recording is assigned to every prayer automatically.
2. Tap a prayer's row to choose its voice clip and its Adhan, or switch either one off.
3. «▶ تجربة كاملة». Lock the phone. Your voice plays after 30 s and the Adhan after 60 s.

## Limits (by design or by the OS)

- **iPhone:** iOS gives web apps no background audio or scheduled notifications, so voice and Adhan play only while the app is open. Use the .ics export for alerts that are guaranteed to arrive.
- **Silent / vibrate / Do Not Disturb:** Android shows the notification without sound.
- **Battery restrictions:** if Android refuses background playback, the alert falls back to a notification with the system sound.
- **Voice cloning:** not implemented. Your own recordings are used, with system TTS as the fallback.
- **Built-in Adhan recordings:** none are bundled because no recording with a verifiable license was available. Add your own licensed files.
- **Separate settings:** the web app and the Android app keep their settings separately, because browser storage cannot be shared with a native app.
- **Widget theme:** widgets follow the prayer-time phase (dawn, day, dusk, night) instead of the system light/dark setting.
