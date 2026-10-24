package com.profalikotb.prayertime;

import android.content.Context;
import android.content.SharedPreferences;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Persistent settings shared by the app screen, the widgets and the alarm receivers
 * (one SharedPreferences file → every component always sees the same values).
 */
final class Store {
    private static SharedPreferences p(Context c) { return c.getSharedPreferences("prayer", Context.MODE_PRIVATE); }

    /* ---------------- location ---------------- */
    static double lat(Context c) { return Double.longBitsToDouble(p(c).getLong("lat", Double.doubleToLongBits(30.0444))); }
    static double lng(Context c) { return Double.longBitsToDouble(p(c).getLong("lng", Double.doubleToLongBits(31.2357))); }
    static String city(Context c) { return p(c).getString("city", "القاهرة"); }
    static String country(Context c) { return p(c).getString("cc", "EG"); }
    /** gps | approx | default */
    static String locSource(Context c) { return p(c).getString("locSrc", "default"); }
    static boolean notify(Context c) { return p(c).getBoolean("notify", true); }

    static void setLocation(Context c, double lat, double lng) {
        p(c).edit().putLong("lat", Double.doubleToLongBits(lat)).putLong("lng", Double.doubleToLongBits(lng)).putString("locSrc", "gps").apply();
    }
    static void setPlace(Context c, String city, String cc) {
        SharedPreferences.Editor e = p(c).edit();
        if (city != null && !city.isEmpty()) e.putString("city", city);
        if (cc != null && !cc.isEmpty()) e.putString("cc", cc.toUpperCase());
        e.apply();
    }
    /** manual / approx placement (city chosen from the bundled list) */
    static void setPlaced(Context c, double lat, double lng, String city, String cc, String source) {
        p(c).edit().putLong("lat", Double.doubleToLongBits(lat)).putLong("lng", Double.doubleToLongBits(lng))
                .putString("city", city).putString("cc", cc.toUpperCase()).putString("locSrc", source).apply();
    }
    /** back to automatic (GPS) mode */
    static void setAutoLocation(Context c) { p(c).edit().putString("locSrc", "default").apply(); }
    static void setNotify(Context c, boolean on) { p(c).edit().putBoolean("notify", on).apply(); }

    /* ---------------- calculation ---------------- */
    /** "auto" or a PrayerEngine method key */
    static String method(Context c) { return p(c).getString("method", "auto"); }
    static void setMethod(Context c, String m) { p(c).edit().putString("method", m).apply(); }
    static boolean hanafi(Context c) { return p(c).getBoolean("hanafi", false); }
    static void setHanafi(Context c, boolean v) { p(c).edit().putBoolean("hanafi", v).apply(); }
    /** auto | middle | seventh | twilight */
    static String highLat(Context c) { return p(c).getString("highLat", "auto"); }
    static void setHighLat(Context c, String v) { p(c).edit().putString("highLat", v).apply(); }
    /** per-prayer minute offsets, index = PrayerEngine.KEYS */
    static int adj(Context c, int i) { return p(c).getInt("adj" + i, 0); }
    static void setAdj(Context c, int i, int v) { p(c).edit().putInt("adj" + i, Math.max(-30, Math.min(30, v))).apply(); }
    /** manual Hijri shift −2…+2; Integer.MIN_VALUE = automatic */
    static int hijriOffset(Context c) { return p(c).getInt("hijriOff", Integer.MIN_VALUE); }
    static void setHijriOffset(Context c, int v) { p(c).edit().putInt("hijriOff", v).apply(); }

