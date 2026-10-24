package com.profalikotb.prayertime;

import android.content.Context;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.json.JSONArray;
import org.json.JSONObject;

/** Today's prayer schedule at the stored location, plus everything the widgets and alerts display. */
final class Day {
    static final String[] AR = {"الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"};
    static final String[] THEME = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};
    static final String[] HIJRI_MONTHS = {"محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
            "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"};
    static final String[] G_MONTHS = {"يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"};
    static final String[] WEEKDAYS = {"الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"};
    static final String APP_URL = "https://prayertimealikotb.vercel.app";

    final long now;
    final long[] today, tomorrow;
    final int next;          // index 0..5 of the next event (sunrise included)
    final long nextAt, prevAt;
    final boolean nextIsTomorrow, friday;
    final String hijri, gregorian, city, method, methodLabel, islamicLine;
    final boolean hijriOfficial, methodAuto;
    final int hijriMonth, hijriDay;
    private final HijriCalc hc;
    private final int hijriOff;

    Day(Context c) {
        now = System.currentTimeMillis();
        double lat = Store.lat(c), lng = Store.lng(c);
        String cc = Store.country(c);
        String chosen = Store.method(c);
        methodAuto = "auto".equals(chosen);
        method = methodAuto ? methodFor(lat, lng, cc) : chosen;
        hc = calc(Store.officialJson(c), "SA".equalsIgnoreCase(cc) ? "SA" : "EG".equalsIgnoreCase(cc) || cc.isEmpty() ? "EG" : "");
        hijriOff = Store.hijriOffset(c);
        ZoneId zone = ZoneId.systemDefault();
        LocalDate d = LocalDate.now(zone);
        today = PrayerEngine.compute(d, lat, lng, params(c, method), isRamadan(d));
        tomorrow = PrayerEngine.compute(d.plusDays(1), lat, lng, params(c, method), isRamadan(d.plusDays(1)));
        int n = -1;
        for (int i = 0; i < 6; i++) if (today[i] > now) { n = i; break; }
        nextIsTomorrow = n < 0;
        next = n < 0 ? 0 : n;
        nextAt = n < 0 ? tomorrow[0] : today[n];
        long p = now - 6 * 3600_000L;
        for (int i = 0; i < 6; i++) if (today[i] <= now) p = today[i];
        prevAt = p;
        friday = d.getDayOfWeek().getValue() == 5;
        HijriCalc.Result hr = hijriOf(d);
        hijriOfficial = hr.official;
        hijriMonth = hr.m;
        hijriDay = hr.d;
        hijri = arabic(hr.d + " " + HIJRI_MONTHS[hr.m - 1] + " " + hr.y) + " هـ" + (hr.official ? " ✓" : "");
        gregorian = WEEKDAYS[d.getDayOfWeek().getValue() - 1] + " " + arabic(String.format(java.util.Locale.ROOT, "%02d/%02d/%d", d.getDayOfMonth(), d.getMonthValue(), d.getYear()));
        city = Store.city(c);
        methodLabel = label(method);
        islamicLine = islamic(c, d, hr);
    }

    /** Engine parameters: method + the user's Asr school, high-latitude rule and minute offsets. */
    static PrayerEngine.Params params(Context c, String method) {
        PrayerEngine.Params p = PrayerEngine.method(method);
        p.shadow = Store.hanafi(c) ? 2 : 1;
        p.highLat = Store.highLat(c);
        for (int i = 0; i < 6; i++) p.userAdj[i] = Store.adj(c, i);
        return p;
    }

    static String methodFor(double lat, double lng, String cc) {
        if (cc != null && !cc.isEmpty()) return PrayerEngine.methodForCountry(cc);
        if (lat > 21.9 && lat < 31.8 && lng > 24.6 && lng < 36.9) return "Egyptian";
        if (lat > 16.3 && lat < 32.2 && lng > 34.5 && lng < 55.7) return "UmmAlQura";
        return "MuslimWorldLeague";
    }

    static final String[] METHOD_KEYS = {"Egyptian", "UmmAlQura", "MuslimWorldLeague", "NorthAmerica", "FCNA", "UOIF", "Dubai", "Kuwait", "Qatar",
            "Turkey", "Karachi", "Tehran", "Singapore", "MoonsightingCommittee"};

    static String label(String m) {
        switch (m) {
            case "Egyptian": return "الهيئة المصرية";
            case "UmmAlQura": return "أم القرى";
            case "MuslimWorldLeague": return "رابطة العالم الإسلامي";
            case "NorthAmerica": return "ISNA أمريكا الشمالية";
            case "FCNA": return "FCNA كندا";
            case "UOIF": return "UOIF فرنسا";
            case "Dubai": return "دبي";
            case "Kuwait": return "الكويت";
            case "Qatar": return "قطر";
            case "Turkey": return "ديانت تركيا";
            case "Karachi": return "كراتشي";
            case "Tehran": return "طهران";
            case "Singapore": return "سنغافورة";
            case "MoonsightingCommittee": return "لجنة رؤية الهلال";
            default: return m;
        }
    }

    /** Hijri date honouring the manual correction (same rule as the web app: shift applied to Umm al-Qura). */
    HijriCalc.Result hijriOf(LocalDate d) {
        if (hijriOff != Integer.MIN_VALUE) {
            int[] u = HijriCalc.uq(d.plusDays(hijriOff));
            return new HijriCalc.Result(u[0], u[1], u[2], false);
        }
        return hc.of(d);
    }

    private boolean isRamadan(LocalDate d) {
        try {
            return hijriOf(d).m == 9;
        } catch (Exception e) {
            return false;
        }
    }

    private static String eventsCache;

    /** One line for the widget: today's dated event (curated, same data as the web app), else the next occasion countdown. */
    private String islamic(Context c, LocalDate d, HijriCalc.Result hr) {
        try {
            if (eventsCache == null) {
                try (InputStream in = c.getAssets().open("islamic.json")) {
                    java.io.ByteArrayOutputStream b = new java.io.ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    for (int n; (n = in.read(buf)) > 0; ) b.write(buf, 0, n);
                    eventsCache = b.toString("UTF-8");
                }
            }
            JSONArray a = new JSONObject(eventsCache).getJSONArray("events");
            for (int i = 0; i < a.length(); i++) {
                JSONObject e = a.getJSONObject(i);
                if (e.getInt("m") == hr.m && e.getInt("d") == hr.d) {
                    int y = e.getInt("y");
                    return "📜 " + e.getString("ar") + " (" + arabic(y < 0 ? -y + " ق.هـ" : y + " هـ") + ")";
                }
            }
        } catch (Exception ignored) {
        }
        if (hr.m == 9) return "🌙 اليوم " + arabic(String.valueOf(hr.d)) + " من رمضان";
        int[][] targets = {{9, 1}, {10, 1}, {12, 10}};
        String[] names = {"رمضان", "عيد الفطر", "عيد الأضحى"};
        int best = -1, bestDays = 9999;
        for (int t = 0; t < targets.length; t++) {
            for (int i = 1; i < 390; i++) {
                HijriCalc.Result r = hijriOf(d.plusDays(i));
                if (r.m == targets[t][0] && r.d == targets[t][1]) {
                    if (i < bestDays) { bestDays = i; best = t; }
                    break;
                }
            }
        }
        return best < 0 ? "" : "🌙 " + names[best] + " بعد " + arabic(String.valueOf(bestDays)) + " يومًا (تقديري)";
    }

    private static String cacheKey;
    private static HijriCalc cache;

    /** Hijri calculator for a country profile ("EG", "SA", or "" = plain Umm al-Qura), cached per data version. */
    static synchronized HijriCalc calc(String json, String profile) {
        String k = profile + "|" + json.hashCode();
        if (!k.equals(cacheKey)) {
            cache = new HijriCalc(profile.isEmpty() ? new java.util.ArrayList<>() : HijriCalc.parse(json, profile));
            cacheKey = k;
        }
        return cache;
    }

    String label(int i) { return i == 2 && friday && !nextIsTomorrow ? "الجمعة" : AR[i]; }

    boolean soon() { return nextAt - now <= 15 * 60_000L; }

    static String arabic(String s) {
        StringBuilder b = new StringBuilder();
        for (char ch : s.toCharArray()) b.append(ch >= '0' && ch <= '9' ? (char) ('٠' + (ch - '0')) : ch);
        return b.toString();
    }

    static String time(long ms) {
        ZonedDateTime z = ZonedDateTime.ofInstant(Instant.ofEpochMilli(ms), ZoneId.systemDefault());
        int h = z.getHour() % 12 == 0 ? 12 : z.getHour() % 12;
        return arabic(h + ":" + String.format(java.util.Locale.ROOT, "%02d", z.getMinute())) + (z.getHour() < 12 ? " ص" : " م");
    }

    /** "4:58" without AM/PM — for compact widget cells */
    static String shortTime(long ms) { return time(ms).replace(" ص", "").replace(" م", ""); }
}
