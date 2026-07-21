import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const settingsSchema = z.object({
  subMerchantsDemoMode: z.boolean(),
});

/**
 * GET /api/partner/settings
 * Partner-specific settings (connector merchant processing mode).
 */
export async function GET() {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;

  try {
    const partner = await db.query.users.findFirst({
      where: eq(users.id, auth.session.user.id),
      columns: { metadata: true, accountMode: true, kycStatus: true, eftSettings: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        subMerchantsDemoMode: !!(partner?.metadata as any)?.subMerchantsDemoMode,
        accountMode: partner?.accountMode || "demo",
        kycStatus: partner?.kycStatus || "pending",
        auditEnabled: !!(partner?.eftSettings as any)?.auditEnabled,
      },
    });
  } catch (error) {
    console.error("Error fetching partner settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch partner settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/partner/settings
 * Update partner settings. subMerchantsDemoMode forces all connector
 * sub-merchant transactions into demo mode even when the partner is live.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { subMerchantsDemoMode } = settingsSchema.parse(body);

    const partner = await db.query.users.findFirst({
      where: eq(users.id, auth.session.user.id),
      columns: { metadata: true },
    });

    await db
      .update(users)
      .set({
        metadata: { ...((partner?.metadata as any) || {}), subMerchantsDemoMode },
        updatedAt: new Date(),
      })
      .where(eq(users.id, auth.session.user.id));

    return NextResponse.json({
      success: true,
      message: subMerchantsDemoMode
        ? "Connector merchants will now process in demo mode"
        : "Connector merchants now follow your account status",
      data: { subMerchantsDemoMode },
    });
  } catch (error) {
    console.error("Error updating partner settings:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid settings" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update partner settings" },
      { status: 500 }
    );
  }
}
