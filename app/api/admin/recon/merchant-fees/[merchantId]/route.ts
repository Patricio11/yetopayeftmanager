import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftMerchantFees } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

// GET /api/admin/recon/merchant-fees/[merchantId] — get merchant-specific fee config
// Optional query param: ?serviceName=eft_direct  (if omitted, returns ALL fee rows for the merchant)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { merchantId } = await params;
    const serviceName = request.nextUrl.searchParams.get("serviceName");

    if (serviceName) {
      // Return a single row for the requested service
      const fee = await db.query.eftMerchantFees.findFirst({
        where: and(
          eq(eftMerchantFees.merchantId, merchantId),
          eq(eftMerchantFees.serviceName, serviceName),
        ),
      });
      return NextResponse.json({ success: true, data: fee || null });
    }

    // No serviceName filter — return all fee rows for this merchant
    const fees = await db.select().from(eftMerchantFees).where(eq(eftMerchantFees.merchantId, merchantId));

    if (fees.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }
    // Backward compat: single row returns as object, multiple as array
    return NextResponse.json({ success: true, data: fees.length === 1 ? fees[0] : fees });
  } catch (error: any) {
    console.error("Error fetching merchant fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT /api/admin/recon/merchant-fees/[merchantId] — upsert merchant fee config
// Optional body field: serviceName (defaults to "eft_direct")
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
    const serviceName = body.serviceName || "eft_direct";

    // Check if exists for this merchant + service
    const existing = await db.query.eftMerchantFees.findFirst({
      where: and(
        eq(eftMerchantFees.merchantId, merchantId),
        eq(eftMerchantFees.serviceName, serviceName),
      ),
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
        .where(and(
          eq(eftMerchantFees.merchantId, merchantId),
          eq(eftMerchantFees.serviceName, serviceName),
        ))
        .returning();
      writeAuditLog({ userId: auth.session.user.id, action: "update", resource: "merchant_fees", resourceId: merchantId, changes: { before: { serviceName: existing.serviceName, feeType: existing.feeType, fixedFeeValue: existing.fixedFeeValue, percentageFeeValue: existing.percentageFeeValue, volumeFeeValue: existing.volumeFeeValue, vatEnabled: existing.vatEnabled, vatRate: existing.vatRate }, after: { serviceName, feeType, fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } }, request });
      return NextResponse.json({ success: true, data: updated });
    }

    // Create new
    const [created] = await db.insert(eftMerchantFees).values({
      merchantId,
      serviceName,
      feeType: feeType || "fixed",
      fixedFeeValue: fixedFeeValue != null ? String(fixedFeeValue) : null,
      percentageFeeValue: percentageFeeValue != null ? String(percentageFeeValue) : null,
      volumeFeeValue: volumeFeeValue != null ? String(volumeFeeValue) : null,
      vatEnabled: vatEnabled ?? null,
      vatRate: vatRate != null ? String(vatRate) : null,
    }).returning();

    writeAuditLog({ userId: auth.session.user.id, action: "create", resource: "merchant_fees", resourceId: merchantId, changes: { after: { serviceName, feeType, fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } }, request });
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    console.error("Error updating merchant fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/recon/merchant-fees/[merchantId] — remove custom fee (revert to system default)
// Optional query param: ?serviceName=eft_direct  (if omitted, deletes ALL custom fees for this merchant)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { merchantId } = await params;
    const serviceName = request.nextUrl.searchParams.get("serviceName");

    if (serviceName) {
      // Delete only the specific service's fee row
      await db.delete(eftMerchantFees).where(
        and(
          eq(eftMerchantFees.merchantId, merchantId),
          eq(eftMerchantFees.serviceName, serviceName),
        )
      );
      writeAuditLog({ userId: auth.session.user.id, action: "delete", resource: "merchant_fees", resourceId: merchantId, changes: { before: { serviceName } }, request });
      return NextResponse.json({ success: true, message: `Custom fee for ${serviceName} removed, system defaults will apply` });
    }

    // No serviceName — delete all custom fees for this merchant
    await db.delete(eftMerchantFees).where(eq(eftMerchantFees.merchantId, merchantId));

    writeAuditLog({ userId: auth.session.user.id, action: "delete", resource: "merchant_fees", resourceId: merchantId, request });
    return NextResponse.json({ success: true, message: "Custom fee removed, system defaults will apply" });
  } catch (error: any) {
    console.error("Error deleting merchant fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
