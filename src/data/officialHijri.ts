/**
 * Officially announced Hijri month starts, per country.
 *
 * ONLY add an entry after reading the authority's own statement
 * (Egypt: Dar al-Ifta al-Misriyya "بيان رؤية هلال شهر …"; Saudi Arabia: Supreme Court announcement).
 * `start` = Gregorian civil date of day 1 (yyyy-mm-dd).
 *
 * Behaviour (see lib/hijri.ts):
 *  - Days 1–29 after an anchor are labelled "official".
 *  - The day shift between the anchor and Umm al-Qura is carried forward to later
 *    (unannounced) months, which are labelled "calculated / provisional".
 *
 * Saudi Arabia: the Umm al-Qura calendar is the official civil calendar; only add
 * SA entries when the Supreme Court's sighting announcement deviates from it
 * (typically Ramadan, Shawwal, Dhu al-Hijjah).
 */
export interface OfficialMonthStart {
  y: number;
  m: number;
  start: string;
  source: string;
}

export const OFFICIAL_MONTH_STARTS: Record<'EG' | 'SA', OfficialMonthStart[]> = {
  EG: [
    {
      y: 1447,
      m: 9,
      start: '2026-02-19',
      source:
        'https://dar-alifta.org/ar/articles/details/11039/بيان-دار-الإفتاء-المصرية-حول-رؤية-هلال-شهر-رمضان-لعام-1447هـ',
    },
    {
      y: 1447,
      m: 12,
      start: '2026-05-18',
      source: 'https://egyptianstreets.com/2026/05/18/egypt-confirms-eid-al-adha-dates-after-moon-sighting/',
    },
    {
      y: 1448,
      m: 5,
      start: '2026-10-12',
      source:
        'https://www.dar-alifta.org/ar/Articles/Details/12468/بيان-دار-الإفتاء-المصرية-حول-رؤية-هلال-شهر-جمادى-الأولى-لعام-1448هـ',
    },
  ],
  SA: [],
};
