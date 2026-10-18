export const KAABA = { lat: 21.422487, lng: 39.826206 };

/** Initial great-circle bearing from a point to the Kaaba, degrees clockwise from true north. */
export function qiblaBearing(lat: number, lng: number): number {
  const r = Math.PI / 180;
  const φ1 = lat * r;
  const φ2 = KAABA.lat * r;
  const Δλ = (KAABA.lng - lng) * r;
  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return (Math.atan2(y, x) / r + 360) % 360;
}

export function distanceToKaabaKm(lat: number, lng: number): number {
  const r = Math.PI / 180;
  const dφ = (KAABA.lat - lat) * r;
  const dλ = (KAABA.lng - lng) * r;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(lat * r) * Math.cos(KAABA.lat * r) * Math.sin(dλ / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function compassPoint(deg: number, lang: 'ar' | 'en'): string {
  const ar = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
  const en = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const i = Math.round(deg / 45) % 8;
  return (lang === 'ar' ? ar : en)[i];
}
