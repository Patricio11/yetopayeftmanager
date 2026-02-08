import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftMerchantFees } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq } from "drizzle-orm";

// GET /api/admin/recon/merchant-fees/[merchantId] — get merchant-specific fee config
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { merchantId } = await params;
    const fee = await db.query.eftMerchantFees.findFirst({
      where: eq(eftMerchantFees.merchantId, merchantId),
    });

    return NextResponse.json({ success: true, data: fee || null });
  } catch (error: any) {
    console.error("Error fetching merchant fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT /api/admin/recon/merchant-fees/[merchantId] — upsert merchant fee config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { merchantId } = await params;
    const body = await request.json();
    const { feeType, fixedFeeValue, percentageFeeValue, vatEnabled, vatRate } = body;

    // Check if exists
    const existing = await db.query.eftMerchantFees.findFirst({
      where: eq(eftMerchantFees.merchantId, merchantId),
    });

    if (existing) {
      const [updated] = await db.update(eftMerchantFees)
        .set({
          feeType: feeType || existing.feeType,
          fixedFeeValue: fixedFeeValue !== undefined ? (fixedFeeValue === null ? null : String(fixedFeeValue)) : existing.fixedFeeValue,
          percentageFeeValue: percentageFeeValue !== undefined ? (percentageFeeValue === null ? null : String(percentageFeeValue)) : existing.percentageFeeValue,
          vatEnabled: vatEnabled !== undefined ? vatEnabled : existing.vatEnabled,
          vatRate: vatRate !== undefined ? (vatRate === null ? null : String(vatRate)) : existing.vatRate,
          updatedAt: new Date(),
        })
        .where(eq(eftMerchantFees.merchantId, merchantId))
        .returning();
      return NextResponse.json({ success: true, data: updated });
    }

    // Create new
    const [created] = await db.insert(eftMerchantFees).values({
      merchantId,
      feeType: feeType || "fixed",
      fixedFeeValue: fixedFeeValue != null ? String(fixedFeeValue) : null,
      percentageFeeValue: percentageFeeValue != null ? String(percentageFeeValue) : null,
      vatEnabled: vatEnabled ?? null,
      vatRate: vatRate != null ? String(vatRate) : null,
    }).returning();

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    console.error("Error updating merchant fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/recon/merchant-fees/[merchantId] — remove custom fee (revert to system default)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { merchantId } = await params;
    await db.delete(eftMerchantFees).where(eq(eftMerchantFees.merchantId, merchantId));

    return NextResponse.json({ success: true, message: "Custom fee removed, system defaults will apply" });
  } catch (error: any) {
    console.error("Error deleting merchant fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
