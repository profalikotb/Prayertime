/**
 * Officially announced Hijri month starts, per country — data lives in officialHijri.json.
 *
 * Egypt entries are added automatically by .github/workflows/hijri-watch.yml, which reads
 * Dar al-Ifta's crescent-sighting statements («بيان دار الإفتاء المصرية حول رؤية هلال شهر …»),
 * validates them three ways and commits only when all agree (otherwise it opens an Issue).
 * Manual edits remain possible: { y, m, start: 'yyyy-mm-dd', source }.
 *
 * Behaviour (see lib/hijri.ts): days 1–29 after an anchor are "official"; the shift versus
 * Umm al-Qura is carried forward to later months, labelled "calculated / provisional".
 */
import data from './officialHijri.json';

export interface OfficialMonthStart {
  y: number;
  m: number;
  start: string;
  source: string;
}

export const OFFICIAL_MONTH_STARTS: Record<'EG' | 'SA', OfficialMonthStart[]> = {
  EG: data.EG as OfficialMonthStart[],
  SA: data.SA as OfficialMonthStart[],
};
