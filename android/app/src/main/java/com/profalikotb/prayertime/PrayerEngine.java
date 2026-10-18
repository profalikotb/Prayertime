package com.profalikotb.prayertime;

import java.time.LocalDate;

/**
 * Faithful Java port of adhan-js 4.4 (MIT, Batoul Apps) — the same engine the web app uses —
 * plus the app's conventions: Egyptian Dhuhr without +1, Umm al-Qura Isha 120 min in Ramadan,
 * prayers rounded to the nearest minute, sunrise rounded down.
 * Pure Java (no Android APIs) so it is unit-tested on the desktop against the web app.
 */
public final class PrayerEngine {

    public static final String[] KEYS = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};

    /* ---------------- parameters ---------------- */
    public static final class Params {
        public String method;
        public double fajrAngle, ishaAngle, maghribAngle;
        public int ishaInterval;
        public int shadow = 1; // 1 = Shafi/standard, 2 = Hanafi
        public double[] methodAdj = new double[6]; // fajr, sunrise, dhuhr, asr, maghrib, isha (minutes)
        public double[] userAdj = new double[6];
        public String highLat = "middle"; // middle | seventh | twilight
        public String shafaq = "general";

        Params(String m, double f, double i, int interval, double mg) {
            method = m; fajrAngle = f; ishaAngle = i; ishaInterval = interval; maghribAngle = mg;
        }
    }

    public static Params method(String key) {
        Params p;
        switch (key) {
            case "Egyptian": p = new Params(key, 19.5, 17.5, 0, 0); break; // app: no +1 Dhuhr
            case "UmmAlQura": p = new Params(key, 18.5, 0, 90, 0); break;
            case "Karachi": p = new Params(key, 18, 18, 0, 0); p.methodAdj[2] = 1; break;
            case "Dubai": p = new Params(key, 18.2, 18.2, 0, 0); p.methodAdj = new double[]{0, -3, 3, 3, 3, 0}; break;
            case "MoonsightingCommittee": p = new Params(key, 18, 18, 0, 0); p.methodAdj = new double[]{0, 0, 5, 0, 3, 0}; break;
            case "NorthAmerica": p = new Params(key, 15, 15, 0, 0); p.methodAdj[2] = 1; break;
            case "Kuwait": p = new Params(key, 18, 17.5, 0, 0); break;
            case "Qatar": p = new Params(key, 18, 0, 90, 0); break;
            case "Singapore": p = new Params(key, 20, 18, 0, 0); p.methodAdj[2] = 1; break;
            case "Tehran": p = new Params(key, 17.7, 14, 0, 4.5); break;
            case "Turkey": p = new Params(key, 18, 17, 0, 0); p.methodAdj = new double[]{0, -7, 5, 4, 7, 0}; break;
            default: p = new Params("MuslimWorldLeague", 18, 17, 0, 0); p.methodAdj[2] = 1;
        }
        return p;
    }

    /** Country (ISO alpha-2) → method, identical to src/lib/methods.ts */
    public static String methodForCountry(String cc) {
        if (cc == null) return "MuslimWorldLeague";
        switch (cc.toUpperCase()) {
            case "EG": case "SD": return "Egyptian";
            case "SA": case "BH": case "YE": return "UmmAlQura";
            case "AE": return "Dubai";
            case "KW": return "Kuwait";
            case "QA": return "Qatar";
            case "TR": return "Turkey";
            case "IR": return "Tehran";
            case "PK": case "IN": case "BD": case "AF": return "Karachi";
            case "SG": case "MY": case "ID": case "BN": return "Singapore";
            case "US": case "CA": return "NorthAmerica";
            case "GB": case "IE": return "MoonsightingCommittee";
            default: return "MuslimWorldLeague";
        }
    }

    /* ---------------- math helpers ---------------- */
    static double rad(double d) { return d * Math.PI / 180.0; }
    static double deg(double r) { return r * 180.0 / Math.PI; }
    static double norm(double n, double max) { return n - max * Math.floor(n / max); }
    static double unwind(double a) { return norm(a, 360.0); }
    static double quadrantShift(double a) { return (a >= -180 && a <= 180) ? a : a - 360 * Math.round(a / 360); }

    /* ---------------- Astronomical ---------------- */
    static double meanSolarLongitude(double T) { return unwind(280.4664567 + 36000.76983 * T + 0.0003032 * T * T); }
    static double meanLunarLongitude(double T) { return unwind(218.3165 + 481267.8813 * T); }
    static double ascendingNode(double T) { return unwind(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000); }
    static double meanSolarAnomaly(double T) { return unwind(357.52911 + 35999.05029 * T - 0.0001537 * T * T); }
    static double equationOfCenter(double T, double M) {
        double m = rad(M);
        return (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(m) + (0.019993 - 0.000101 * T) * Math.sin(2 * m) + 0.000289 * Math.sin(3 * m);
    }
    static double apparentSolarLongitude(double T, double L0) {
        double lon = L0 + equationOfCenter(T, meanSolarAnomaly(T));
        double O = 125.04 - 1934.136 * T;
        return unwind(lon - 0.00569 - 0.00478 * Math.sin(rad(O)));
    }
    static double meanObliquity(double T) { return 23.439291 - 0.013004167 * T - 0.0000001639 * T * T + 0.0000005036 * T * T * T; }
    static double apparentObliquity(double T, double e0) { return e0 + 0.00256 * Math.cos(rad(125.04 - 1934.136 * T)); }
    static double meanSiderealTime(double T) {
        double JD = T * 36525 + 2451545.0;
        return unwind(280.46061837 + 360.98564736629 * (JD - 2451545) + 0.000387933 * T * T - T * T * T / 38710000);
    }
    static double nutLon(double L0, double Lp, double O) {
        return -17.2 / 3600 * Math.sin(rad(O)) - 1.32 / 3600 * Math.sin(2 * rad(L0)) - 0.23 / 3600 * Math.sin(2 * rad(Lp)) + 0.21 / 3600 * Math.sin(2 * rad(O));
    }
    static double nutObl(double L0, double Lp, double O) {
        return 9.2 / 3600 * Math.cos(rad(O)) + 0.57 / 3600 * Math.cos(2 * rad(L0)) + 0.1 / 3600 * Math.cos(2 * rad(Lp)) - 0.09 / 3600 * Math.cos(2 * rad(O));
    }
    static double altitude(double phi, double delta, double H) {
        return deg(Math.asin(Math.sin(rad(phi)) * Math.sin(rad(delta)) + Math.cos(rad(phi)) * Math.cos(rad(delta)) * Math.cos(rad(H))));
    }
    static double approxTransit(double L, double theta0, double a2) {
        double m0 = norm((a2 - L - theta0) / 360, 1);
        double expected = norm((12.0 - L / 15.0) / 24.0, 1);
        if (m0 - expected > 0.5) return m0 - 1.0;
        if (expected - m0 > 0.5) return m0 + 1.0;
        return m0;
    }
    static double interpolate(double y2, double y1, double y3, double n) {
        double a = y2 - y1, b = y3 - y2, c = b - a;
        return y2 + n / 2 * (a + b + n * c);
    }
    static double interpolateAngles(double y2, double y1, double y3, double n) {
        double a = unwind(y2 - y1), b = unwind(y3 - y2), c = b - a;
        return y2 + n / 2 * (a + b + n * c);
    }
    static double correctedTransit(double m0, double L, double theta0, double a2, double a1, double a3) {
        double Theta = unwind(theta0 + 360.985647 * m0);
        double a = unwind(interpolateAngles(a2, a1, a3, m0));
        double H = quadrantShift(Theta + L - a);
        return (m0 + H / -360) * 24;
    }
    static double correctedHourAngle(double m0, double h0, double lat, double lon, boolean after, double theta0,
                                     double a2, double a1, double a3, double d2, double d1, double d3) {
        double term1 = Math.sin(rad(h0)) - Math.sin(rad(lat)) * Math.sin(rad(d2));
        double term2 = Math.cos(rad(lat)) * Math.cos(rad(d2));
        double H0 = deg(Math.acos(term1 / term2));
        double m = after ? m0 + H0 / 360 : m0 - H0 / 360;
        double Theta = unwind(theta0 + 360.985647 * m);
        double a = unwind(interpolateAngles(a2, a1, a3, m));
        double delta = interpolate(d2, d1, d3, m);
        double H = Theta + lon - a;
        double h = altitude(lat, delta, H);
        double dm = (h - h0) / (360 * Math.cos(rad(delta)) * Math.cos(rad(lat)) * Math.sin(rad(H)));
        return (m + dm) * 24;
    }
    static double julianDay(int y, int mo, int d) {
        int Y = mo > 2 ? y : y - 1;
        int M = mo > 2 ? mo : mo + 12;
        int A = Y / 100;
        int B = 2 - A + A / 4;
        int i0 = (int) Math.floor(365.25 * (Y + 4716));
        int i1 = (int) Math.floor(30.6001 * (M + 1));
        return i0 + i1 + d + B - 1524.5;
    }
    static boolean leap(int y) { return (y % 4 == 0) && !(y % 100 == 0 && y % 400 != 0); }
    static int daysSinceSolstice(int doy, int year, double lat) {
        int northern = 10, southern = leap(year) ? 173 : 172, days = leap(year) ? 366 : 365, r;
        if (lat >= 0) { r = doy + northern; if (r >= days) r -= days; }
        else { r = doy - southern; if (r < 0) r += days; }
        return r;
    }
    static double seasonMorning(double lat, int doy, int year, double sunriseMs) {
        double a = 75 + 28.65 / 55.0 * Math.abs(lat), b = 75 + 19.44 / 55.0 * Math.abs(lat), c = 75 + 32.74 / 55.0 * Math.abs(lat), d = 75 + 48.1 / 55.0 * Math.abs(lat);
        double adj = season(daysSinceSolstice(doy, year, lat), a, b, c, d);
        return sunriseMs + Math.round(adj * -60) * 1000.0;
    }
    static double seasonEvening(double lat, int doy, int year, double sunsetMs, String shafaq) {
        double a, b, c, d, L = Math.abs(lat);
        if ("ahmer".equals(shafaq)) { a = 62 + 17.4 / 55.0 * L; b = 62 - 7.16 / 55.0 * L; c = 62 + 5.12 / 55.0 * L; d = 62 + 19.44 / 55.0 * L; }
        else if ("abyad".equals(shafaq)) { a = 75 + 25.6 / 55.0 * L; b = 75 + 7.16 / 55.0 * L; c = 75 + 36.84 / 55.0 * L; d = 75 + 81.84 / 55.0 * L; }
        else { a = 75 + 25.6 / 55.0 * L; b = 75 + 2.05 / 55.0 * L; c = 75 - 9.21 / 55.0 * L; d = 75 + 6.14 / 55.0 * L; }
        double adj = season(daysSinceSolstice(doy, year, lat), a, b, c, d);
        return sunsetMs + Math.round(adj * 60.0) * 1000.0;
    }
    static double season(int dyy, double a, double b, double c, double d) {
        if (dyy < 91) return a + (b - a) / 91.0 * dyy;
        if (dyy < 137) return b + (c - b) / 46.0 * (dyy - 91);
        if (dyy < 183) return c + (d - c) / 46.0 * (dyy - 137);
        if (dyy < 229) return d + (c - d) / 46.0 * (dyy - 183);
        if (dyy < 275) return c + (b - c) / 46.0 * (dyy - 229);
        return b + (a - b) / 91.0 * (dyy - 275);
    }

    /* ---------------- SolarCoordinates / SolarTime ---------------- */
    static final class Solar {
        final double declination, rightAscension, siderealTime;
        Solar(double jd) {
            double T = (jd - 2451545.0) / 36525;
            double L0 = meanSolarLongitude(T), Lp = meanLunarLongitude(T), O = ascendingNode(T);
            double Lambda = rad(apparentSolarLongitude(T, L0));
            double Theta0 = meanSiderealTime(T);
            double dPsi = nutLon(L0, Lp, O), dEps = nutObl(L0, Lp, O);
            double eps0 = meanObliquity(T);
            double epsApp = rad(apparentObliquity(T, eps0));
            declination = deg(Math.asin(Math.sin(epsApp) * Math.sin(Lambda)));
            rightAscension = unwind(deg(Math.atan2(Math.cos(epsApp) * Math.sin(Lambda), Math.cos(Lambda))));
            siderealTime = Theta0 + dPsi * 3600 * Math.cos(rad(eps0 + dEps)) / 3600;
        }
    }

    static final class SolarTime {
        final Solar s, prev, next;
        final double lat, lon, m0, transit, sunrise, sunset;
        SolarTime(LocalDate date, double lat, double lon) {
            double jd = julianDay(date.getYear(), date.getMonthValue(), date.getDayOfMonth());
            this.lat = lat; this.lon = lon;
            s = new Solar(jd); prev = new Solar(jd - 1); next = new Solar(jd + 1);
            m0 = approxTransit(lon, s.siderealTime, s.rightAscension);
            transit = correctedTransit(m0, lon, s.siderealTime, s.rightAscension, prev.rightAscension, next.rightAscension);
            sunrise = hourAngle(-50 / 60.0, false);
            sunset = hourAngle(-50 / 60.0, true);
        }
        double hourAngle(double angle, boolean after) {
            return correctedHourAngle(m0, angle, lat, lon, after, s.siderealTime, s.rightAscension, prev.rightAscension, next.rightAscension,
                    s.declination, prev.declination, next.declination);
        }
        double afternoon(int shadow) {
            double tangent = Math.abs(lat - s.declination);
            double angle = deg(Math.atan(1.0 / (shadow + Math.tan(rad(tangent)))));
            return hourAngle(angle, true);
        }
    }

    /** JS Date TimeClip: fractional milliseconds are truncated toward zero */
    static double trunc(double ms) { return Double.isNaN(ms) ? ms : (ms < 0 ? Math.ceil(ms) : Math.floor(ms)); }

    /** adhan TimeComponents → UTC epoch ms on the given civil date (truncated to whole seconds). */
    static double utc(LocalDate d, double hoursUtc) {
        if (Double.isNaN(hoursUtc)) return Double.NaN;
        double h = Math.floor(hoursUtc);
        double m = Math.floor((hoursUtc - h) * 60);
        double s = Math.floor((hoursUtc - (h + m / 60)) * 3600);
        return d.toEpochDay() * 86400000.0 + h * 3600000 + m * 60000 + s * 1000;
    }

    /**
     * Prayer times for local civil date `date` at (lat, lon). Returns epoch milliseconds
     * [fajr, sunrise, dhuhr, asr, maghrib, isha], already rounded per the app's conventions.
     * `ramadan` switches Umm al-Qura Isha to 120 minutes.
     */
    public static long[] compute(LocalDate date, double lat, double lon, Params p, boolean ramadan) {
        String highLat = lat > 48 ? "seventh" : "middle"; // HighLatitudeRule.recommended
        SolarTime st = new SolarTime(date, lat, lon);
        double dhuhr = utc(date, st.transit), sunrise = utc(date, st.sunrise), sunset = utc(date, st.sunset);
        LocalDate tm = date.plusDays(1);
        SolarTime tst = new SolarTime(tm, lat, lon);
        double asr = utc(date, st.afternoon(p.shadow));
        double tomorrowSunrise = utc(tm, tst.sunrise);
        double night = (tomorrowSunrise - sunset) / 1000;
        boolean msc = "MoonsightingCommittee".equals(p.method);
        double fajr = utc(date, st.hourAngle(-p.fajrAngle, false));
        if (msc && lat >= 55) fajr = trunc(sunrise - (night / 7) * 1000);
        double safeFajr;
        if (msc) safeFajr = seasonMorning(lat, date.getDayOfYear(), date.getYear(), sunrise);
        else {
            double portion = "seventh".equals(highLat) ? 1.0 / 7 : "twilight".equals(highLat) ? p.fajrAngle / 60 : 0.5;
            safeFajr = trunc(sunrise - portion * night * 1000);
        }
        if (Double.isNaN(fajr) || safeFajr > fajr) fajr = safeFajr;

        double isha;
        int interval = p.ishaInterval;
        if ("UmmAlQura".equals(p.method) && ramadan) interval = 120;
        if (interval > 0) isha = sunset + interval * 60000.0;
        else {
            isha = utc(date, st.hourAngle(-p.ishaAngle, true));
            if (msc && lat >= 55) isha = trunc(sunset + (night / 7) * 1000);
            double safeIsha;
            if (msc) safeIsha = seasonEvening(lat, date.getDayOfYear(), date.getYear(), sunset, p.shafaq);
            else {
                double portion = "seventh".equals(highLat) ? 1.0 / 7 : "twilight".equals(highLat) ? p.ishaAngle / 60 : 0.5;
                safeIsha = trunc(sunset + portion * night * 1000);
            }
            if (Double.isNaN(isha) || safeIsha < isha) isha = safeIsha;
        }
        double maghrib = sunset;
        if (p.maghribAngle > 0) {
            double ab = utc(date, st.hourAngle(-p.maghribAngle, true));
            if (sunset < ab && isha > ab) maghrib = ab;
        }
        double[] raw = {fajr, sunrise, dhuhr, asr, maghrib, isha};
        long[] out = new long[6];
        for (int i = 0; i < 6; i++) {
            double t = raw[i] + (p.methodAdj[i] + p.userAdj[i]) * 60000.0;
            double min = t / 60000.0;
            out[i] = (long) ((i == 1 ? Math.floor(min) : Math.round(min)) * 60000.0);
        }
        return out;
    }
}
