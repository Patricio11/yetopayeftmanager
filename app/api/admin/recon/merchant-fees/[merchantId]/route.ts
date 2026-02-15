import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftMerchantFees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

// GET /api/admin/recon/merchant-fees/[merchantId] — get merchant-specific fee config
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

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
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { merchantId } = await params;
    const body = await request.json();
    const { feeType, fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } = body;

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
          volumeFeeValue: volumeFeeValue !== undefined ? (volumeFeeValue === null ? null : String(volumeFeeValue)) : existing.volumeFeeValue,
          vatEnabled: vatEnabled !== undefined ? vatEnabled : existing.vatEnabled,
          vatRate: vatRate !== undefined ? (vatRate === null ? null : String(vatRate)) : existing.vatRate,
          updatedAt: new Date(),
        })
        .where(eq(eftMerchantFees.merchantId, merchantId))
        .returning();
      writeAuditLog({ userId: auth.session.user.id, action: "update", resource: "merchant_fees", resourceId: merchantId, changes: { before: { feeType: existing.feeType, fixedFeeValue: existing.fixedFeeValue, percentageFeeValue: existing.percentageFeeValue, volumeFeeValue: existing.volumeFeeValue, vatEnabled: existing.vatEnabled, vatRate: existing.vatRate }, after: { feeType, fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } }, request });
      return NextResponse.json({ success: true, data: updated });
    }

    // Create new
    const [created] = await db.insert(eftMerchantFees).values({
      merchantId,
      feeType: feeType || "fixed",
      fixedFeeValue: fixedFeeValue != null ? String(fixedFeeValue) : null,
      percentageFeeValue: percentageFeeValue != null ? String(percentageFeeValue) : null,
      volumeFeeValue: volumeFeeValue != null ? String(volumeFeeValue) : null,
      vatEnabled: vatEnabled ?? null,
      vatRate: vatRate != null ? String(vatRate) : null,
    }).returning();

    writeAuditLog({ userId: auth.session.user.id, action: "create", resource: "merchant_fees", resourceId: merchantId, changes: { after: { feeType, fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } }, request });
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
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { merchantId } = await params;
    await db.delete(eftMerchantFees).where(eq(eftMerchantFees.merchantId, merchantId));

    writeAuditLog({ userId: auth.session.user.id, action: "delete", resource: "merchant_fees", resourceId: merchantId, request: _request });
    return NextResponse.json({ success: true, message: "Custom fee removed, system defaults will apply" });
  } catch (error: any) {
    console.error("Error deleting merchant fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
