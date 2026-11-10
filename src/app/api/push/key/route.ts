/** Public VAPID key for PushManager.subscribe (empty → push not configured on this deployment). */
import { NextResponse } from 'next/server';
import { VAPID_PUBLIC } from '@/lib/pushKey';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY || VAPID_PUBLIC, n8n: process.env.NEXT_PUBLIC_PUSH_WEBHOOK ?? '' });
}
