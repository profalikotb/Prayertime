/** Public VAPID key for PushManager.subscribe (empty → push not configured on this deployment). */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY ?? '', n8n: process.env.NEXT_PUBLIC_PUSH_WEBHOOK ?? '' });
}
