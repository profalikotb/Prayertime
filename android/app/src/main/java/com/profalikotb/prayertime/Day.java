package com.profalikotb.prayertime;

import android.content.Context;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/** Today's prayer schedule at the stored location, plus everything the widgets display. */
final class Day {
    static final String[] AR = {"الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"};
    static final String[] THEME = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};
    static final String[] HIJRI_MONTHS = {"محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
            "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"};
    static final String APP_URL = "https://prayertimealikotb.vercel.app";

    final long now;
    final long[] today, tomorrow;
    final int next;          // index 0..5 of the next event (sunrise included)
    final long nextAt, prevAt;
    final boolean nextIsTomorrow, friday;
    final String hijri, city, methodLabel;
    final boolean hijriOfficial;
    private final HijriCalc hc;

    Day(Context c) {
        now = System.currentTimeMillis();
        double lat = Store.lat(c), lng = Store.lng(c);
        String cc = Store.country(c);
        String method = methodFor(lat, lng, cc);
        hc = calc(Store.officialJson(c), "SA".equalsIgnoreCase(cc) ? "SA" : "EG".equalsIgnoreCase(cc) || cc.isEmpty() ? "EG" : "");
        ZoneId zone = ZoneId.systemDefault();
        LocalDate d = LocalDate.now(zone);
        today = PrayerEngine.compute(d, lat, lng, PrayerEngine.method(method), isRamadan(d));
        tomorrow = PrayerEngine.compute(d.plusDays(1), lat, lng, PrayerEngine.method(method), isRamadan(d.plusDays(1)));
        int n = -1;
        for (int i = 0; i < 6; i++) if (today[i] > now) { n = i; break; }
        nextIsTomorrow = n < 0;
        next = n < 0 ? 0 : n;
        nextAt = n < 0 ? tomorrow[0] : today[n];
        long p = now - 6 * 3600_000L;
        for (int i = 0; i < 6; i++) if (today[i] <= now) p = today[i];
        prevAt = p;
        friday = d.getDayOfWeek().getValue() == 5;
        HijriCalc.Result hr = hc.of(d);
        hijriOfficial = hr.official;
        hijri = arabic(hr.d + " " + HIJRI_MONTHS[hr.m - 1] + " " + hr.y) + " هـ" + (hr.official ? " ✓" : "");
        city = Store.city(c);
        methodLabel = "Egyptian".equals(method) ? "الهيئة المصرية" : "UmmAlQura".equals(method) ? "أم القرى" : "";
    }

    static String methodFor(double lat, double lng, String cc) {
        if (cc != null && !cc.isEmpty()) return PrayerEngine.methodForCountry(cc);
        if (lat > 21.9 && lat < 31.8 && lng > 24.6 && lng < 36.9) return "Egyptian";
        if (lat > 16.3 && lat < 32.2 && lng > 34.5 && lng < 55.7) return "UmmAlQura";
        return "MuslimWorldLeague";
    }

    private boolean isRamadan(LocalDate d) {
        try {
            return hc.of(d).m == 9;
        } catch (Exception e) {
            return false;
        }
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
}
