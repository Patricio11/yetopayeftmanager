import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftSystemFees } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-server";

// GET /api/admin/recon/fees — get system default fee settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const rows = await db.select().from(eftSystemFees).limit(1);
    const defaults = rows[0] || {
      fixedFeeValue: "5.00",
      percentageFeeValue: "2.50",
      vatEnabled: true,
      vatRate: "15.00",
    };

    return NextResponse.json({ success: true, data: defaults });
  } catch (error: any) {
    console.error("Error fetching system fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/recon/fees — update system default fee settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { fixedFeeValue, percentageFeeValue, vatEnabled, vatRate } = body;

    const rows = await db.select().from(eftSystemFees).limit(1);

    if (rows.length === 0) {
      // Create initial row
      const [created] = await db.insert(eftSystemFees).values({
        fixedFeeValue: String(fixedFeeValue ?? "5.00"),
        percentageFeeValue: String(percentageFeeValue ?? "2.50"),
        vatEnabled: vatEnabled ?? true,
        vatRate: String(vatRate ?? "15.00"),
        updatedBy: session.user.id,
      }).returning();
      return NextResponse.json({ success: true, data: created });
    }

    // Update existing
    const [updated] = await db.update(eftSystemFees)
      .set({
        ...(fixedFeeValue !== undefined && { fixedFeeValue: String(fixedFeeValue) }),
        ...(percentageFeeValue !== undefined && { percentageFeeValue: String(percentageFeeValue) }),
        ...(vatEnabled !== undefined && { vatEnabled }),
        ...(vatRate !== undefined && { vatRate: String(vatRate) }),
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating system fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
