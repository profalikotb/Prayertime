package com.profalikotb.prayertime;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarm ticks, boot, time/timezone changes → refresh everything. */
public class UpdateReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) { Updater.updateAll(c); }
}
