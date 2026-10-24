import type { Bi, MethodKey } from './types';

export interface MethodInfo {
  key: MethodKey;
  name: Bi;
  /** AlAdhan API method id, for cross-checking against api.aladhan.com */
  aladhan: number;
  detail: string;
}

export const METHODS: MethodInfo[] = [
  { key: 'Egyptian', aladhan: 5, detail: 'Fajr 19.5° · Isha 17.5°', name: { ar: 'الهيئة المصرية العامة للمساحة', en: 'Egyptian General Authority of Survey' } },
  { key: 'UmmAlQura', aladhan: 4, detail: 'Fajr 18.5° · Isha 90 min (120 in Ramadan)', name: { ar: 'جامعة أم القرى – مكة المكرمة', en: 'Umm Al-Qura University, Makkah' } },
  { key: 'MuslimWorldLeague', aladhan: 3, detail: 'Fajr 18° · Isha 17°', name: { ar: 'رابطة العالم الإسلامي', en: 'Muslim World League' } },
  { key: 'Dubai', aladhan: 16, detail: 'Fajr 18.2° · Isha 18.2°', name: { ar: 'دبي – الإمارات', en: 'Dubai (UAE)' } },
  { key: 'Kuwait', aladhan: 9, detail: 'Fajr 18° · Isha 17.5°', name: { ar: 'الكويت', en: 'Kuwait' } },
  { key: 'Qatar', aladhan: 10, detail: 'Fajr 18° · Isha 90 min', name: { ar: 'قطر', en: 'Qatar' } },
  { key: 'Turkey', aladhan: 13, detail: 'Diyanet', name: { ar: 'رئاسة الشؤون الدينية – تركيا', en: 'Diyanet (Turkey)' } },
  { key: 'Karachi', aladhan: 1, detail: 'Fajr 18° · Isha 18°', name: { ar: 'جامعة العلوم الإسلامية – كراتشي', en: 'University of Islamic Sciences, Karachi' } },
  { key: 'Tehran', aladhan: 7, detail: 'Fajr 17.7° · Isha 14°', name: { ar: 'معهد الجيوفيزياء – طهران', en: 'Institute of Geophysics, Tehran' } },
  { key: 'Singapore', aladhan: 11, detail: 'Fajr 20° · Isha 18°', name: { ar: 'سنغافورة / ماليزيا', en: 'MUIS Singapore / Malaysia' } },
  { key: 'NorthAmerica', aladhan: 2, detail: 'ISNA · Fajr 15° · Isha 15°', name: { ar: 'الجمعية الإسلامية لأمريكا الشمالية', en: 'ISNA (North America)' } },
  { key: 'FCNA', aladhan: 0, detail: 'Fajr 13° · Isha 13°', name: { ar: 'مجلس الفقه لأمريكا الشمالية – كندا', en: 'FCNA recommendation (Canada)' } },
  { key: 'UOIF', aladhan: 12, detail: 'Fajr 12° · Isha 12°', name: { ar: 'اتحاد المنظمات الإسلامية – فرنسا', en: 'UOIF / Muslims of France' } },
  { key: 'MoonsightingCommittee', aladhan: 15, detail: 'Seasonal', name: { ar: 'لجنة رؤية الهلال العالمية', en: 'Moonsighting Committee Worldwide' } },
  { key: 'Custom', aladhan: 99, detail: 'Fajr/Isha angles set by you', name: { ar: 'زوايا مخصصة / توقيت المسجد المحلي', en: 'Custom angles / local mosque' } },
];

export function methodInfo(k: MethodKey): MethodInfo {
  return METHODS.find((m) => m.key === k) ?? METHODS[2];
}

const BY_COUNTRY: Record<string, MethodKey> = {
  EG: 'Egyptian',
  SD: 'Egyptian',
  SA: 'UmmAlQura',
  BH: 'UmmAlQura',
  YE: 'UmmAlQura',
  AE: 'Dubai',
  KW: 'Kuwait',
  QA: 'Qatar',
  TR: 'Turkey',
  IR: 'Tehran',
  PK: 'Karachi',
  IN: 'Karachi',
  BD: 'Karachi',
  AF: 'Karachi',
  SG: 'Singapore',
  MY: 'Singapore',
  ID: 'Singapore',
  BN: 'Singapore',
  US: 'NorthAmerica',
  CA: 'FCNA',
  FR: 'UOIF',
  // UK: no single national timetable — MWL default; match your mosque with the per-prayer offsets or Custom angles
  GB: 'MuslimWorldLeague',
  IE: 'MoonsightingCommittee',
};

export function autoMethod(cc: string): MethodKey {
  return BY_COUNTRY[cc.toUpperCase()] ?? 'MuslimWorldLeague';
}
