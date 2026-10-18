/**
 * Foreground reminders. Browsers (and especially iOS PWAs) cannot schedule local
 * notifications in the background, so this fires only while the app is open.
 * Background reliability is delivered through the .ics calendar export.
 */

let ctx: AudioContext | null = null;
let adhanEl: HTMLAudioElement | null = null;
let adhanAvailable: boolean | null = null;

/** Must be called from a user gesture once (iOS audio unlock). */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx?.state === 'suspended') void ctx.resume();
  } catch {
    /* ignore */
  }
}

export function chime() {
  unlockAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  // soft three-note bell (D5, A5, D6) with exponential decay
  [587.33, 880, 1174.66].forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const s = t0 + i * 0.32;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.22, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 1.8);
    o.connect(g).connect(ctx!.destination);
    o.start(s);
    o.stop(s + 1.9);
  });
}

/** Optional: drop your own licensed recording at /public/adhan.mp3 to enable Adhan audio. */
export async function hasAdhanFile(): Promise<boolean> {
  if (adhanAvailable !== null) return adhanAvailable;
  try {
    const r = await fetch('/adhan.mp3', { method: 'HEAD', cache: 'no-store' });
    adhanAvailable = r.ok && (r.headers.get('content-type') ?? '').includes('audio');
  } catch {
    adhanAvailable = false;
  }
  return adhanAvailable;
}

export async function playAdhan() {
  if (!(await hasAdhanFile())) return chime();
  try {
    adhanEl ??= new Audio('/adhan.mp3');
    adhanEl.currentTime = 0;
    await adhanEl.play();
  } catch {
    chime();
  }
}

export function stopAdhan() {
  try {
    adhanEl?.pause();
  } catch {
    /* ignore */
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotify(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function show(title: string, body: string, vibrate: boolean) {
  if (vibrate) {
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      /* iOS has no vibrate API */
    }
  }
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: title, lang: 'ar' });
    else new Notification(title, { body, icon: '/icons/icon-192.png' });
  } catch {
    /* ignore */
  }
}
