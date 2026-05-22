import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftSystemFees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

// GET /api/admin/recon/fees — get system default fee settings
// Optional query param: ?serviceName=eft_direct  (if omitted, returns ALL service fee rows)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const serviceName = request.nextUrl.searchParams.get("serviceName");

    if (serviceName) {
      // Return a single row for the requested service
      const rows = await db.select().from(eftSystemFees).where(eq(eftSystemFees.serviceName, serviceName));
      const defaults = rows[0] || {
        fixedFeeValue: "5.00",
        percentageFeeValue: "2.50",
        volumeFeeValue: "2.00",
        vatEnabled: true,
        vatRate: "15.00",
        serviceName,
      };
      return NextResponse.json({ success: true, data: defaults });
    }

    // No serviceName filter — return all service fee rows
    const rows = await db.select().from(eftSystemFees);
    if (rows.length === 0) {
      // Return a sensible default so callers always get something
      const defaults = {
        fixedFeeValue: "5.00",
        percentageFeeValue: "2.50",
        volumeFeeValue: "2.00",
        vatEnabled: true,
        vatRate: "15.00",
        serviceName: "eft_direct",
      };
      return NextResponse.json({ success: true, data: defaults });
    }

    return NextResponse.json({ success: true, data: rows.length === 1 ? rows[0] : rows });
  } catch (error: any) {
    console.error("Error fetching system fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/recon/fees — update system default fee settings
// Optional body field: serviceName (defaults to "eft_direct")
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } = body;
    const serviceName = body.serviceName || "eft_direct";

    // Find existing row for this service
    const rows = await db.select().from(eftSystemFees).where(eq(eftSystemFees.serviceName, serviceName));

    if (rows.length === 0) {
      // Create initial row for this service
      const [created] = await db.insert(eftSystemFees).values({
        serviceName,
        fixedFeeValue: String(fixedFeeValue ?? "5.00"),
        percentageFeeValue: String(percentageFeeValue ?? "2.50"),
        volumeFeeValue: String(volumeFeeValue ?? "2.00"),
        vatEnabled: vatEnabled ?? true,
        vatRate: String(vatRate ?? "15.00"),
        updatedBy: auth.session.user.id,
      }).returning();
      writeAuditLog({ userId: auth.session.user.id, action: "create", resource: "system_fees", resourceId: created.id, changes: { after: { serviceName, fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } }, request });
      return NextResponse.json({ success: true, data: created });
    }

    // Update existing row
    const before = rows[0];
    const [updated] = await db.update(eftSystemFees)
      .set({
        ...(fixedFeeValue !== undefined && { fixedFeeValue: String(fixedFeeValue) }),
        ...(percentageFeeValue !== undefined && { percentageFeeValue: String(percentageFeeValue) }),
        ...(volumeFeeValue !== undefined && { volumeFeeValue: String(volumeFeeValue) }),
        ...(vatEnabled !== undefined && { vatEnabled }),
        ...(vatRate !== undefined && { vatRate: String(vatRate) }),
        updatedAt: new Date(),
        updatedBy: auth.session.user.id,
      })
      .where(eq(eftSystemFees.serviceName, serviceName))
      .returning();

    writeAuditLog({ userId: auth.session.user.id, action: "update", resource: "system_fees", resourceId: updated.id, changes: { before: { fixedFeeValue: before.fixedFeeValue, percentageFeeValue: before.percentageFeeValue, volumeFeeValue: before.volumeFeeValue, vatEnabled: before.vatEnabled, vatRate: before.vatRate }, after: { fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } }, request });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating system fees:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
