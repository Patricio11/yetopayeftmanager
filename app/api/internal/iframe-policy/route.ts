import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { platformSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/internal/iframe-policy
 *
 * Internal endpoint (no auth) that returns the allowed iframe domains.
 * Used by Next.js middleware to set Content-Security-Policy frame-ancestors.
 * Cached in middleware with a 60-second TTL to avoid per-request DB queries.
 */
export async function GET() {
  try {
    const [row] = await db
      .select({ settingValue: platformSettings.settingValue })
      .from(platformSettings)
      .where(eq(platformSettings.settingKey, 'allowed_iframe_domains'));

    const raw = row?.settingValue || '';
    const domains = raw
      .split(',')
      .map((d: string) => d.trim())
      .filter(Boolean);

    return NextResponse.json({ domains });
  } catch {
    return NextResponse.json({ domains: [] });
  }
}
