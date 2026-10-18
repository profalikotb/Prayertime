// مواقيت الصلاة – أ.د. على قطب · Scriptable widget (iOS Lock Screen + Home Screen)
// Lock Screen: rectangular (next prayer + live countdown + all times), inline, circular.
// Home Screen: small / medium / large.
// Same astronomy & conventions as the web app: Egyptian Survey (19.5°/17.5°) in Egypt,
// Umm al-Qura (18.5° / Maghrib+90, +120 in Ramadan) in Saudi Arabia, MWL elsewhere;
// prayers rounded to the nearest minute, sunrise rounded down.
// Tap opens the app.

const APP_URL = 'https://prayertimealikotb.vercel.app';
const FALLBACK = { lat: 30.0444, lng: 31.2357, name: 'القاهرة', cc: 'EG' }; // used if location is unavailable
const AR = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/* ---------------- engine: adhan.js (identical to the web app) ---------------- */
// The placeholder below is replaced by scripts/build-widget.mjs with the adhan UMD bundle (MIT, Batoul Apps)
const adhan = (function () {
  var module = { exports: {} };
  var exports = module.exports;
  __ADHAN__
  return module.exports;
})();

const BY_COUNTRY = { EG: 'Egyptian', SD: 'Egyptian', SA: 'UmmAlQura', BH: 'UmmAlQura', YE: 'UmmAlQura', AE: 'Dubai', KW: 'Kuwait', QA: 'Qatar', TR: 'Turkey', IR: 'Tehran', PK: 'Karachi', IN: 'Karachi', BD: 'Karachi', AF: 'Karachi', SG: 'Singapore', MY: 'Singapore', ID: 'Singapore', BN: 'Singapore', US: 'NorthAmerica', CA: 'NorthAmerica', GB: 'MoonsightingCommittee', IE: 'MoonsightingCommittee' };
const LABEL = { Egyptian: 'الهيئة المصرية', UmmAlQura: 'أم القرى', MuslimWorldLeague: 'رابطة العالم الإسلامي' };

function hijriMonth(date) {
  try {
    const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric' }).formatToParts(date);
    return +p.find((x) => x.type === 'month').value;
  } catch (e) {
    return 0;
  }
}

function method(lat, lng, cc) {
  if (cc && BY_COUNTRY[cc.toUpperCase()]) return BY_COUNTRY[cc.toUpperCase()];
  if (cc) return 'MuslimWorldLeague';
  // no country known (offline first run): coarse boxes for Egypt and Saudi Arabia
  if (lat > 21.9 && lat < 31.8 && lng > 24.6 && lng < 36.9) return 'Egyptian';
  if (lat > 16.3 && lat < 32.2 && lng > 34.5 && lng < 55.7) return 'UmmAlQura';
  return 'MuslimWorldLeague';
}

/** Same rules as src/lib/prayer.ts: Egyptian Dhuhr without +1, Umm al-Qura Isha 120 in Ramadan,
 *  prayers → nearest minute, sunrise → floor. (y, m, d) is the local civil date. */
function times(y, m, d, lat, lng, meth) {
  const coords = new adhan.Coordinates(lat, lng);
  const p = adhan.CalculationMethod[meth]();
  if (meth === 'Egyptian') p.methodAdjustments = Object.assign({}, p.methodAdjustments, { dhuhr: 0 });
  p.highLatitudeRule = adhan.HighLatitudeRule.recommended(coords);
  p.rounding = adhan.Rounding.None;
  const date = new Date(y, m - 1, d, 12);
  if (meth === 'UmmAlQura' && hijriMonth(date) === 9) p.ishaInterval = 120;
  const pt = new adhan.PrayerTimes(coords, date, p);
  const MIN = 60000;
  const t = {};
  for (const k of ORDER) t[k] = new Date((k === 'sunrise' ? Math.floor : Math.round)(pt[k].getTime() / MIN) * MIN);
  return t;
}

/* ---------------- location (cached) ---------------- */
async function where() {
  const KEY = 'pakpt.widget.loc';
  try {
    Location.setAccuracyToThreeKilometers();
    const l = await Location.current();
    let name = '';
    let cc = '';
    try {
      const g = await Location.reverseGeocode(l.latitude, l.longitude, 'ar');
      name = (g && g[0] && (g[0].locality || g[0].subAdministrativeArea || g[0].administrativeArea)) || '';
      cc = (g && g[0] && g[0].isoCountryCode) || '';
    } catch (e) {}
    const v = { lat: l.latitude, lng: l.longitude, name, cc };
    Keychain.set(KEY, JSON.stringify(v));
    return v;
  } catch (e) {
    try {
      if (Keychain.contains(KEY)) return JSON.parse(Keychain.get(KEY));
    } catch (e2) {}
    return FALLBACK;
  }
}

