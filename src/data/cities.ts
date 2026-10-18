import type { Bi } from '../lib/types';

export interface City {
  id: string;
  name: Bi;
  cc: string;
  country: Bi;
  lat: number;
  lng: number;
  tz: string;
}

const EG: Bi = { ar: 'مصر', en: 'Egypt' };
const SA: Bi = { ar: 'السعودية', en: 'Saudi Arabia' };
const c = (id: string, ar: string, en: string, cc: string, country: Bi, lat: number, lng: number, tz: string): City => ({
  id,
  name: { ar, en },
  cc,
  country,
  lat,
  lng,
  tz,
});

export const CITIES: City[] = [
  // Egypt
  c('cairo', 'القاهرة', 'Cairo', 'EG', EG, 30.0444, 31.2357, 'Africa/Cairo'),
  c('heliopolis', 'مصر الجديدة', 'Heliopolis', 'EG', EG, 30.0911, 31.3225, 'Africa/Cairo'),
  c('new-cairo', 'القاهرة الجديدة', 'New Cairo', 'EG', EG, 30.03, 31.47, 'Africa/Cairo'),
  c('giza', 'الجيزة', 'Giza', 'EG', EG, 30.0131, 31.2089, 'Africa/Cairo'),
  c('october', 'السادس من أكتوبر', '6th of October', 'EG', EG, 29.9285, 30.9188, 'Africa/Cairo'),
  c('tukh', 'طوخ – القليوبية', 'Tukh, Qalyubia', 'EG', EG, 30.3539, 31.2014, 'Africa/Cairo'),
  c('banha', 'بنها', 'Banha', 'EG', EG, 30.466, 31.1858, 'Africa/Cairo'),
  c('shubra-kheima', 'شبرا الخيمة', 'Shubra El-Kheima', 'EG', EG, 30.1286, 31.2422, 'Africa/Cairo'),
  c('alexandria', 'الإسكندرية', 'Alexandria', 'EG', EG, 31.2001, 29.9187, 'Africa/Cairo'),
  c('tanta', 'طنطا', 'Tanta', 'EG', EG, 30.7865, 31.0004, 'Africa/Cairo'),
  c('mansoura', 'المنصورة', 'Mansoura', 'EG', EG, 31.0409, 31.3785, 'Africa/Cairo'),
  c('zagazig', 'الزقازيق', 'Zagazig', 'EG', EG, 30.5877, 31.502, 'Africa/Cairo'),
  c('shebin', 'شبين الكوم', 'Shebin El-Kom', 'EG', EG, 30.5586, 31.0123, 'Africa/Cairo'),
  c('damanhur', 'دمنهور', 'Damanhur', 'EG', EG, 31.0341, 30.4682, 'Africa/Cairo'),
  c('kafr-sheikh', 'كفر الشيخ', 'Kafr El-Sheikh', 'EG', EG, 31.1107, 30.9388, 'Africa/Cairo'),
  c('damietta', 'دمياط', 'Damietta', 'EG', EG, 31.4165, 31.8133, 'Africa/Cairo'),
  c('port-said', 'بورسعيد', 'Port Said', 'EG', EG, 31.2653, 32.3019, 'Africa/Cairo'),
  c('ismailia', 'الإسماعيلية', 'Ismailia', 'EG', EG, 30.5965, 32.2715, 'Africa/Cairo'),
  c('suez', 'السويس', 'Suez', 'EG', EG, 29.9668, 32.5498, 'Africa/Cairo'),
  c('fayoum', 'الفيوم', 'Fayoum', 'EG', EG, 29.3084, 30.8428, 'Africa/Cairo'),
  c('beni-suef', 'بني سويف', 'Beni Suef', 'EG', EG, 29.0661, 31.0994, 'Africa/Cairo'),
  c('minya', 'المنيا', 'Minya', 'EG', EG, 28.1099, 30.7503, 'Africa/Cairo'),
  c('asyut', 'أسيوط', 'Asyut', 'EG', EG, 27.1783, 31.1859, 'Africa/Cairo'),
  c('sohag', 'سوهاج', 'Sohag', 'EG', EG, 26.5591, 31.6957, 'Africa/Cairo'),
  c('qena', 'قنا', 'Qena', 'EG', EG, 26.1551, 32.716, 'Africa/Cairo'),
  c('luxor', 'الأقصر', 'Luxor', 'EG', EG, 25.6872, 32.6396, 'Africa/Cairo'),
  c('aswan', 'أسوان', 'Aswan', 'EG', EG, 24.0889, 32.8998, 'Africa/Cairo'),
  c('hurghada', 'الغردقة', 'Hurghada', 'EG', EG, 27.2579, 33.8116, 'Africa/Cairo'),
  c('sharm', 'شرم الشيخ', 'Sharm El-Sheikh', 'EG', EG, 27.9158, 34.33, 'Africa/Cairo'),
  c('matruh', 'مرسى مطروح', 'Marsa Matruh', 'EG', EG, 31.3543, 27.2373, 'Africa/Cairo'),
  c('arish', 'العريش', 'El-Arish', 'EG', EG, 31.1316, 33.7984, 'Africa/Cairo'),
  // Saudi Arabia
  c('makkah', 'مكة المكرمة', 'Makkah', 'SA', SA, 21.4225, 39.8262, 'Asia/Riyadh'),
  c('madinah', 'المدينة المنورة', 'Madinah', 'SA', SA, 24.4672, 39.6111, 'Asia/Riyadh'),
  c('jeddah', 'جدة', 'Jeddah', 'SA', SA, 21.4858, 39.1925, 'Asia/Riyadh'),
  c('riyadh', 'الرياض', 'Riyadh', 'SA', SA, 24.7136, 46.6753, 'Asia/Riyadh'),
  c('taif', 'الطائف', 'Taif', 'SA', SA, 21.2703, 40.4158, 'Asia/Riyadh'),
  c('dammam', 'الدمام', 'Dammam', 'SA', SA, 26.4207, 50.0888, 'Asia/Riyadh'),
  c('tabuk', 'تبوك', 'Tabuk', 'SA', SA, 28.3835, 36.5662, 'Asia/Riyadh'),
  c('abha', 'أبها', 'Abha', 'SA', SA, 18.2164, 42.5053, 'Asia/Riyadh'),
  // Region & world
  c('dubai', 'دبي', 'Dubai', 'AE', { ar: 'الإمارات', en: 'UAE' }, 25.2048, 55.2708, 'Asia/Dubai'),
  c('abu-dhabi', 'أبوظبي', 'Abu Dhabi', 'AE', { ar: 'الإمارات', en: 'UAE' }, 24.4539, 54.3773, 'Asia/Dubai'),
  c('kuwait', 'الكويت', 'Kuwait City', 'KW', { ar: 'الكويت', en: 'Kuwait' }, 29.3759, 47.9774, 'Asia/Kuwait'),
  c('doha', 'الدوحة', 'Doha', 'QA', { ar: 'قطر', en: 'Qatar' }, 25.2854, 51.531, 'Asia/Qatar'),
  c('manama', 'المنامة', 'Manama', 'BH', { ar: 'البحرين', en: 'Bahrain' }, 26.2285, 50.586, 'Asia/Bahrain'),
  c('muscat', 'مسقط', 'Muscat', 'OM', { ar: 'عُمان', en: 'Oman' }, 23.588, 58.3829, 'Asia/Muscat'),
  c('amman', 'عمّان', 'Amman', 'JO', { ar: 'الأردن', en: 'Jordan' }, 31.9454, 35.9284, 'Asia/Amman'),
  c('quds', 'القدس', 'Al-Quds (Jerusalem)', 'PS', { ar: 'فلسطين', en: 'Palestine' }, 31.7767, 35.2345, 'Asia/Hebron'),
  c('beirut', 'بيروت', 'Beirut', 'LB', { ar: 'لبنان', en: 'Lebanon' }, 33.8938, 35.5018, 'Asia/Beirut'),
  c('damascus', 'دمشق', 'Damascus', 'SY', { ar: 'سوريا', en: 'Syria' }, 33.5138, 36.2765, 'Asia/Damascus'),
  c('baghdad', 'بغداد', 'Baghdad', 'IQ', { ar: 'العراق', en: 'Iraq' }, 33.3152, 44.3661, 'Asia/Baghdad'),
  c('khartoum', 'الخرطوم', 'Khartoum', 'SD', { ar: 'السودان', en: 'Sudan' }, 15.5007, 32.5599, 'Africa/Khartoum'),
  c('tripoli', 'طرابلس', 'Tripoli', 'LY', { ar: 'ليبيا', en: 'Libya' }, 32.8872, 13.1913, 'Africa/Tripoli'),
  c('tunis', 'تونس', 'Tunis', 'TN', { ar: 'تونس', en: 'Tunisia' }, 36.8065, 10.1815, 'Africa/Tunis'),
  c('algiers', 'الجزائر', 'Algiers', 'DZ', { ar: 'الجزائر', en: 'Algeria' }, 36.7538, 3.0588, 'Africa/Algiers'),
  c('casablanca', 'الدار البيضاء', 'Casablanca', 'MA', { ar: 'المغرب', en: 'Morocco' }, 33.5731, -7.5898, 'Africa/Casablanca'),
  c('istanbul', 'إسطنبول', 'Istanbul', 'TR', { ar: 'تركيا', en: 'Türkiye' }, 41.0082, 28.9784, 'Europe/Istanbul'),
  c('karachi', 'كراتشي', 'Karachi', 'PK', { ar: 'باكستان', en: 'Pakistan' }, 24.8607, 67.0011, 'Asia/Karachi'),
  c('kuala-lumpur', 'كوالالمبور', 'Kuala Lumpur', 'MY', { ar: 'ماليزيا', en: 'Malaysia' }, 3.139, 101.6869, 'Asia/Kuala_Lumpur'),
  c('jakarta', 'جاكرتا', 'Jakarta', 'ID', { ar: 'إندونيسيا', en: 'Indonesia' }, -6.2088, 106.8456, 'Asia/Jakarta'),
  c('london', 'لندن', 'London', 'GB', { ar: 'المملكة المتحدة', en: 'United Kingdom' }, 51.5074, -0.1278, 'Europe/London'),
  c('paris', 'باريس', 'Paris', 'FR', { ar: 'فرنسا', en: 'France' }, 48.8566, 2.3522, 'Europe/Paris'),
  c('berlin', 'برلين', 'Berlin', 'DE', { ar: 'ألمانيا', en: 'Germany' }, 52.52, 13.405, 'Europe/Berlin'),
  c('new-york', 'نيويورك', 'New York', 'US', { ar: 'الولايات المتحدة', en: 'United States' }, 40.7128, -74.006, 'America/New_York'),
  c('toronto', 'تورونتو', 'Toronto', 'CA', { ar: 'كندا', en: 'Canada' }, 43.6532, -79.3832, 'America/Toronto'),
];

export function cityById(id: string | null | undefined): City | undefined {
  return id ? CITIES.find((x) => x.id === id) : undefined;
}

/** Great-circle distance in km. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearestCity(lat: number, lng: number): { city: City; km: number } {
  let best = CITIES[0];
  let bestKm = Infinity;
  for (const x of CITIES) {
    const k = distanceKm(lat, lng, x.lat, x.lng);
    if (k < bestKm) {
      bestKm = k;
      best = x;
    }
  }
  return { city: best, km: bestKm };
}

/** Last-resort country inference from the device timezone. */
export const TZ_COUNTRY: Record<string, string> = {
  'Africa/Cairo': 'EG',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY',
  'Asia/Baghdad': 'IQ',
  'Africa/Khartoum': 'SD',
  'Europe/Istanbul': 'TR',
  'Asia/Karachi': 'PK',
};
