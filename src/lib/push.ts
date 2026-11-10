'use client';
/**
 * Web Push: alerts with the app CLOSED (iPhone home-screen app on iOS 16.4+, Android Chrome, desktop Chrome/Edge).
 * The subscription + the minimum needed to compute times is stored by the n8n workflow «Prayer Push»;
 * n8n calls /api/push/tick every minute, which sends the notifications.
 */
import type { MethodKey, Place, Settings } from './types';

export const DEFAULT_WEBHOOK = 'https://n8n.srv1044029.hstgr.cloud/webhook/prayer-push';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** iPhone only allows push for the app added to the Home Screen. */
export function needsHomeScreen(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function urlB64ToUint8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function config(): Promise<{ key: string; webhook: string }> {
  const r = await fetch('/api/push/key', { cache: 'no-store' });
  const j = await r.json();
  return { key: j.key || '', webhook: j.n8n || DEFAULT_WEBHOOK };
}

function prefs(s: Settings, place: Place, method: MethodKey) {
  const five = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  return {
    lat: +place.lat.toFixed(4),
    lng: +place.lng.toFixed(4),
    tz: place.tz,
    cc: place.cc || 'EG',
    city: place.city[s.lang],
    method,
    asr: s.madhab,
    lead: s.audio.voice.minutes || 5,
    voice: s.audio.voice.enabled,
    adhan: true,
    prayers: five.filter((k) => s.notify.perPrayer[k].at),
    lang: s.lang,
    silentUntil: s.surgery?.until ?? 0,
  };
}

export type PushError = 'unsupported' | 'homescreen' | 'denied' | 'notconfigured' | 'network';

export async function enablePush(s: Settings, place: Place, method: MethodKey): Promise<void> {
  if (!pushSupported()) throw 'unsupported' as PushError;
  if (needsHomeScreen()) throw 'homescreen' as PushError;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw 'denied' as PushError;
  const { key, webhook } = await config().catch(() => ({ key: '', webhook: DEFAULT_WEBHOOK }));
  if (!key) throw 'notconfigured' as PushError;
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(key) as BufferSource }));
  await send(webhook, { action: 'save', ...sub.toJSON(), ...prefs(s, place, method) });
}

/** Re-sends the latest location / method / lead time for an existing subscription. */
export async function syncPush(s: Settings, place: Place, method: MethodKey): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const { webhook } = await config().catch(() => ({ webhook: DEFAULT_WEBHOOK }));
  await send(webhook, { action: 'save', ...sub.toJSON(), ...prefs(s, place, method) });
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const { webhook } = await config().catch(() => ({ webhook: DEFAULT_WEBHOOK }));
  await send(webhook, { action: 'delete', endpoint: sub.endpoint }).catch(() => undefined);
  await sub.unsubscribe();
}

async function send(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
  if (!r.ok) throw 'network' as PushError;
}
