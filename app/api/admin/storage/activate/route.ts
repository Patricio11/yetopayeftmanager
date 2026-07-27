import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { storageConfig } from "@/lib/db/schema";
import { eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getProviderDef, isStorageProvider } from "@/lib/storage-integrations/registry";
import { configComplete } from "@/lib/storage-integrations/secret";
import { invalidateAuditBackendCache } from "@/lib/eft-audit";

const activateSchema = z.object({
  provider: z.string().refine(isStorageProvider, "Unknown storage provider"),
});

/**
 * POST /api/admin/storage/activate
 * Make a provider the active one (exactly one active at a time). Requires the
 * provider's config to be complete. Admin only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { provider } = activateSchema.parse(await request.json());
    const def = getProviderDef(provider)!;

    const [existing] = await db.select().from(storageConfig).where(eq(storageConfig.provider, provider)).limit(1);
    const stored = (existing?.config as Record<string, string>) || {};

    if (!configComplete(def, stored, {})) {
      return NextResponse.json(
        { success: false, message: `Cannot activate ${def.label} — required fields are missing. Save the config first.` },
        { status: 400 }
      );
    }

    // Flip: deactivate everyone else, then activate (or insert) this provider.
    await db.update(storageConfig).set({ isActive: false }).where(ne(storageConfig.provider, provider));
    if (existing) {
      await db
        .update(storageConfig)
        .set({ isActive: true, updatedAt: new Date(), updatedBy: auth.session.user.id })
        .where(eq(storageConfig.provider, provider));
    } else {
      await db.insert(storageConfig).values({ provider, config: {}, isActive: true, updatedBy: auth.session.user.id });
    }

    invalidateAuditBackendCache();
    return NextResponse.json({
      success: true,
      message: `${def.label} is now the active storage provider.`,
      writeSupported: def.writeSupported,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request", details: error.issues }, { status: 400 });
    }
    console.error("Error activating storage provider:", error?.message || error);
    return NextResponse.json({ success: false, message: "Failed to activate storage provider" }, { status: 500 });
  }
}
