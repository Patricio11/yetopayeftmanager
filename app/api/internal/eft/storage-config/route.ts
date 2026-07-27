import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { storageConfig } from "@/lib/db/schema";
import { getProviderDef, isStorageProvider } from "@/lib/storage-integrations/registry";
import { decryptConfig } from "@/lib/storage-integrations/secret";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/internal/eft/storage-config
 *
 * Machine endpoint the EFT service polls to learn where to store artifacts. It
 * returns the ACTIVE provider with DECRYPTED credentials, so it is guarded by the
 * shared EFT_WEBHOOK_SECRET (Bearer) with a constant-time compare — never expose
 * this without the secret. Served over HTTPS only.
 *
 * Responses:
 *   { success: true, active: false }                      → no active provider (EFT uses its env)
 *   { success: true, active: true, provider, config }     → use this provider + decrypted config
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.EFT_WEBHOOK_SECRET || "";
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [active] = await db
      .select()
      .from(storageConfig)
      .where(eq(storageConfig.isActive, true))
      .limit(1);

    if (!active || !isStorageProvider(active.provider)) {
      return NextResponse.json({ success: true, active: false });
    }

    // Postgres write side isn't wired for the EFT service — tell it to use its env
    // rather than handing it a provider it can't write to.
    const def = getProviderDef(active.provider)!;
    if (!def.writeSupported) {
      return NextResponse.json({ success: true, active: false, reason: "provider-not-write-supported" });
    }

    const config = decryptConfig(def, (active.config as Record<string, string>) || {});
    return NextResponse.json({ success: true, active: true, provider: active.provider, config });
  } catch (error) {
    console.error("Error serving EFT storage config:", error);
    // On any failure, tell the EFT service there's nothing active so it falls back
    // to its env — never break the write side because this endpoint hiccupped.
    return NextResponse.json({ success: true, active: false, reason: "error" });
  }
}
