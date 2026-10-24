package com.profalikotb.prayertime;

import android.content.Context;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

/** Bundled city list (same as the web app, exported by scripts/android-data.ts) for manual and approximate placement. */
final class Cities {
    static final class City {
        final String ar, country, cc, tz;
        final double lat, lng;
        City(JSONObject o) throws Exception {
            ar = o.getString("ar"); country = o.getString("country"); cc = o.getString("cc"); tz = o.getString("tz");
            lat = o.getDouble("lat"); lng = o.getDouble("lng");
        }
    }

    private static List<City> cache;

    static synchronized List<City> all(Context c) {
        if (cache != null) return cache;
        List<City> out = new ArrayList<>();
        try (InputStream in = c.getAssets().open("cities.json")) {
            java.io.ByteArrayOutputStream b = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            for (int n; (n = in.read(buf)) > 0; ) b.write(buf, 0, n);
            JSONArray a = new JSONArray(b.toString("UTF-8"));
            for (int i = 0; i < a.length(); i++) out.add(new City(a.getJSONObject(i)));
        } catch (Exception ignored) {
        }
        cache = out;
        return out;
    }

    static void choose(Context c, City x) { Store.setPlaced(c, x.lat, x.lng, x.ar, x.cc, "manual"); }

    /** No location permission: device timezone → first bundled city in that timezone (approximate). */
    static void approx(Context c) {
        String tz = TimeZone.getDefault().getID();
        for (City x : all(c)) {
            if (x.tz.equals(tz)) {
                Store.setPlaced(c, x.lat, x.lng, x.ar, x.cc, "approx");
                return;
            }
        }
    }
}
