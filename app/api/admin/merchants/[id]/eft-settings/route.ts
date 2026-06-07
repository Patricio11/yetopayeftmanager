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
