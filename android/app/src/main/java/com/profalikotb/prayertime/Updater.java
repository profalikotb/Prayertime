package com.profalikotb.prayertime;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.widget.RemoteViews;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.TimeZone;

/** Renders every widget + the lock-screen notification, then schedules the next refresh. */
final class Updater {
    static final String ACTION_TICK = "com.profalikotb.prayertime.TICK";
    private static final String CHANNEL = "next_prayer";
    private static final int NOTIF_ID = 1;

    private static final int GOLD = 0xFFF2CF7A, IVORY = 0xFFFBF5E6, DIM = 0x99FBF5E6, FADED = 0x55FBF5E6, ALERT = 0xFFFF9F6B;
    private static final int[] ROW = {R.id.row_fajr, R.id.row_sunrise, R.id.row_dhuhr, R.id.row_asr, R.id.row_maghrib, R.id.row_isha};
    private static final int[] NAME = {R.id.name_fajr, R.id.name_sunrise, R.id.name_dhuhr, R.id.name_asr, R.id.name_maghrib, R.id.name_isha};
    private static final int[] TIME = {R.id.time_fajr, R.id.time_sunrise, R.id.time_dhuhr, R.id.time_asr, R.id.time_maghrib, R.id.time_isha};
    private static final int[] BG = {R.drawable.bg_fajr, R.drawable.bg_sunrise, R.drawable.bg_dhuhr, R.drawable.bg_asr, R.drawable.bg_maghrib, R.drawable.bg_isha};