    /* ---------------- alerts ---------------- */
    static boolean alertsOn(Context c) { return p(c).getBoolean("alerts", true); }
    static void setAlertsOn(Context c, boolean v) { p(c).edit().putBoolean("alerts", v).apply(); }
    static boolean voiceOn(Context c) { return p(c).getBoolean("voice", true); }
    static void setVoiceOn(Context c, boolean v) { p(c).edit().putBoolean("voice", v).apply(); }
    static int voiceMin(Context c) { return p(c).getInt("voiceMin", 5); }
    static void setVoiceMin(Context c, int v) { p(c).edit().putInt("voiceMin", v).apply(); }
    /** i = PrayerEngine index (0 fajr, 2 dhuhr, 3 asr, 4 maghrib, 5 isha) */
    static boolean voiceFor(Context c, int i) { return p(c).getBoolean("voiceOn" + i, true); }
    static void setVoiceFor(Context c, int i, boolean v) { p(c).edit().putBoolean("voiceOn" + i, v).apply(); }
    static boolean adhanFor(Context c, int i) { return p(c).getBoolean("adhanOn" + i, true); }
    static void setAdhanFor(Context c, int i, boolean v) { p(c).edit().putBoolean("adhanOn" + i, v).apply(); }
    /** sound id: "builtin" (res/raw/reminder_5min — «باقي خمس دقائق…») | "tts" | "default" | "silent" | "clip:<id>" */
    static String voiceSound(Context c, int i) { return p(c).getString("voiceSnd" + i, "builtin"); }
    static void setVoiceSound(Context c, int i, String v) { p(c).edit().putString("voiceSnd" + i, v).apply(); }
    static String adhanSound(Context c, int i) { return p(c).getString("adhanSnd" + i, "default"); }
    static void setAdhanSound(Context c, int i, String v) { p(c).edit().putString("adhanSnd" + i, v).apply(); }
    static int volume(Context c) { return p(c).getInt("volume", 100); }
    static void setVolume(Context c, int v) { p(c).edit().putInt("volume", Math.max(5, Math.min(100, v))).apply(); }
    static boolean vibrate(Context c) { return p(c).getBoolean("vibrate", true); }
    static void setVibrate(Context c, boolean v) { p(c).edit().putBoolean("vibrate", v).apply(); }

    /** de-duplication: an alert id fires at most once */
    static synchronized boolean claim(Context c, String id) {
        SharedPreferences sp = p(c);
        String day = id.substring(0, Math.min(10, id.length()));
        String fired = sp.getString("fired", "");
        if (!fired.startsWith(day)) fired = day;
        if (fired.contains("|" + id + "|")) return false;
        sp.edit().putString("fired", fired + "|" + id + "|").commit();
        return true;
    }

    /* ---------------- recordings (files in app storage, metadata here) ---------------- */
    static final class Clip {
        final String id, name, kind, file;
        Clip(String id, String name, String kind, String file) { this.id = id; this.name = name; this.kind = kind; this.file = file; }
    }

    static List<Clip> clips(Context c, String kind) {
        List<Clip> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(p(c).getString("clips", "[]"));
            for (int i = a.length() - 1; i >= 0; i--) {
                JSONObject o = a.getJSONObject(i);
                if (kind == null || kind.equals(o.optString("kind"))) {
                    Clip k = new Clip(o.getString("id"), o.getString("name"), o.getString("kind"), o.getString("file"));
                    if (new File(k.file).exists()) out.add(k);
                }
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    static Clip clip(Context c, String soundId) {
        if (soundId == null || !soundId.startsWith("clip:")) return null;
        for (Clip k : clips(c, null)) if (k.id.equals(soundId.substring(5))) return k;
        return null;
    }

    static void addClip(Context c, Clip k) {
        try {
            JSONArray a = new JSONArray(p(c).getString("clips", "[]"));
            a.put(new JSONObject().put("id", k.id).put("name", k.name).put("kind", k.kind).put("file", k.file));
            p(c).edit().putString("clips", a.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    static void renameClip(Context c, String id, String name) {
        try {
            JSONArray a = new JSONArray(p(c).getString("clips", "[]"));
            for (int i = 0; i < a.length(); i++) if (id.equals(a.getJSONObject(i).getString("id"))) a.getJSONObject(i).put("name", name);
            p(c).edit().putString("clips", a.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    /** removes the file and every assignment that pointed to it */
    static void deleteClip(Context c, String id) {
        try {
            JSONArray a = new JSONArray(p(c).getString("clips", "[]")), keep = new JSONArray();
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                if (id.equals(o.getString("id"))) new File(o.getString("file")).delete();
                else keep.put(o);
            }
            SharedPreferences.Editor e = p(c).edit().putString("clips", keep.toString());
            for (int i : Alerts.PRAYERS) {
                if (("clip:" + id).equals(voiceSound(c, i))) e.putString("voiceSnd" + i, "tts");
                if (("clip:" + id).equals(adhanSound(c, i))) e.putString("adhanSnd" + i, "default");
            }
            e.apply();
        } catch (Exception ignored) {
        }
    }

    /* ---------------- official Hijri data ---------------- */
    /** Official Hijri month starts (JSON published by the web app) + when they were last fetched. */
    static String officialJson(Context c) { return p(c).getString("official", HijriCalc.BUILT_IN); }
    static long officialFetchedAt(Context c) { return p(c).getLong("officialAt", 0); }
    static void setOfficial(Context c, String json) {
        p(c).edit().putString("official", json).putLong("officialAt", System.currentTimeMillis()).apply();
    }
    static void touchOfficial(Context c) { p(c).edit().putLong("officialAt", System.currentTimeMillis()).apply(); }
}
