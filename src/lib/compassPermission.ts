/**
 * iOS gates the compass behind DeviceOrientationEvent.requestPermission(), which Apple only allows
 * from inside a user tap. To make the compass "automatic", the request is made from the tap that
 * OPENS the Qibla screen (tab bar, home shortcut) — so the compass is already running when it appears.
 * Android / desktop: no permission exists — always granted.
 */
type Req = { requestPermission?: () => Promise<'granted' | 'denied'> };
const KEY = 'pakpt.compass';
let state: 'granted' | 'denied' | 'unknown' = 'unknown';
let pending: Promise<string> | null = null;

export function compassNeedsPermission(): boolean {
  return typeof window !== 'undefined' && typeof (window.DeviceOrientationEvent as unknown as Req)?.requestPermission === 'function';
}

export function compassState() {
  return compassNeedsPermission() ? state : 'granted';
}

/** Call synchronously inside a click/tap handler. Safe to call repeatedly. */
export function requestCompass(): Promise<string> {
  if (!compassNeedsPermission()) return Promise.resolve('granted');
  if (state === 'granted') return Promise.resolve('granted');
  pending ??= (window.DeviceOrientationEvent as unknown as Req)
    .requestPermission!()
    .then((r) => {
      state = r;
      try {
        if (r === 'granted') localStorage.setItem(KEY, '1');
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event('pakpt-compass'));
      return r;
    })
    .catch(() => 'unknown')
    .finally(() => {
      pending = null;
    });
  return pending;
}
