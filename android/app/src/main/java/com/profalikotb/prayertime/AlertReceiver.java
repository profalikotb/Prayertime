package com.profalikotb.prayertime;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;

/**
 * Fires at T − N (voice) or T (Adhan). Order of decisions:
 *  1. de-duplicate (Store.claim) and drop stale alarms (> 10 min late, e.g. delivered after a long power-off),
 *  2. silent / vibrate ringer or Do Not Disturb → notification only (vibration only if the phone is in vibrate mode),
 *  3. otherwise start AudioService (foreground, media playback — allowed from an exact alarm),
 *     and if Android refuses, fall back to a notification that carries the system sound.
 */
public class AlertReceiver extends BroadcastReceiver {
    static final String CH_SILENT = "prayer_alerts";
    static final String CH_SOUND = "prayer_alerts_sound";

    @Override
    public void onReceive(Context c, Intent in) {
        int i = in.getIntExtra(Alerts.X_IDX, 2);
        int kind = in.getIntExtra(Alerts.X_KIND, Alerts.KIND_ADHAN);
        long prayerAt = in.getLongExtra(Alerts.X_AT, System.currentTimeMillis());
        String id = in.getStringExtra(Alerts.X_ID);
        boolean test = in.getBooleanExtra("test", false);
        long due = kind == Alerts.KIND_VOICE && !test ? prayerAt - Store.voiceMin(c) * 60_000L : prayerAt;
        if (!test && System.currentTimeMillis() - due > 10 * 60_000L) return;
        if (id == null || !Store.claim(c, id)) return;

        Day d = new Day(c);
        String name = d.label(i);
        boolean voice = kind == Alerts.KIND_VOICE;
        String title = voice ? "⏳ " + name + " بعد " + Day.arabic(String.valueOf(Store.voiceMin(c))) + " دقائق" : "🕌 حان الآن وقت صلاة " + name;
        String body = voice ? Alerts.reminderText(i, Store.voiceMin(c)) : d.city + " · " + Day.time(prayerAt);
        String sound = voice ? Store.voiceSound(c, i) : Store.adhanSound(c, i);

        AudioManager am = c.getSystemService(AudioManager.class);
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        int ringer = am == null ? AudioManager.RINGER_MODE_NORMAL : am.getRingerMode();
        boolean dnd = nm != null && nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL;
        boolean audible = ringer == AudioManager.RINGER_MODE_NORMAL && !dnd && !"silent".equals(sound);

        if (Store.vibrate(c) && ringer != AudioManager.RINGER_MODE_SILENT && !dnd) vibrate(c);

        if (audible) {
            Intent s = new Intent(c, AudioService.class)
                    .putExtra(AudioService.X_SOUND, sound).putExtra(AudioService.X_TITLE, title).putExtra(AudioService.X_BODY, body)
                    .putExtra(AudioService.X_TTS, voice ? Alerts.reminderText(i, Store.voiceMin(c)) : null)
                    .putExtra(AudioService.X_VOICE, voice);
            try {
                c.startForegroundService(s);
                return; // the service shows the notification itself
            } catch (Exception e) {
                // Android 12+ may refuse a background FGS start (battery restrictions) → system-sound notification
                post(c, title, body, true, voice);
                return;
            }
        }
        post(c, title, body, false, voice);
    }

    static void channels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel a = new NotificationChannel(CH_SILENT, "تنبيهات الصلاة", NotificationManager.IMPORTANCE_HIGH);
        a.setSound(null, null); // audio is played by AudioService — never twice
        a.enableVibration(false);
        a.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(a);
        NotificationChannel b = new NotificationChannel(CH_SOUND, "تنبيهات الصلاة (صوت النظام)", NotificationManager.IMPORTANCE_HIGH);
        b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).build());
        b.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(b);
    }

    static Notification build(Context c, String title, String body, boolean withSound, boolean voice, PendingIntent stop) {
        channels(c);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        Notification.Builder b = new Notification.Builder(c, withSound ? CH_SOUND : CH_SILENT)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setColor(0xFF0E8A6A)
                .setCategory(voice ? Notification.CATEGORY_REMINDER : Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(PendingIntent.getActivity(c, 3, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        if (stop != null) b.addAction(new Notification.Action.Builder((android.graphics.drawable.Icon) null, "إيقاف الصوت", stop).build()).setDeleteIntent(stop);
        return b.build();
    }

    static void post(Context c, String title, String body, boolean withSound, boolean voice) {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(voice ? 20 : 21, build(c, title, body, withSound, voice, null));
    }

    private static void vibrate(Context c) {
        try {
            Vibrator v = c.getSystemService(Vibrator.class);
            if (v != null && v.hasVibrator()) v.vibrate(VibrationEffect.createWaveform(new long[]{0, 250, 150, 250}, -1));
        } catch (Exception ignored) {
        }
    }
}
