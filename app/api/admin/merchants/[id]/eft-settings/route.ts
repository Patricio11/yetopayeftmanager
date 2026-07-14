import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();

    const merchant = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true, eftSettings: true },
    });

    if (!merchant) {
      return NextResponse.json({ success: false, error: "Merchant not found" }, { status: 404 });
    }

    const currentSettings = (merchant.eftSettings as Record<string, any>) || {};
    const updatedSettings = { ...currentSettings };

    if (typeof body.enableReceipt === "boolean") {
      updatedSettings.enableReceipt = body.enableReceipt;
    }

    // Payment page layout (admin can configure for any merchant or partner)
    if (body.paymentLayout === "full" || body.paymentLayout === "banks_plain") {
      updatedSettings.paymentLayout = body.paymentLayout;
    }
    if (typeof body.plainShowCancel === "boolean") {
      updatedSettings.plainShowCancel = body.plainShowCancel;
    }
    if (typeof body.plainShowTerms === "boolean") {
      updatedSettings.plainShowTerms = body.plainShowTerms;
    }
    if (typeof body.plainBackground === "string" && /^#[0-9a-fA-F]{6}$/.test(body.plainBackground)) {
      updatedSettings.plainBackground = body.plainBackground;
    }
    // Custom brand colors — empty string resets to the default theme
    for (const key of ["brandColorFrom", "brandColorTo"] as const) {
      if (typeof body[key] === "string" && (body[key] === "" || /^#[0-9a-fA-F]{6}$/.test(body[key]))) {
        updatedSettings[key] = body[key];
      }
    }

    await db
      .update(users)
      .set({ eftSettings: updatedSettings, updatedAt: new Date() })
      .where(eq(users.id, id));

    return NextResponse.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error("Error updating EFT settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update EFT settings" },
      { status: 500 }
    );
  }
}
