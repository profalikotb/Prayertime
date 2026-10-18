package com.profalikotb.prayertime;

import android.content.Context;
import android.content.SharedPreferences;

/** Persistent settings: last known location, city, country, lock-screen notification toggle. */
final class Store {
    private static SharedPreferences p(Context c) { return c.getSharedPreferences("prayer", Context.MODE_PRIVATE); }

    static double lat(Context c) { return Double.longBitsToDouble(p(c).getLong("lat", Double.doubleToLongBits(30.0444))); }
    static double lng(Context c) { return Double.longBitsToDouble(p(c).getLong("lng", Double.doubleToLongBits(31.2357))); }
    static String city(Context c) { return p(c).getString("city", "القاهرة"); }
    static String country(Context c) { return p(c).getString("cc", "EG"); }
    static boolean notify(Context c) { return p(c).getBoolean("notify", true); }

    static void setLocation(Context c, double lat, double lng) {
        p(c).edit().putLong("lat", Double.doubleToLongBits(lat)).putLong("lng", Double.doubleToLongBits(lng)).apply();
    }
    static void setPlace(Context c, String city, String cc) {
        SharedPreferences.Editor e = p(c).edit();
        if (city != null && !city.isEmpty()) e.putString("city", city);
        if (cc != null && !cc.isEmpty()) e.putString("cc", cc.toUpperCase());
        e.apply();
    }
    static void setNotify(Context c, boolean on) { p(c).edit().putBoolean("notify", on).apply(); }
}
