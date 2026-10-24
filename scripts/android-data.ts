/**
 * Exports the curated Hijri-dated history (src/data/history.ts) for the Android widget,
 * so the native "Islamic Today" line shows exactly the same, source-cited events.
 * Run: npm run android-data  (outputs are committed: android/app/src/main/assets/islamic.json, cities.json)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { HISTORY } from '../src/data/history';
import { CITIES } from '../src/data/cities';

const out = HISTORY.filter((e) => e.d !== null).map((e) => ({ m: e.m, d: e.d, y: e.y, ar: e.title.ar, disputed: !!e.disputed }));
mkdirSync('android/app/src/main/assets', { recursive: true });
writeFileSync('android/app/src/main/assets/islamic.json', JSON.stringify({ events: out }));
const cities = CITIES.map((c) => ({ id: c.id, ar: c.name.ar, country: c.country.ar, cc: c.cc, lat: c.lat, lng: c.lng, tz: c.tz }));
writeFileSync('android/app/src/main/assets/cities.json', JSON.stringify(cities));
console.log(`islamic.json: ${out.length} dated events · cities.json: ${cities.length} cities`);
