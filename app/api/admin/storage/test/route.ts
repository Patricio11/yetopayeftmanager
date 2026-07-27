import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { storageConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getProviderDef, isStorageProvider, type StorageProviderKey } from "@/lib/storage-integrations/registry";
import { mergeAndEncryptConfig, decryptConfig } from "@/lib/storage-integrations/secret";
import { buildBackend } from "@/lib/storage-integrations/backends";

const testSchema = z.object({
  provider: z.string().refine(isStorageProvider, "Unknown storage provider"),
  // Optional draft edits to test before saving — merged over the stored config.
  config: z.record(z.string(), z.string()).optional(),
});

/**
 * POST /api/admin/storage/test
 * Run a connection round-trip for a provider. Uses the stored config merged with
 * any draft edits (so the admin can test before saving) — nothing is persisted
 * except the last-test result on the stored row (if one exists). Admin only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { provider, config: draft } = testSchema.parse(await request.json());
    const def = getProviderDef(provider)!;

    const [existing] = await db.select().from(storageConfig).where(eq(storageConfig.provider, provider)).limit(1);
    const stored = (existing?.config as Record<string, string>) || {};

    // Merge+encrypt the draft over stored, then decrypt everything for use. This
    // reuses the exact persistence path so a test reflects what a save would store.
    const merged = mergeAndEncryptConfig(def, stored, draft || {});
    const usable = decryptConfig(def, merged);

    const result = await buildBackend(provider as StorageProviderKey, usable).test();

    // Record the outcome on the stored row if it exists (nice for the panel).
    if (existing) {
      await db
        .update(storageConfig)
        .set({ lastTestedAt: new Date(), lastTestOk: result.ok, lastTestMessage: result.message })
        .where(eq(storageConfig.provider, provider));
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request", details: error.issues }, { status: 400 });
    }
    console.error("Error testing storage config:", error?.message || error);
    return NextResponse.json({ success: false, ok: false, message: "Test failed to run" }, { status: 500 });
  }
}
