import { NextRequest, NextResponse } from 'next/server';

// Cache allowed iframe domains in memory (refreshed every 60s)
let cachedDomains: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

async function getAllowedDomains(origin: string): Promise<string[]> {
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_TTL && cachedDomains.length >= 0) {
    return cachedDomains;
  }

  try {
    const res = await fetch(`${origin}/api/internal/iframe-policy`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      cachedDomains = data.domains || [];
      cacheTimestamp = now;
    }
  } catch {
    // On error, use stale cache
  }

  return cachedDomains;
}

export async function proxy(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const domains = await getAllowedDomains(origin);

  const response = NextResponse.next();

  if (domains.length > 0) {
    // Build frame-ancestors with 'self' + whitelisted domains
    const frameAncestors = `frame-ancestors 'self' ${domains.join(' ')}`;
    response.headers.set('Content-Security-Policy', frameAncestors);
  } else {
    // No domains configured — allow all (backward compatible)
    response.headers.set('Content-Security-Policy', "frame-ancestors *");
  }

  // Remove X-Frame-Options since CSP frame-ancestors takes precedence
  response.headers.delete('X-Frame-Options');

  return response;
}

export const config = {
  matcher: '/pay/:path*',
};
