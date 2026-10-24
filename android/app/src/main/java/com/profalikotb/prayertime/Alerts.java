package com.profalikotb.prayertime;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Exact prayer alerts with AlarmManager (survives Doze; re-armed on boot, update, time/timezone change):
 *   T − N min → personal voice reminder      T → selected Adhan
 * Every (day, prayer, kind) has a fixed request code, so re-scheduling replaces instead of duplicating,
 * and Store.claim() guarantees a single playback even if the system delivers an alarm twice.
 */
final class Alerts {
    static final int[] PRAYERS = {0, 2, 3, 4, 5};
    static final String ACTION = "com.profalikotb.prayertime.ALERT";
    static final String X_IDX = "idx", X_KIND = "kind", X_AT = "at", X_ID = "id";
    static final int KIND_VOICE = 0, KIND_ADHAN = 1;

    /** Arms today's and tomorrow's remaining alerts. Called from Updater.updateAll(). */
    static void schedule(Context c, Day d) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        long now = System.currentTimeMillis();
        ZoneId z = ZoneId.systemDefault();
        LocalDate today = LocalDate.now(z);
        int vmin = Store.voiceMin(c);
        for (int day = 0; day < 2; day++) {
            long[] t = day == 0 ? d.today : d.tomorrow;
            LocalDate date = today.plusDays(day);
            for (int i : PRAYERS) {
                for (int kind = 0; kind < 2; kind++) {
                    long at = kind == KIND_VOICE ? t[i] - vmin * 60_000L : t[i];
                    boolean on = Store.alertsOn(c) && (kind == KIND_VOICE ? Store.voiceOn(c) && Store.voiceFor(c, i) : Store.adhanFor(c, i));
                    PendingIntent pi = pending(c, day, i, kind, date, at, t[i]);
                    if (!on || at <= now + 1000) {
                        am.cancel(pi);
                        continue;
                    }
                    if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                    else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                }
            }
        }
    }

    private static PendingIntent pending(Context c, int day, int i, int kind, LocalDate date, long at, long prayerAt) {
        Intent it = new Intent(c, AlertReceiver.class).setAction(ACTION)
                .putExtra(X_IDX, i).putExtra(X_KIND, kind).putExtra(X_AT, prayerAt)
                .putExtra(X_ID, date + "-" + i + "-" + kind);
        int code = 100 + day * 20 + i * 2 + kind;
        return PendingIntent.getBroadcast(c, code, it, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Test: the full sequence for the next prayer, compressed — voice in 30 s, Adhan in 60 s (works with the screen locked). */
    static void scheduleTest(Context c, Day d) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        int i = d.next == 1 ? 2 : d.next;
        long now = System.currentTimeMillis();
        String stamp = LocalDate.now() + "-test" + now;
        for (int kind = 0; kind < 2; kind++) {
            Intent it = new Intent(c, AlertReceiver.class).setAction(ACTION)
                    .putExtra(X_IDX, i).putExtra(X_KIND, kind).putExtra(X_AT, d.nextAt).putExtra(X_ID, stamp + "-" + kind).putExtra("test", true);
            PendingIntent pi = PendingIntent.getBroadcast(c, 90 + kind, it, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            long at = now + (kind == 0 ? 30_000 : 60_000);
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static String reminderText(int i, int minutes) {
        String n = i == 2 && Instant.now().atZone(ZoneId.systemDefault()).getDayOfWeek().getValue() == 5 ? "الجمعة" : Day.AR[i].replaceFirst("^ال", "");
        String m;
        switch (minutes) {
            case 3: m = "ثلاث دقائق"; break;
            case 5: m = "خمس دقائق"; break;
            case 10: m = "عشر دقائق"; break;
            case 15: m = "خمس عشرة دقيقة"; break;
            case 20: m = "عشرون دقيقة"; break;
            default: m = minutes + " دقيقة";
        }
        return "باقي " + m + " على أذان صلاة " + ("الجمعة".equals(n) ? n : "ال" + n) + "، استعد للصلاة.";
    }
}
