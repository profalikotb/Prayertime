package com.profalikotb.prayertime;

import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import java.io.File;

/**
 * Plays ONE alert sound at a time (voice recording, Arabic TTS, Adhan file or the system sound) as a
 * foreground media-playback service, so it keeps playing with the screen locked. A new alert or the
 * notification's «إيقاف الصوت» button stops the current one first → reminder and Adhan never overlap.
 */
public class AudioService extends Service {
    static final String X_SOUND = "sound", X_TITLE = "title", X_BODY = "body", X_TTS = "tts", X_VOICE = "voice";
    static final String ACTION_STOP = "com.profalikotb.prayertime.STOP_AUDIO";
    private static final int NOTIF = 22;
    private static final long MAX_MS = 10 * 60_000L;

    private MediaPlayer player;
    private AudioManager am;
    private AudioFocusRequest focus;
    private final Handler h = new Handler(Looper.getMainLooper());

    @Override
    public IBinder onBind(Intent i) { return null; }

    static void stop(Context c) {
        c.startService(new Intent(c, AudioService.class).setAction(ACTION_STOP));
    }

    @Override
    public int onStartCommand(Intent in, int flags, int startId) {
        if (in == null || ACTION_STOP.equals(in.getAction())) {
            finish();
            return START_NOT_STICKY;
        }
        boolean voice = in.getBooleanExtra(X_VOICE, false);
        PendingIntent stopPi = PendingIntent.getService(this, 4, new Intent(this, AudioService.class).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE);
        android.app.Notification n = AlertReceiver.build(this, in.getStringExtra(X_TITLE), in.getStringExtra(X_BODY), false, voice, stopPi);
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIF, n);
        release(); // never overlap with a previous alert
        String sound = in.getStringExtra(X_SOUND);
        am = getSystemService(AudioManager.class);
        requestFocus();
        h.postDelayed(this::finish, MAX_MS);
        if (voice) {
            // voice reminder: ONLY the recorded file or the soft chime — never a device / TTS voice
            playUri(raw("chime".equals(sound) ? R.raw.chime : R.raw.reminder_5min));
            return START_NOT_STICKY;
        }
        Store.Clip clip = Store.clip(this, sound);
        if ("chime".equals(sound)) playUri(raw(R.raw.chime));
        else if (clip != null && new File(clip.file).exists()) playUri(Uri.fromFile(new File(clip.file)));
        else playUri(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));
        return START_NOT_STICKY;
    }

    private AudioAttributes attrs() {
        // alarm usage: audible like a real alarm, but AlertReceiver only gets here when the ringer is normal and DND is off
        return new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
    }

    private void requestFocus() {
        if (am == null) return;
        focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attrs()).build();
        am.requestAudioFocus(focus);
    }

    private void playUri(Uri u) {
        if (u == null) {
            finish();
            return;
        }
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(attrs());
            player.setDataSource(this, u);
            float v = Store.volume(this) / 100f;
            player.setVolume(v, v);
            player.setOnCompletionListener(m -> finish());
            player.setOnErrorListener((m, w, e) -> {
                finish();
                return true;
            });
            player.setOnPreparedListener(MediaPlayer::start);
            player.prepareAsync();
        } catch (Exception e) {
            finish();
        }
    }

    private Uri raw(int id) { return Uri.parse("android.resource://" + getPackageName() + "/" + id); }

    private void release() {
        h.removeCallbacksAndMessages(null);
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
            }
            player.release();
            player = null;
        }
        if (am != null && focus != null) am.abandonAudioFocusRequest(focus);
    }

    private void finish() {
        release();
        stopForeground(STOP_FOREGROUND_DETACH); // keep the notification text visible
        stopSelf();
    }

    @Override
    public void onDestroy() {
        release();
        super.onDestroy();
    }
}