/* ---------------- build ---------------- */
const loc = await where();
const M = method(loc.lat, loc.lng, loc.cc);
const now = new Date();
const today = times(now.getFullYear(), now.getMonth() + 1, now.getDate(), loc.lat, loc.lng, M);
const tm = new Date(now.getTime() + 86400000);
const tomorrow = times(tm.getFullYear(), tm.getMonth() + 1, tm.getDate(), loc.lat, loc.lng, M);

let nextKey = ORDER.find((k) => today[k] > now);
let nextAt = nextKey ? today[nextKey] : tomorrow.fajr;
if (!nextKey) nextKey = 'fajr';
const isFri = now.getDay() === 5;
const label = (k) => (k === 'dhuhr' && isFri ? 'الجمعة' : AR[k]);
const fmt = (d) => d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });
const short = (d) => d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[صم]$/, '');

const family = config.widgetFamily || 'accessoryRectangular';
const w = new ListWidget();
w.url = APP_URL;
w.refreshAfterDate = new Date(nextAt.getTime() + 30000); // roll over right after the next prayer

if (family === 'accessoryInline') {
  const t = w.addText(`🕌 ${label(nextKey)} ${short(nextAt)}`);
  t.font = Font.semiboldSystemFont(14);
} else if (family === 'accessoryCircular') {
  w.addAccessoryWidgetBackground = true;
  const n = w.addText(label(nextKey));
  n.font = Font.boldSystemFont(12);
  n.centerAlignText();
  n.minimumScaleFactor = 0.6;
  const tt = w.addText(short(nextAt));
  tt.font = Font.semiboldRoundedSystemFont(13);
  tt.centerAlignText();
  tt.minimumScaleFactor = 0.6;
} else if (family === 'accessoryRectangular') {
  const top = w.addStack();
  top.centerAlignContent();
  const nm = top.addText(`${label(nextKey)} ${short(nextAt)}`);
  nm.font = Font.boldSystemFont(15);
  nm.minimumScaleFactor = 0.7;
  top.addSpacer();
  const cd = top.addDate(nextAt);
  cd.applyTimerStyle(); // live countdown, updated by iOS every second
  cd.font = Font.semiboldRoundedSystemFont(14);
  cd.rightAlignText();
  w.addSpacer(3);
  const row = w.addStack();
  for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    const col = row.addStack();
    col.layoutVertically();
    const a = col.addText(AR[k].replace('ال', ''));
    a.font = Font.systemFont(9);
    a.textOpacity = k === nextKey ? 1 : 0.65;
    const b = col.addText(short(today[k] > now || k !== nextKey ? today[k] : nextAt));
    b.font = k === nextKey ? Font.boldSystemFont(11) : Font.systemFont(11);
    b.minimumScaleFactor = 0.7;
    if (k !== 'isha') row.addSpacer();
  }
} else {
  // Home Screen
  const gold = new Color('#e8c77a');
  const g = new LinearGradient();
  g.colors = [new Color('#0b3b33'), new Color('#07141a')];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.setPadding(12, 14, 12, 14);
  const head = w.addStack();
  const city = head.addText(loc.name || 'مواقيت الصلاة');
  city.font = Font.semiboldSystemFont(11);
  city.textColor = new Color('#ffffff', 0.7);
  city.lineLimit = 1;
  head.addSpacer();
  const ml = head.addText(LABEL[M] || '');
  ml.font = Font.systemFont(9);
  ml.textColor = new Color('#ffffff', 0.45);
  w.addSpacer(4);
  const nx = w.addText(`${label(nextKey)} · ${fmt(nextAt)}`);
  nx.font = Font.boldSystemFont(family === 'small' ? 16 : 18);
  nx.textColor = gold;
  nx.minimumScaleFactor = 0.7;
  const cd = w.addDate(nextAt);
  cd.applyTimerStyle();
  cd.font = Font.boldRoundedSystemFont(family === 'small' ? 24 : 28);
  cd.textColor = Color.white();
  w.addSpacer();
  const keys = family === 'small' ? ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] : ORDER;
  const grid = w.addStack();
  if (family === 'small') grid.layoutVertically();
  for (const k of keys) {
    const r = grid.addStack();
    if (family !== 'small') r.layoutVertically();
    const a = r.addText(label(k));
    a.font = Font.systemFont(family === 'small' ? 10 : 10);
    a.textColor = k === nextKey ? gold : new Color('#ffffff', 0.7);
    if (family === 'small') r.addSpacer();
    const b = r.addText(short(today[k]));
    b.font = k === nextKey ? Font.boldSystemFont(11) : Font.systemFont(11);
    b.textColor = k === nextKey ? gold : Color.white();
    if (family !== 'small' && k !== 'isha') grid.addSpacer();
  }
}

if (config.runsInWidget || config.runsInAccessoryWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
