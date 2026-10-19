package com.profalikotb.prayertime;

import java.time.LocalDate;
import java.time.chrono.HijrahDate;
import java.time.temporal.ChronoField;
import java.util.ArrayList;
import java.util.List;

/**
 * Same rules as the web app's src/lib/hijri.ts:
 *  - Umm al-Qura base calendar (java.time HijrahDate = Umm al-Qura),
 *  - official month starts (Dar al-Ifta) override it: days 1–29 after an anchor are "official",
 *  - the anchor's shift is carried forward; a month before a later anchor absorbs the difference (day 30).
 * Pure Java — unit-tested on the desktop against the web app.
 */
public final class HijriCalc {
    public static final class Anchor {
        final int y, m;
        final LocalDate start;
        int k;
        public Anchor(int y, int m, LocalDate start) { this.y = y; this.m = m; this.start = start; }
    }

    public static final class Result {
        public final int y, m, d;
        public final boolean official;
        Result(int y, int m, int d, boolean official) { this.y = y; this.m = m; this.d = d; this.official = official; }
    }

    private final List<Anchor> anchors = new ArrayList<>();

    public HijriCalc(List<Anchor> raw) {
        for (Anchor a : raw) {
            Integer k = null;
            for (int cand : new int[]{0, -1, 1, -2, 2, -3, 3}) {
                int[] h = uq(a.start.plusDays(cand));
                if (h[0] == a.y && h[1] == a.m && h[2] == 1) { k = cand; break; }
            }
            if (k == null) continue; // inconsistent anchor — ignored, as in the web app
            a.k = k;
            anchors.add(a);
        }
        anchors.sort((p, q) -> p.start.compareTo(q.start));
    }

    public static int[] uq(LocalDate d) {
        HijrahDate h = HijrahDate.from(d);
        return new int[]{h.get(ChronoField.YEAR_OF_ERA), h.get(ChronoField.MONTH_OF_YEAR), h.get(ChronoField.DAY_OF_MONTH)};
    }

    public Result of(LocalDate date) {
        Anchor a = null, next = null;
        for (Anchor x : anchors) {
            if (!x.start.isAfter(date)) a = x;
            else if (next == null) next = x;
        }
        if (a != null) {
            long diff = date.toEpochDay() - a.start.toEpochDay();
            if (diff < 29) return new Result(a.y, a.m, (int) diff + 1, true);
        }
        int k = a == null ? 0 : a.k;
        int[] h = uq(date.plusDays(k));
        if (next != null && h[0] == next.y && h[1] == next.m) {
            int py = next.m == 1 ? next.y - 1 : next.y, pm = next.m == 1 ? 12 : next.m - 1;
            for (int back = 1; back <= 31; back++) {
                int[] p = uq(date.plusDays(k - back));
                if (p[0] == py && p[1] == pm && p[2] == 1) return new Result(py, pm, back + 1, false);
            }
        }
        return new Result(h[0], h[1], h[2], false);
    }

    /** Minimal parser for {"EG":[{"y":1448,"m":5,"start":"2026-10-12",...},...]} — no JSON library needed. */
    public static List<Anchor> parse(String json, String country) {
        List<Anchor> out = new ArrayList<>();
        if (json == null) return out;
        int i = json.indexOf("\"" + country + "\"");
        if (i < 0) return out;
        int open = json.indexOf('[', i), close = json.indexOf(']', open);
        if (open < 0 || close < 0) return out;
        String arr = json.substring(open + 1, close);
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\{[^}]*\\}").matcher(arr);
        while (m.find()) {
            String o = m.group();
            Integer y = num(o, "y"), mo = num(o, "m");
            java.util.regex.Matcher s = java.util.regex.Pattern.compile("\"start\"\\s*:\\s*\"(\\d{4}-\\d{2}-\\d{2})\"").matcher(o);
            if (y != null && mo != null && s.find()) out.add(new Anchor(y, mo, LocalDate.parse(s.group(1))));
        }
        return out;
    }

    private static Integer num(String o, String key) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"" + key + "\"\\s*:\\s*(\\d+)").matcher(o);
        return m.find() ? Integer.parseInt(m.group(1)) : null;
    }

    /** Built-in fallback = the official dates known at build time (kept in sync with src/data/officialHijri.json). */
    public static final String BUILT_IN = "{\"EG\":[{\"y\":1447,\"m\":9,\"start\":\"2026-02-19\"},{\"y\":1447,\"m\":12,\"start\":\"2026-05-18\"},{\"y\":1448,\"m\":5,\"start\":\"2026-10-12\"}],\"SA\":[]}";
}
