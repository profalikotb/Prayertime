import { model } from 'geomagnetism';

/**
 * Magnetic declination (degrees, east positive) from the World Magnetic Model WMM-2025.
 * Phone compasses report MAGNETIC north; true heading = magnetic heading + declination.
 * Cairo ≈ +4.8°, Makkah ≈ +3.5° in 2026 — uncorrected, the Qibla would be off by that much.
 */
export function declination(lat: number, lng: number, at: Date = new Date()): number {
  try {
    const d = model(at, { allowOutOfBoundsModel: true }).point([lat, lng]).decl;
    return Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}

const rad = Math.PI / 180;

/** Solar azimuth (° from true north, clockwise) and altitude (°) — NOAA algorithm, ±0.1°. */
export function sunPosition(at: Date, lat: number, lng: number): { az: number; alt: number } {
  const jd = at.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C =
    Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * rad);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos((125.04 - 1934.136 * T) * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) / rad;
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eot =
    4 / rad *
    (y * Math.sin(2 * L0 * rad) -
      2 * e * Math.sin(M * rad) +
      4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) -
      0.5 * y * y * Math.sin(4 * L0 * rad) -
      1.25 * e * e * Math.sin(2 * M * rad));
  const utcMin = at.getUTCHours() * 60 + at.getUTCMinutes() + at.getUTCSeconds() / 60;
  const tst = (utcMin + eot + 4 * lng + 1440) % 1440;
  const ha = tst / 4 < 0 ? tst / 4 + 180 : tst / 4 - 180;
  const cosZ = Math.sin(lat * rad) * Math.sin(decl * rad) + Math.cos(lat * rad) * Math.cos(decl * rad) * Math.cos(ha * rad);
  const zen = Math.acos(Math.max(-1, Math.min(1, cosZ))) / rad;
  const azDen = Math.cos(lat * rad) * Math.sin(zen * rad);
  let az: number;
  if (Math.abs(azDen) < 1e-6) az = lat > 0 ? 180 : 0;
  else {
    let c = (Math.sin(lat * rad) * Math.cos(zen * rad) - Math.sin(decl * rad)) / azDen;
    c = Math.max(-1, Math.min(1, c));
    az = Math.acos(c) / rad;
    az = ha > 0 ? (az + 180) % 360 : (540 - az) % 360;
  }
  return { az, alt: 90 - zen };
}

/**
 * Compass-free Qibla check for a day: the moment the sun stands exactly in the Qibla
 * direction (face the sun), and the moment it stands exactly opposite (your shadow points
 * to the Qibla). Only times with the sun ≥ 5° above the horizon are returned.
 * `dayStart` = local midnight instant of the civil day.
 */
export function sunQiblaTimes(dayStart: Date, lat: number, lng: number, bearing: number): { face: Date | null; shadow: Date | null } {
  const find = (target: number): Date | null => {
    let prev: number | null = null;
    for (let m = 0; m <= 1440; m += 2) {
      const t = new Date(dayStart.getTime() + m * 60000);
      const { az, alt } = sunPosition(t, lat, lng);
      let d = ((az - target + 540) % 360) - 180;
      if (prev !== null && alt >= 5 && Math.sign(d) !== Math.sign(prev) && Math.abs(d - prev) < 90) {
        // refine to the second by linear interpolation
        const frac = prev / (prev - d);
        return new Date(t.getTime() - (1 - frac) * 120000);
      }
      prev = alt >= 5 ? d : null;
      if (alt < 5) d = 0;
    }
    return null;
  };
  return { face: find(bearing), shadow: find((bearing + 180) % 360) };
}

/** Shortest signed angle a→b in degrees (−180…180]. */
export function angleDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}
