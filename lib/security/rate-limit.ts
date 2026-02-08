/**
 * In-memory rate limiter for API endpoints.
 * For production at scale, replace with Redis-backed solution.
 */

import { NextResponse } from "next/server";
import { RATE_LIMITS } from "@/lib/constants";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given identifier (e.g., IP address or API key).
 * Returns null if allowed, or a NextResponse with 429 if rate limited.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = RATE_LIMITS.API_REQUESTS_PER_MINUTE,
  windowMs: number = 60_000
): NextResponse | null {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Extract client identifier from request for rate limiting.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIp || "unknown";
}
