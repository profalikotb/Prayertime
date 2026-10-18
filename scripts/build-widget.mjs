// Builds public/widget/PrayerWidget.js (Scriptable widget) by embedding the adhan engine.
// Run: npm run widget   (also runs automatically before `npm run build`)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const tpl = readFileSync(new URL('../widget/PrayerWidget.template.js', import.meta.url), 'utf8');
const umd = readFileSync(new URL('../node_modules/adhan/lib/bundles/adhan.umd.min.js', import.meta.url), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');
mkdirSync(new URL('../public/widget/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/widget/PrayerWidget.js', import.meta.url), tpl.replace('__ADHAN__', () => umd));
console.log('public/widget/PrayerWidget.js written');