    static void updateAll(Context c) {
        followLocation(c);
        refreshOfficial(c);
        Day d = new Day(c);
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] large = m.getAppWidgetIds(new ComponentName(c, LargeWidget.class));
        int[] small = m.getAppWidgetIds(new ComponentName(c, NextWidget.class));
        if (large.length > 0) m.updateAppWidget(large, large(c, d));
        if (small.length > 0) m.updateAppWidget(small, next(c, d));
        notification(c, d);
        schedule(c, d);
    }

    private static PendingIntent openApp(Context c) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(Day.APP_URL));
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void hero(RemoteViews v, Day d) {
        v.setInt(R.id.root, "setBackgroundResource", BG[d.next]);
        v.setTextViewText(R.id.next_label, (d.soon() ? "⏰ " : "") + (d.next == 1 ? "التالي" : "الصلاة القادمة"));
        v.setTextViewText(R.id.next_name, d.label(d.next));
        v.setTextColor(R.id.next_name, d.soon() ? ALERT : GOLD);
        v.setTextViewText(R.id.next_time, Day.time(d.nextAt));
        long base = SystemClock.elapsedRealtime() + (d.nextAt - System.currentTimeMillis());
        v.setChronometer(R.id.countdown, base, null, true);
        v.setChronometerCountDown(R.id.countdown, true);
    }

    static RemoteViews large(Context c, Day d) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_large);
        hero(v, d);
        v.setTextViewText(R.id.hijri, d.hijri);
        v.setTextViewText(R.id.city, d.city);
        long span = Math.max(1, d.nextAt - d.prevAt);
        v.setProgressBar(R.id.progress, 1000, (int) Math.max(0, Math.min(1000, (d.now - d.prevAt) * 1000 / span)), false);
        for (int i = 0; i < 6; i++) {
            boolean on = !d.nextIsTomorrow && i == d.next;
            boolean passed = d.today[i] <= d.now;
            int color = on ? GOLD : passed ? FADED : i == 1 ? DIM : IVORY;
            v.setInt(ROW[i], "setBackgroundResource", on ? R.drawable.tile_on : R.drawable.tile_off);
            v.setTextViewText(NAME[i], d.label(i));
            v.setTextViewText(TIME[i], Day.time(d.today[i]));
            v.setTextColor(NAME[i], color);
            v.setTextColor(TIME[i], color);
        }
        v.setOnClickPendingIntent(R.id.root, openApp(c));
        return v;
    }

    static RemoteViews next(Context c, Day d) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_next);
        hero(v, d);
        v.setOnClickPendingIntent(R.id.root, openApp(c));
        return v;
    }

    /** Ongoing notification with a live countdown — visible on the Lock Screen. */
    private static void notification(Context c, Day d) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (!Store.notify(c) || (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)) {
            nm.cancel(NOTIF_ID);
            return;
        }
        NotificationChannel ch = new NotificationChannel(CHANNEL, "الصلاة القادمة", NotificationManager.IMPORTANCE_LOW);
        ch.setShowBadge(false);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
        StringBuilder all = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            if (i == 1) continue;
            if (all.length() > 0) all.append("   ");
            all.append(Day.AR[i].replace("ال", "")).append(' ').append(Day.time(d.today[i]).replace(" ص", "").replace(" م", ""));
        }
        Notification n = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle((d.soon() ? "⏰ " : "🕌 ") + d.label(d.next) + "  " + Day.time(d.nextAt))
                .setContentText(all.toString())
                .setStyle(new Notification.BigTextStyle().bigText(all.toString() + "\n" + d.hijri + " · " + d.city))
                .setWhen(d.nextAt)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setColor(0xFF0E8A6A)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setCategory(Notification.CATEGORY_STATUS)
                .setContentIntent(openApp(c))
                .build();
        nm.notify(NOTIF_ID, n);
    }

    /**
     * Fetches the official (Dar al-Ifta) Hijri month starts from the web app at most every 6 hours,
     * in the background; on success re-renders. Offline → the last saved copy (or the built-in one) is used.
     */
    private static volatile boolean fetching;

    private static void refreshOfficial(Context c) {
        if (fetching || System.currentTimeMillis() - Store.officialFetchedAt(c) < 6 * 3600_000L) return;
        fetching = true;
        Context app = c.getApplicationContext();
        new Thread(() -> {
            java.net.HttpURLConnection con = null;
            try {
                con = (java.net.HttpURLConnection) new java.net.URL(Day.APP_URL + "/data/official-hijri.json").openConnection();
                con.setConnectTimeout(8000);
                con.setReadTimeout(8000);
                con.setUseCaches(false);
                if (con.getResponseCode() == 200) {
                    String body;
                    try (java.io.InputStream in = con.getInputStream()) {
                        java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
                        byte[] chunk = new byte[8192];
                        for (int n; (n = in.read(chunk)) > 0; ) buf.write(chunk, 0, n);
                        body = buf.toString("UTF-8");
                    }
                    if (!HijriCalc.parse(body, "EG").isEmpty()) {
                        boolean changed = !body.equals(Store.officialJson(app));
                        Store.setOfficial(app, body);
                        if (changed) updateAll(app);
                    } else Store.touchOfficial(app);
                }
            } catch (Exception ignored) {
                // offline: retry on the next refresh
            } finally {
                if (con != null) con.disconnect();
                fetching = false;
            }
        }).start();
    }

    /** Refresh 15 min before the next prayer, right after it, and just after midnight. */
    private static void schedule(Context c, Day d) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        long now = System.currentTimeMillis();
        long t = d.nextAt + 2000;
        long pre = d.nextAt - 15 * 60_000L;
        if (pre > now + 5000) t = Math.min(t, pre);
        long midnight = LocalDate.now(ZoneId.systemDefault()).plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli() + 5000;
        t = Math.min(t, midnight);
        Intent i = new Intent(c, UpdateReceiver.class).setAction(ACTION_TICK);
        PendingIntent pi = PendingIntent.getBroadcast(c, 1, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
    }

    /** Silently follow the phone's last known location (no prompts); infer country from timezone on long trips. */
    private static void followLocation(Context c) {
        if (c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return;
        LocationManager lm = c.getSystemService(LocationManager.class);
        if (lm == null) return;
        Location best = null;
        for (String p : new String[]{LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER, LocationManager.PASSIVE_PROVIDER}) {
            try {
                Location l = lm.getLastKnownLocation(p);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            } catch (SecurityException | IllegalArgumentException ignored) {
            }
        }
        if (best == null) return;
        float[] dist = new float[1];
        Location.distanceBetween(Store.lat(c), Store.lng(c), best.getLatitude(), best.getLongitude(), dist);
        if (dist[0] < 15_000) return;
        Store.setLocation(c, best.getLatitude(), best.getLongitude());
        if (dist[0] > 300_000) {
            String cc = countryFromTimezone(TimeZone.getDefault().getID());
            Store.setPlace(c, "", cc);
        }
    }

    static String countryFromTimezone(String tz) {
        switch (tz) {
            case "Africa/Cairo": return "EG";
            case "Asia/Riyadh": return "SA";
            case "Asia/Dubai": return "AE";
            case "Asia/Kuwait": return "KW";
            case "Asia/Qatar": return "QA";
            case "Asia/Bahrain": return "BH";
            case "Europe/Istanbul": return "TR";
            case "Asia/Karachi": return "PK";
            case "Africa/Khartoum": return "SD";
            default: return "";
        }
    }
}
