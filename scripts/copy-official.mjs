// Publishes the official Hijri month starts as a static file the Android widget reads:
//   https://prayertimealikotb.vercel.app/data/official-hijri.json
// Runs automatically before `npm run build` (npm "prebuild" hook), so every deploy is current.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = JSON.parse(readFileSync(new URL('../src/data/officialHijri.json', import.meta.url), 'utf8'));
mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true });
const out = { updated: new Date().toISOString(), EG: src.EG, SA: src.SA };
writeFileSync(new URL('../public/data/official-hijri.json', import.meta.url), JSON.stringify(out));
console.log(`official-hijri.json: ${src.EG.length} EG, ${src.SA.length} SA entries`);
