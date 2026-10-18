// Refreshes the embedded adhan engine inside public/widget/PrayerWidget.js (between the ADHAN markers).
// The widget file is always complete and runnable as committed; run `npm run widget` after upgrading adhan.
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../public/widget/PrayerWidget.js', import.meta.url);
const src = readFileSync(file, 'utf8');
const umd = readFileSync(new URL('../node_modules/adhan/lib/bundles/adhan.umd.min.js', import.meta.url), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '').trim();
const out = src.replace(/(\/\* ADHAN-BEGIN \*\/\n)[\s\S]*?(\n\s*\/\* ADHAN-END \*\/)/, (_, a, b) => a + umd + b);
if (!out.includes('CalculationMethod')) throw new Error('adhan engine missing from widget');
writeFileSync(file, out);
console.log('widget engine refreshed');
