package com.profalikotb.prayertime;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.AlertDialog;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.MediaMetadataRetriever;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.Chronometer;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * App screen: today's times, widgets, location, calculation method, voice reminder, Adhan library,
 * permission health check. Everything is stored in Store, which the widgets and alarms read directly.
 */
public class MainActivity extends Activity {
    private static final int REQ = 7, REQ_MIC = 8, PICK_VOICE = 41, PICK_ADHAN = 42;
    private static final long MAX_VOICE_BYTES = 8L * 1024 * 1024, MAX_ADHAN_BYTES = 25L * 1024 * 1024;
    private LinearLayout box;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private MediaRecorder recorder;
    private File recFile;
    private long recStart;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().getDecorView().setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        ScrollView sv = new ScrollView(this);
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xFF0B3B33, 0xFF07141A});
        sv.setBackground(bg);
        box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(18), dp(42), dp(18), dp(40));
        sv.addView(box);
        setContentView(sv);
        AlertReceiver.channels(this);
        askPermissions();
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        Updater.updateAll(this);
        render();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (recorder != null) stopRecording(true);
    }

    /* ---------------- tiny view helpers ---------------- */
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

    private void section(String title) {
        TextView t = text(title, 19, 0xFFF2CF7A, true);
        t.setPadding(0, dp(24), 0, dp(4));
    }

    private Button button(String s, View.OnClickListener l, int color) {
        Button btn = new Button(this);
        btn.setText(s);
        btn.setAllCaps(false);
        btn.setTextSize(15);
        btn.setTextColor(Color.WHITE);
        btn.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        btn.setPadding(dp(16), 0, dp(16), 0);
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(14));
        btn.setBackground(g);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, dp(52));
        lp.topMargin = dp(8);
        btn.setLayoutParams(lp);
        btn.setOnClickListener(l);
        box.addView(btn);
        return btn;
    }

    private Switch toggle(String label, boolean on, android.widget.CompoundButton.OnCheckedChangeListener l) {
        Switch sw = new Switch(this);
        sw.setText(label);
        sw.setTextColor(0xFFFBF5E6);
        sw.setTextSize(15);
        sw.setChecked(on);
        sw.setPadding(0, dp(12), 0, dp(4));
        sw.setOnCheckedChangeListener(l);
        box.addView(sw);
        return sw;
    }

    private static final int GREEN = 0xFF0E8A6A, GLASS = 0x33FFFFFF, DIM = 0x99FBF5E6;

    private void changed() {
        Updater.updateAll(this);
        render();
    }

    /* ---------------- screen ---------------- */
    private void render() {
        box.removeAllViews();
        Day d = new Day(this);
        text("مواقيت الصلاة", 28, 0xFFF2CF7A, true);
        text("أ.د. على قطب", 14, DIM, false);
        String src = Store.locSource(this);
        String prec = "gps".equals(src) ? "دقيق" : "manual".equals(src) ? "يدوي" : "approx".equals(src) ? "تقريبي" : "افتراضي";
        text("📍 " + d.city + "  ·  " + prec + "  ·  " + d.methodLabel + (d.methodAuto ? "" : " 🔒"), 15, 0xFFFBF5E6, false);
        text(d.gregorian + "  ·  " + d.hijri, 14, 0xFFF2CF7A, false);

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
        nl.setTextColor(DIM);
        nl.setTextSize(14);
        TextView nn = new TextView(this);
        nn.setText(d.label(d.next) + "  " + Day.time(d.nextAt));
        nn.setTextColor(0xFFF2CF7A);
        nn.setTextSize(32);
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
            r.setPadding(0, dp(5), 0, dp(5));
        }
        if (!d.islamicLine.isEmpty()) text(d.islamicLine, 13, DIM, false).setPadding(0, dp(8), 0, 0);

        section("الودجت");
        button("➕  الكبير: كل المواقيت + التاريخ + القبلة", v -> pin(LargeWidget.class), GREEN);
        button("➕  المتوسط: الصلاة القادمة + الخمس صلوات", v -> pin(MediumWidget.class), GREEN);
        button("➕  الصغير: الصلاة القادمة والعدّاد", v -> pin(NextWidget.class), GREEN);
        toggle("إشعار دائم بالعدّاد على شاشة القفل", Store.notify(this), (x, on) -> {
            Store.setNotify(this, on);
            if (on) askPermissions();
            Updater.updateAll(this);
        });

        renderLocation();
        renderCalc(d);
        renderAlerts(d);
        renderHealth();

        section("التطبيق الكامل");
        button("🕌  فتح التطبيق الكامل (القرآن، التقويم، حدث في مثل هذا اليوم)", v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(Day.APP_URL))), GLASS);
        button("🧭  القبلة", v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(Day.APP_URL + "/#qibla"))), GLASS);
        text("الودجت يتحدث تلقائيًا بعد كل صلاة وعند تغيّر التاريخ أو المنطقة الزمنية أو الموقع، والعدّاد يعمل كل ثانية دون استهلاك للبطارية. إعدادات هذا التطبيق مستقلة عن إعدادات صفحة الويب.", 12, DIM, false).setPadding(0, dp(12), 0, 0);
    }

    /* ---------------- location ---------------- */
    private void renderLocation() {
        section("الموقع");
        button("📍  تحديث الموقع تلقائيًا (GPS)", v -> {
            Store.setAutoLocation(this);
            locate(true);
        }, GLASS);
        button("🏙  اختيار المدينة يدويًا", v -> {
            List<Cities.City> list = Cities.all(this);
            String[] names = new String[list.size()];
            for (int i = 0; i < names.length; i++) names[i] = list.get(i).ar + " — " + list.get(i).country;
            new AlertDialog.Builder(this).setTitle("اختر المدينة").setItems(names, (dlg, w) -> {
                Cities.choose(this, list.get(w));
                changed();
            }).show();
        }, GLASS);
    }

    /* ---------------- calculation ---------------- */
    private void renderCalc(Day d) {
        section("طريقة الحساب");
        String cur = Store.method(this);
        button("⚙️  " + ("auto".equals(cur) ? "تلقائي حسب البلد: " + d.methodLabel : "مثبّت: " + d.methodLabel + " 🔒"), v -> {
            String[] keys = new String[Day.METHOD_KEYS.length + 1];
            String[] labels = new String[keys.length];
            keys[0] = "auto";
            labels[0] = "تلقائي حسب الموقع (يتغيّر عند السفر)";
            int sel = 0;
            for (int i = 0; i < Day.METHOD_KEYS.length; i++) {
                keys[i + 1] = Day.METHOD_KEYS[i];
                labels[i + 1] = Day.label(Day.METHOD_KEYS[i]) + "  (" + detail(Day.METHOD_KEYS[i]) + ")";
                if (keys[i + 1].equals(cur)) sel = i + 1;
            }
            new AlertDialog.Builder(this).setTitle("طريقة الحساب").setSingleChoiceItems(labels, sel, (dlg, w) -> {
                Store.setMethod(this, keys[w]);
                dlg.dismiss();
                changed();
            }).show();
        }, GLASS);
        toggle("العصر على المذهب الحنفي (ظل المثلين)", Store.hanafi(this), (x, on) -> {
            Store.setHanafi(this, on);
            changed();
        });
        String[] hlKeys = {"auto", "middle", "seventh", "twilight"};
        String[] hlNames = {"تلقائي (سُبع الليل فوق ٤٨°)", "منتصف الليل", "سُبع الليل", "حسب الزاوية"};
        int hs = java.util.Arrays.asList(hlKeys).indexOf(Store.highLat(this));
        button("🌍  خطوط العرض العليا: " + hlNames[Math.max(0, hs)], v -> new AlertDialog.Builder(this).setTitle("قاعدة خطوط العرض العليا")
                .setSingleChoiceItems(hlNames, Math.max(0, hs), (dlg, w) -> {
                    Store.setHighLat(this, hlKeys[w]);
                    dlg.dismiss();
                    changed();
                }).show(), GLASS);
        button("⏱  تعديل الدقائق لكل صلاة (مطابقة المسجد)", v -> adjustDialog(), GLASS);
        int ho = Store.hijriOffset(this);
        String[] hoNames = {"تلقائي (دار الإفتاء ثم أم القرى)", "−٢ يوم", "−١ يوم", "بدون تعديل (أم القرى)", "+١ يوم", "+٢ يوم"};
        int hoSel = ho == Integer.MIN_VALUE ? 0 : ho + 3;
        button("🌙  تصحيح التاريخ الهجري: " + hoNames[hoSel], v -> new AlertDialog.Builder(this).setTitle("تصحيح التاريخ الهجري")
                .setSingleChoiceItems(hoNames, hoSel, (dlg, w) -> {
                    Store.setHijriOffset(this, w == 0 ? Integer.MIN_VALUE : w - 3);
                    dlg.dismiss();
                    changed();
                }).show(), GLASS);
    }

    private static String detail(String m) {
        switch (m) {
            case "Egyptian": return "فجر ١٩٫٥° · عشاء ١٧٫٥°";
            case "UmmAlQura": return "فجر ١٨٫٥° · عشاء ٩٠ د (١٢٠ في رمضان)";
            case "MuslimWorldLeague": return "فجر ١٨° · عشاء ١٧°";
            case "NorthAmerica": return "فجر ١٥° · عشاء ١٥°";
            case "FCNA": return "فجر ١٣° · عشاء ١٣°";
            case "UOIF": return "فجر ١٢° · عشاء ١٢°";
            case "Kuwait": return "فجر ١٨° · عشاء ١٧٫٥°";
            case "Qatar": return "فجر ١٨° · عشاء ٩٠ د";
            case "Karachi": return "فجر ١٨° · عشاء ١٨°";
            case "Dubai": return "فجر ١٨٫٢° · عشاء ١٨٫٢°";
            case "Singapore": return "فجر ٢٠° · عشاء ١٨°";
            case "Tehran": return "فجر ١٧٫٧° · عشاء ١٤°";
            default: return "";
        }
    }

    private void adjustDialog() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(dp(20), dp(8), dp(20), dp(8));
        for (int i = 0; i < 6; i++) {
            final int k = i;
            LinearLayout row = new LinearLayout(this);
            row.setGravity(Gravity.CENTER_VERTICAL);
            TextView name = new TextView(this);
            name.setText(Day.AR[i]);
            name.setTextSize(16);
            name.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
            TextView val = new TextView(this);
            val.setTextSize(16);
            val.setMinWidth(dp(48));
            val.setGravity(Gravity.CENTER);
            Runnable show = () -> {
                int a = Store.adj(this, k);
                val.setText(Day.arabic((a > 0 ? "+" : "") + a));
            };
            show.run();
            Button minus = new Button(this), plus = new Button(this);
            minus.setText("−");
            plus.setText("+");
            minus.setOnClickListener(v -> { Store.setAdj(this, k, Store.adj(this, k) - 1); show.run(); });
            plus.setOnClickListener(v -> { Store.setAdj(this, k, Store.adj(this, k) + 1); show.run(); });
            row.addView(name);
            row.addView(minus);
            row.addView(val);
            row.addView(plus);
            l.addView(row);
        }
        new AlertDialog.Builder(this).setTitle("تعديل الدقائق").setView(l).setPositiveButton("تم", (dlg, w) -> changed()).show();
    }

    /* ---------------- alerts: voice reminder + Adhan ---------------- */
    private void renderAlerts(Day d) {
        section("التنبيه بصوتي والأذان");
        toggle("تشغيل تنبيهات الصلاة (تعمل والهاتف مقفول)", Store.alertsOn(this), (x, on) -> {
            Store.setAlertsOn(this, on);
            if (on) askPermissions();
            changed();
        });
        toggle("التنبيه بصوتي قبل الصلاة", Store.voiceOn(this), (x, on) -> {
            Store.setVoiceOn(this, on);
            changed();
        });
        int[] mins = {3, 5, 10, 15, 20};
        button("⏳  قبل الأذان بـ " + Day.arabic(String.valueOf(Store.voiceMin(this))) + " دقائق", v -> {
            String[] n = new String[mins.length];
            int sel = 1;
            for (int i = 0; i < mins.length; i++) {
                n[i] = Day.arabic(String.valueOf(mins[i])) + " دقائق";
                if (mins[i] == Store.voiceMin(this)) sel = i;
            }
            new AlertDialog.Builder(this).setTitle("وقت التنبيه الصوتي").setSingleChoiceItems(n, sel, (dlg, w) -> {
                Store.setVoiceMin(this, mins[w]);
                dlg.dismiss();
                changed();
            }).show();
        }, GLASS);

        for (int i : Alerts.PRAYERS) {
            final int k = i;
            String vs = Store.voiceOn(this) && Store.voiceFor(this, i) ? soundName(Store.voiceSound(this, i), true) : "بدون";
            String as = Store.adhanFor(this, i) ? soundName(Store.adhanSound(this, i), false) : "بدون";
            button(Day.AR[i] + "   🎙 " + vs + "   🕌 " + as, v -> prayerDialog(k), 0x22FFFFFF);
        }

        button(recorder == null ? "🎙  تسجيل تنبيه بصوتي (حتى ٦٠ ثانية)" : "⏹  إيقاف التسجيل وحفظه", v -> {
            if (recorder == null) startRecording();
            else stopRecording(false);
        }, recorder == null ? GREEN : 0xFFC0392B);
        button("📁  إضافة ملف تنبيه صوتي (MP3 · M4A · WAV)", v -> pick(PICK_VOICE), GLASS);
        button("📁  إضافة ملف أذان (مصري، مكي، مدني، تركي، مغربي…)", v -> pick(PICK_ADHAN), GLASS);
        button("🗂  إدارة التسجيلات (تشغيل، تسمية، حذف)", v -> manageDialog(), GLASS);

        TextView vl = text("مستوى الصوت: " + Day.arabic(String.valueOf(Store.volume(this))) + "٪", 14, 0xFFFBF5E6, false);
        vl.setPadding(0, dp(12), 0, 0);
        SeekBar sb = new SeekBar(this);
        sb.setMax(100);
        sb.setProgress(Store.volume(this));
        sb.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar s, int p, boolean u) { vl.setText("مستوى الصوت: " + Day.arabic(String.valueOf(Math.max(5, p))) + "٪"); }
            @Override public void onStartTrackingTouch(SeekBar s) {}
            @Override public void onStopTrackingTouch(SeekBar s) { Store.setVolume(MainActivity.this, s.getProgress()); }
        });
        box.addView(sb);
        toggle("اهتزاز مع التنبيه", Store.vibrate(this), (x, on) -> Store.setVibrate(this, on));

        button("▶  تجربة كاملة: صوتك بعد ٣٠ ث ثم الأذان بعد ٦٠ ث", v -> {
            Alerts.scheduleTest(this, new Day(this));
            Toast.makeText(this, "اقفل الشاشة الآن للتأكد من عمل التنبيه في الخلفية", Toast.LENGTH_LONG).show();
        }, GREEN);
        button("⏹  إيقاف أي صوت يعمل الآن", v -> AudioService.stop(this), GLASS);
        text("يُحترم الوضع الصامت والاهتزاز وعدم الإزعاج: يظهر الإشعار دون صوت. الصوت يُشغَّل على مستوى صوت المنبّه.", 12, DIM, false).setPadding(0, dp(8), 0, 0);
    }

    private String soundName(String id, boolean voice) {
        if ("tts".equals(id)) return "صوت الجهاز";
        if ("default".equals(id)) return "صوت النظام";
        if ("silent".equals(id)) return "صامت";
        Store.Clip c = Store.clip(this, id);
        return c != null ? c.name : (voice ? "صوت الجهاز" : "صوت النظام");
    }

    /** One prayer: choose (or switch off) its voice reminder and its Adhan. */
    private void prayerDialog(int i) {
        String[] opts = {"🎙  التنبيه الصوتي قبل الأذان", "🕌  الأذان", "▶  تجربة التنبيه الصوتي", "▶  تجربة الأذان"};
        new AlertDialog.Builder(this).setTitle(Day.AR[i]).setItems(opts, (dlg, w) -> {
            if (w == 0) chooseSound(i, true);
            else if (w == 1) chooseSound(i, false);
            else preview(w == 2 ? Store.voiceSound(this, i) : Store.adhanSound(this, i), Day.AR[i], w == 2 ? Alerts.reminderText(i, Store.voiceMin(this)) : null, w == 2);
        }).show();
    }

    private void chooseSound(int i, boolean voice) {
        List<Store.Clip> clips = Store.clips(this, voice ? "voice" : "adhan");
        List<String> ids = new ArrayList<>(), names = new ArrayList<>();
        ids.add("off");
        names.add("إيقاف لهذه الصلاة");
        if (voice) { ids.add("tts"); names.add("صوت الجهاز يقرأ: «" + Alerts.reminderText(i, Store.voiceMin(this)) + "»"); }
        ids.add("default");
        names.add("صوت النظام");
        if (!voice) { ids.add("silent"); names.add("صامت (إشعار فقط)"); }
        for (Store.Clip c : clips) { ids.add("clip:" + c.id); names.add((voice ? "🎙 " : "🕌 ") + c.name); }
        boolean on = voice ? Store.voiceFor(this, i) : Store.adhanFor(this, i);
        String cur = on ? (voice ? Store.voiceSound(this, i) : Store.adhanSound(this, i)) : "off";
        int sel = Math.max(0, ids.indexOf(cur));
        new AlertDialog.Builder(this).setTitle(voice ? "التنبيه الصوتي — " + Day.AR[i] : "الأذان — " + Day.AR[i])
                .setSingleChoiceItems(names.toArray(new String[0]), sel, (dlg, w) -> {
                    String id = ids.get(w);
                    if (voice) {
                        Store.setVoiceFor(this, i, !"off".equals(id));
                        if (!"off".equals(id)) Store.setVoiceSound(this, i, id);
                    } else {
                        Store.setAdhanFor(this, i, !"off".equals(id));
                        if (!"off".equals(id)) Store.setAdhanSound(this, i, id);
                    }
                    dlg.dismiss();
                    changed();
                }).show();
    }

    private void preview(String sound, String name, String tts, boolean voice) {
        startForegroundService(new Intent(this, AudioService.class)
                .putExtra(AudioService.X_SOUND, sound).putExtra(AudioService.X_TITLE, "تجربة — " + name)
                .putExtra(AudioService.X_BODY, tts != null ? tts : "تجربة الأذان").putExtra(AudioService.X_TTS, tts).putExtra(AudioService.X_VOICE, voice));
    }

    private void manageDialog() {
        List<Store.Clip> all = Store.clips(this, null);
        if (all.isEmpty()) {
            Toast.makeText(this, "لا توجد تسجيلات بعد", Toast.LENGTH_SHORT).show();
            return;
        }
        String[] n = new String[all.size()];
        for (int i = 0; i < n.length; i++) n[i] = ("voice".equals(all.get(i).kind) ? "🎙 " : "🕌 ") + all.get(i).name;
        new AlertDialog.Builder(this).setTitle("التسجيلات على الجهاز").setItems(n, (dlg, w) -> {
            Store.Clip c = all.get(w);
            new AlertDialog.Builder(this).setTitle(c.name).setItems(new String[]{"▶  تشغيل", "✏️  إعادة التسمية", "🗑  حذف"}, (d2, a) -> {
                if (a == 0) preview("clip:" + c.id, c.name, null, "voice".equals(c.kind));
                else if (a == 1) {
                    EditText e = new EditText(this);
                    e.setText(c.name);
                    new AlertDialog.Builder(this).setTitle("الاسم").setView(e).setPositiveButton("حفظ", (d3, b) -> {
                        String s = e.getText().toString().trim();
                        if (!s.isEmpty()) Store.renameClip(this, c.id, s.length() > 60 ? s.substring(0, 60) : s);
                        render();
                    }).setNegativeButton("إلغاء", null).show();
                } else new AlertDialog.Builder(this).setMessage("حذف «" + c.name + "»؟").setPositiveButton("حذف", (d3, b) -> {
                    Store.deleteClip(this, c.id);
                    changed();
                }).setNegativeButton("إلغاء", null).show();
            }).show();
        }).show();
    }

    /* ---------------- recording ---------------- */
    private void startRecording() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
            return;
        }
        AudioService.stop(this);
        try {
            File dir = new File(getFilesDir(), "clips");
            dir.mkdirs();
            recFile = new File(dir, "voice_" + System.currentTimeMillis() + ".m4a");
            @SuppressWarnings("deprecation")
            MediaRecorder r = Build.VERSION.SDK_INT >= 31 ? new MediaRecorder(this) : new MediaRecorder();
            r.setAudioSource(MediaRecorder.AudioSource.MIC);
            r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            r.setAudioEncodingBitRate(96000);
            r.setAudioSamplingRate(44100);
            r.setMaxDuration(60_000);
            r.setOutputFile(recFile.getAbsolutePath());
            r.setOnInfoListener((m, what, extra) -> {
                if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) ui.post(() -> stopRecording(false));
            });
            r.prepare();
            r.start();
            recorder = r;
            recStart = SystemClock.elapsedRealtime();
            Toast.makeText(this, "جارٍ التسجيل… قل مثلًا: «باقي خمس دقائق على أذان صلاة العصر، استعد للصلاة»", Toast.LENGTH_LONG).show();
            render();
        } catch (Exception e) {
            recorder = null;
            Toast.makeText(this, "تعذّر بدء التسجيل", Toast.LENGTH_LONG).show();
        }
    }

    private void stopRecording(boolean discard) {
        MediaRecorder r = recorder;
        recorder = null;
        if (r == null) return;
        boolean ok = SystemClock.elapsedRealtime() - recStart > 800;
        try {
            r.stop();
        } catch (Exception e) {
            ok = false;
        }
        r.release();
        if (discard || !ok) {
            if (recFile != null) recFile.delete();
            render();
            return;
        }
        java.time.LocalDateTime n = java.time.LocalDateTime.now();
        String name = "تسجيلي " + Day.arabic(String.format(Locale.ROOT, "%02d/%02d %d:%02d", n.getDayOfMonth(), n.getMonthValue(), n.getHour(), n.getMinute()));
        Store.Clip c = new Store.Clip("c" + System.currentTimeMillis(), name, "voice", recFile.getAbsolutePath());
        Store.addClip(this, c);
        // first recording → use it for every prayer that still uses the device voice
        for (int i : Alerts.PRAYERS) if ("tts".equals(Store.voiceSound(this, i))) Store.setVoiceSound(this, i, "clip:" + c.id);
        Store.setVoiceOn(this, true);
        Toast.makeText(this, "حُفظ التسجيل واستُخدم للتنبيه الصوتي", Toast.LENGTH_LONG).show();
        changed();
    }

    /* ---------------- file import ---------------- */
    private void pick(int code) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("audio/*");
        startActivityForResult(i, code);
    }

    @Override
    protected void onActivityResult(int code, int res, Intent data) {
        super.onActivityResult(code, res, data);
        if (res != RESULT_OK || data == null || data.getData() == null) return;
        boolean voice = code == PICK_VOICE;
        Uri u = data.getData();
        String name = "تسجيل";
        long size = -1;
        try (Cursor cur = getContentResolver().query(u, null, null, null, null)) {
            if (cur != null && cur.moveToFirst()) {
                int ni = cur.getColumnIndex(OpenableColumns.DISPLAY_NAME), si = cur.getColumnIndex(OpenableColumns.SIZE);
                if (ni >= 0) name = cur.getString(ni);
                if (si >= 0) size = cur.getLong(si);
            }
        } catch (Exception ignored) {
        }
        if (size > (voice ? MAX_VOICE_BYTES : MAX_ADHAN_BYTES)) {
            Toast.makeText(this, "الملف كبير جدًا (الحد " + (voice ? "٨" : "٢٥") + " ميجابايت)", Toast.LENGTH_LONG).show();
            return;
        }
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.')).toLowerCase(Locale.ROOT) : ".mp3";
        if (!ext.matches("\\.(mp3|m4a|mp4|aac|wav|ogg|oga|opus|flac)")) ext = ".mp3";
        File dir = new File(getFilesDir(), "clips");
        dir.mkdirs();
        File out = new File(dir, (voice ? "voice_" : "adhan_") + System.currentTimeMillis() + ext);
        try (InputStream in = getContentResolver().openInputStream(u); OutputStream os = new FileOutputStream(out)) {
            byte[] buf = new byte[16384];
            long total = 0;
            for (int n; (n = in.read(buf)) > 0; ) {
                total += n;
                if (total > (voice ? MAX_VOICE_BYTES : MAX_ADHAN_BYTES)) throw new Exception("too big");
                os.write(buf, 0, n);
            }
        } catch (Exception e) {
            out.delete();
            Toast.makeText(this, "تعذّر نسخ الملف", Toast.LENGTH_LONG).show();
            return;
        }
        // validate: must be decodable audio with a duration
        long ms = 0;
        MediaMetadataRetriever mr = new MediaMetadataRetriever();
        try {
            mr.setDataSource(out.getAbsolutePath());
            String dur = mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            ms = dur == null ? 0 : Long.parseLong(dur);
        } catch (Exception ignored) {
        } finally {
            try { mr.release(); } catch (Exception ignored) { }
        }
        if (ms <= 0) {
            out.delete();
            Toast.makeText(this, "الملف ليس صوتًا صالحًا", Toast.LENGTH_LONG).show();
            return;
        }
        String clean = name.replaceAll("\\.[A-Za-z0-9]+$", "");
        Store.addClip(this, new Store.Clip("c" + System.currentTimeMillis(), clean.length() > 60 ? clean.substring(0, 60) : clean, voice ? "voice" : "adhan", out.getAbsolutePath()));
        Toast.makeText(this, "أُضيف «" + clean + "» — اختره من صف الصلاة", Toast.LENGTH_LONG).show();
        changed();
    }

    /* ---------------- permission / reliability health ---------------- */
    private void renderHealth() {
        section("موثوقية التنبيهات");
        boolean notif = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        AlarmManager am = getSystemService(AlarmManager.class);
        boolean exact = Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms());
        PowerManager pm = getSystemService(PowerManager.class);
        boolean battery = pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
        button((notif ? "✅" : "⚠️") + "  الإشعارات " + (notif ? "مسموحة" : "غير مسموحة — اضغط للسماح"), v -> {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
            startActivity(i);
        }, notif ? 0x2232D296 : 0x55C0392B);
        button((exact ? "✅" : "⚠️") + "  المنبّهات الدقيقة " + (exact ? "مسموحة" : "غير مسموحة — اضغط للسماح"), v -> {
            if (Build.VERSION.SDK_INT >= 31) startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName())));
        }, exact ? 0x2232D296 : 0x55C0392B);
        button((battery ? "✅" : "⚠️") + "  توفير البطارية " + (battery ? "لا يقيّد التطبيق" : "قد يؤخّر التنبيه — اضغط واختر «غير مقيّد»"), v ->
                startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)), battery ? 0x2232D296 : 0x55C0392B);
        text("بعض الشركات (شاومي، أوبو، هواوي، سامسونج) تضيف «تشغيل تلقائي» أو «تطبيقات نائمة»: اجعل «مواقيت الصلاة» مستثنى منها.", 12, DIM, false).setPadding(0, dp(8), 0, 0);
    }

    /* ---------------- widgets / permissions / location ---------------- */
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
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && !"manual".equals(Store.locSource(this)) && !getSharedPreferences("prayer", MODE_PRIVATE).getBoolean("locAsked", false)) {
            // ask once; a refusal is respected (no repeated prompts) — the user can still tap «تحديث الموقع»
            need.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            need.add(Manifest.permission.ACCESS_FINE_LOCATION);
            getSharedPreferences("prayer", MODE_PRIVATE).edit().putBoolean("locAsked", true).apply();
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            need.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (need.isEmpty()) locate(false);
        else requestPermissions(need.toArray(new String[0]), REQ);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        if (code == REQ_MIC) {
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) startRecording();
            else Toast.makeText(this, "لم يُسمح باستخدام الميكروفون", Toast.LENGTH_LONG).show();
            return;
        }
        locate(false);
        changed();
    }

    private void locate(boolean userAsked) {
        if ("manual".equals(Store.locSource(this)) && !userAsked) return;
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            if (userAsked) requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, REQ);
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
            ui.post(this::changed);
        }).start();
    }
}
