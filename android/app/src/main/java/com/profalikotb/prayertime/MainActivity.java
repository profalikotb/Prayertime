package com.profalikotb.prayertime;

import android.Manifest;
import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.Chronometer;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Setup screen: permissions, location, one-tap "add widget", lock-screen notification toggle. */
public class MainActivity extends Activity {
    private static final int REQ = 7;
    private LinearLayout box;
    private TextView place, status;
    private final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().getDecorView().setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        ScrollView sv = new ScrollView(this);
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xFF0B3B33, 0xFF07141A});
        sv.setBackground(bg);
        box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(18), dp(42), dp(18), dp(32));
        sv.addView(box);
        setContentView(sv);
        askPermissions();
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        Updater.updateAll(this);
        render();
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private TextView text(String s, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setTextDirection(View.TEXT_DIRECTION_RTL);
        box.addView(t);
        return t;
    }

    private Button button(String s, View.OnClickListener l, int color) {
        Button btn = new Button(this);
        btn.setText(s);
        btn.setAllCaps(false);
        btn.setTextSize(16);
        btn.setTextColor(Color.WHITE);
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(14));
        btn.setBackground(g);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, dp(54));
        lp.topMargin = dp(10);
        btn.setLayoutParams(lp);
        btn.setOnClickListener(l);
        box.addView(btn);
        return btn;
    }

    private void render() {
        box.removeAllViews();
        Day d = new Day(this);
        text("مواقيت الصلاة", 28, 0xFFF2CF7A, true);
        text("أ.د. على قطب", 14, 0x99FBF5E6, false);
        place = text("📍 " + d.city + (d.methodLabel.isEmpty() ? "" : "  ·  " + d.methodLabel), 15, 0xFFFBF5E6, false);
        text(d.hijri, 15, 0xFFF2CF7A, false);

        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        hero.setGravity(Gravity.CENTER);
        hero.setPadding(dp(12), dp(16), dp(12), dp(16));
        GradientDrawable hb = new GradientDrawable();
        hb.setColor(0x1FFFFFFF);
        hb.setCornerRadius(dp(22));
        hero.setBackground(hb);
        LinearLayout.LayoutParams hl = new LinearLayout.LayoutParams(-1, -2);
        hl.topMargin = dp(14);
        hero.setLayoutParams(hl);
        TextView nl = new TextView(this);
        nl.setText("الصلاة القادمة");
        nl.setTextColor(0x99FBF5E6);
        nl.setTextSize(14);
        TextView nn = new TextView(this);
        nn.setText(d.label(d.next) + "  " + Day.time(d.nextAt));
        nn.setTextColor(0xFFF2CF7A);
        nn.setTextSize(34);
        nn.setTypeface(Typeface.DEFAULT_BOLD);
        Chronometer ch = new Chronometer(this);
        ch.setCountDown(true);
        ch.setBase(SystemClock.elapsedRealtime() + (d.nextAt - System.currentTimeMillis()));
        ch.setTextColor(Color.WHITE);
        ch.setTextSize(38);
        ch.setTypeface(Typeface.DEFAULT_BOLD);
        ch.start();
        hero.addView(nl);
        hero.addView(nn);
        hero.addView(ch);
        box.addView(hero);

        for (int i = 0; i < 6; i++) {
            boolean on = !d.nextIsTomorrow && i == d.next;
            TextView r = text(d.label(i) + "    " + Day.time(d.today[i]), i == 1 ? 17 : 21,
                    on ? 0xFFF2CF7A : d.today[i] <= d.now ? 0x66FBF5E6 : 0xFFFBF5E6, on);
            r.setPadding(0, dp(6), 0, dp(6));
        }

        text("", 6, 0, false);
        button("➕  إضافة الودجت الكبير للشاشة الرئيسية", v -> pin(LargeWidget.class), 0xFF0E8A6A);
        button("➕  إضافة ودجت «الصلاة القادمة»", v -> pin(NextWidget.class), 0xFF0E8A6A);
        button("📍  تحديث الموقع", v -> locate(true), 0x33FFFFFF);
        button("🕌  فتح التطبيق الكامل", v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(Day.APP_URL))), 0x33FFFFFF);

        Switch sw = new Switch(this);
        sw.setText("إشعار دائم بالعدّاد على شاشة القفل");
        sw.setTextColor(0xFFFBF5E6);
        sw.setTextSize(16);
        sw.setChecked(Store.notify(this));
        sw.setPadding(0, dp(18), 0, dp(6));
        sw.setOnCheckedChangeListener((x, on) -> {
            Store.setNotify(this, on);
            if (on) askPermissions();
            Updater.updateAll(this);
        });
        box.addView(sw);

        status = text("الودجت يتحدث تلقائيًا بعد كل صلاة، والعدّاد يعمل كل ثانية دون استهلاك للبطارية.", 13, 0x99FBF5E6, false);
    }

    private void pin(Class<?> cls) {
        AppWidgetManager m = getSystemService(AppWidgetManager.class);
        if (m != null && m.isRequestPinAppWidgetSupported()) {
            m.requestPinAppWidget(new ComponentName(this, cls), null, null);
        } else {
            Toast.makeText(this, "اضغط مطولًا على الشاشة الرئيسية ← الأدوات (Widgets) ← مواقيت الصلاة", Toast.LENGTH_LONG).show();
        }
    }

    private void askPermissions() {
        List<String> need = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            need.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            need.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            need.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (need.isEmpty()) locate(false);
        else requestPermissions(need.toArray(new String[0]), REQ);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        locate(false);
        Updater.updateAll(this);
        render();
    }

    private void locate(boolean userAsked) {
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            if (userAsked) askPermissions();
            return;
        }
        LocationManager lm = getSystemService(LocationManager.class);
        if (lm == null) return;
        String provider = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ? LocationManager.NETWORK_PROVIDER
                : lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ? LocationManager.GPS_PROVIDER : null;
        if (provider == null) {
            if (userAsked) Toast.makeText(this, "فعّل خدمة الموقع من الإعدادات", Toast.LENGTH_LONG).show();
            return;
        }
        if (userAsked) Toast.makeText(this, "جارٍ تحديد الموقع…", Toast.LENGTH_SHORT).show();
        try {
            lm.requestLocationUpdates(provider, 0, 0, new LocationListener() {
                @Override
                public void onLocationChanged(Location l) {
                    lm.removeUpdates(this);
                    Store.setLocation(MainActivity.this, l.getLatitude(), l.getLongitude());
                    geocode(l.getLatitude(), l.getLongitude());
                }
                @Override public void onProviderEnabled(String p) {}
                @Override public void onProviderDisabled(String p) {}
                @Override public void onStatusChanged(String p, int s, Bundle e) {}
            }, Looper.getMainLooper());
        } catch (SecurityException ignored) {
        }
    }

    /** City + country code on a background thread (Geocoder may use the network). */
    private void geocode(double lat, double lng) {
        new Thread(() -> {
            String city = "", cc = "";
            try {
                if (Geocoder.isPresent()) {
                    @SuppressWarnings("deprecation")
                    List<Address> a = new Geocoder(this, new Locale("ar")).getFromLocation(lat, lng, 1);
                    if (a != null && !a.isEmpty()) {
                        Address x = a.get(0);
                        city = x.getLocality() != null ? x.getLocality() : x.getSubAdminArea() != null ? x.getSubAdminArea() : x.getAdminArea();
                        cc = x.getCountryCode();
                    }
                }
            } catch (Exception ignored) {
            }
            if (cc == null || cc.isEmpty()) cc = Updater.countryFromTimezone(java.util.TimeZone.getDefault().getID());
            Store.setPlace(this, city, cc);
            ui.post(() -> {
                Updater.updateAll(this);
                render();
            });
        }).start();
    }
}
