import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { storageConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { STORAGE_PROVIDERS, getProviderDef, isStorageProvider } from "@/lib/storage-integrations/registry";
import { maskConfig, mergeAndEncryptConfig } from "@/lib/storage-integrations/secret";
import { invalidateAuditBackendCache } from "@/lib/eft-audit";

/**
 * GET /api/admin/storage
 * The provider catalogue + each provider's saved config (secrets masked) +
 * which provider is active. Admin only.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const rows = await db.select().from(storageConfig);
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    const configs = STORAGE_PROVIDERS.map((def) => {
      const row = byProvider.get(def.key);
      return {
        provider: def.key,
        config: maskConfig(def, (row?.config as Record<string, string>) || {}),
        isActive: row?.isActive ?? false,
        lastTestOk: row?.lastTestOk ?? null,
        lastTestMessage: row?.lastTestMessage ?? null,
        lastTestedAt: row?.lastTestedAt ?? null,
      };
    });

    const activeProvider = rows.find((r) => r.isActive)?.provider ?? null;

    return NextResponse.json({ success: true, providers: STORAGE_PROVIDERS, configs, activeProvider });
  } catch (error) {
    console.error("Error loading storage config:", error);
    return NextResponse.json({ success: false, message: "Failed to load storage configuration" }, { status: 500 });
  }
}

const saveSchema = z.object({
  provider: z.string().refine(isStorageProvider, "Unknown storage provider"),
  config: z.record(z.string(), z.string()),
});

/**
 * PUT /api/admin/storage
 * Save a provider's credentials. Blank/masked secret fields keep the stored
 * value; secrets are encrypted at rest. Does NOT change which provider is active.
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { provider, config } = saveSchema.parse(await request.json());
    const def = getProviderDef(provider)!;

    const [existing] = await db.select().from(storageConfig).where(eq(storageConfig.provider, provider)).limit(1);
    const merged = mergeAndEncryptConfig(def, (existing?.config as Record<string, string>) || {}, config);

    if (existing) {
      await db
        .update(storageConfig)
        .set({ config: merged, updatedAt: new Date(), updatedBy: auth.session.user.id })
        .where(eq(storageConfig.provider, provider));
    } else {
      await db.insert(storageConfig).values({
        provider,
        config: merged,
        isActive: false,
        updatedBy: auth.session.user.id,
      });
    }

    invalidateAuditBackendCache();
    return NextResponse.json({ success: true, message: "Saved", config: maskConfig(def, merged) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request", details: error.issues }, { status: 400 });
    }
    console.error("Error saving storage config:", error?.message || error);
    return NextResponse.json({ success: false, message: "Failed to save storage configuration" }, { status: 500 });
  }
}
